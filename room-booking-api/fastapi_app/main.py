from __future__ import annotations

import dataclasses
import logging
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, Request, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

try:
    from ..core.models import BookingError
    from ..core import rooms as rooms_core
    from ..core import bookings as bookings_core
    from ..core import users as users_core
    from ..core import admin_contacts as admin_contacts_core
    from ..core import notifications as notifications_core
    from ..db.sqlite_adapter import SQLiteRoomRepo, SQLiteBookingRepo, SQLiteUserRepo, SQLiteAdminContactRepo
    from ..db.notifications_sqlite_adapter import SQLiteNotificationRepo
    from ..db.postgres_adapter import PostgresRoomRepo, PostgresBookingRepo, PostgresUserRepo, PostgresAdminContactRepo
    from ..db.notifications_postgres_adapter import PostgresNotificationRepo
    from ..db.base import RoomRepository, BookingRepository, UserRepository, AdminContactRepository, NotificationRepository
    from ..shared.config import get_database_url, get_db_path, get_notifications_database_url, get_notifications_db_path
except ImportError:
    from core.models import BookingError  # type: ignore
    from core import rooms as rooms_core  # type: ignore
    from core import bookings as bookings_core  # type: ignore
    from core import users as users_core  # type: ignore
    from core import admin_contacts as admin_contacts_core  # type: ignore
    from core import notifications as notifications_core  # type: ignore
    from db.sqlite_adapter import SQLiteRoomRepo, SQLiteBookingRepo, SQLiteUserRepo, SQLiteAdminContactRepo  # type: ignore
    from db.notifications_sqlite_adapter import SQLiteNotificationRepo  # type: ignore
    from db.postgres_adapter import PostgresRoomRepo, PostgresBookingRepo, PostgresUserRepo, PostgresAdminContactRepo  # type: ignore
    from db.notifications_postgres_adapter import PostgresNotificationRepo  # type: ignore
    from db.base import RoomRepository, BookingRepository, UserRepository, AdminContactRepository, NotificationRepository  # type: ignore
    from shared.config import get_database_url, get_db_path, get_notifications_database_url, get_notifications_db_path  # type: ignore

logger = logging.getLogger("room_booking")


def _to_dict(obj) -> dict:
    return dataclasses.asdict(obj)


def _user_safe(user) -> dict:
    """Return user dict without password_hash."""
    d = _to_dict(user)
    d.pop("password_hash", None)
    return d


def create_app(
    room_repo: RoomRepository,
    booking_repo: BookingRepository,
    user_repo: UserRepository,
    admin_repo: AdminContactRepository,
    notification_repo: NotificationRepository,
) -> FastAPI:
    app = FastAPI(title="Apexon Room Booking API", version="3.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"], allow_credentials=True,
        allow_methods=["*"], allow_headers=["*"],
    )

    @app.exception_handler(BookingError)
    async def booking_error_handler(request: Request, exc: BookingError):
        return JSONResponse(status_code=exc.http_status, content={"error": exc.message, "detail": exc.detail})

    # ── Health & Stats ────────────────────────────────────────────────────
    @app.get("/health")
    async def health():
        return {"status": "ok"}

    @app.get("/stats")
    async def stats():
        rooms = rooms_core.list_rooms(room_repo)
        bookings = bookings_core.list_bookings(booking_repo)
        users = users_core.list_users(user_repo)
        from datetime import date as _date
        today = _date.today().isoformat()
        active_rooms = sum(1 for r in rooms if r.status == "active")
        confirmed = [b for b in bookings if b.status == "confirmed"]
        cancelled = [b for b in bookings if b.status == "cancelled"]
        today_bookings = [b for b in confirmed if b.start_time[:10] == today]
        total = len(bookings)
        return {
            "total_rooms": len(rooms), "active_rooms": active_rooms,
            "total_bookings": total, "confirmed_bookings": len(confirmed),
            "cancelled_bookings": len(cancelled), "today_bookings": len(today_bookings),
            "total_users": len(users),
            "cancel_rate": round(len(cancelled) / total * 100, 1) if total else 0,
        }

    # ── Auth ──────────────────────────────────────────────────────────────
    @app.post("/auth/register", status_code=201)
    async def register(request: Request):
        data = await request.json()
        user = users_core.register_user(user_repo, data)
        return _user_safe(user)

    @app.post("/auth/login")
    async def login(request: Request):
        data = await request.json()
        email = data.get("email", "")
        password = data.get("password", "")
        user = users_core.login_user(user_repo, email, password)
        return _user_safe(user)

    @app.post("/auth/reset")
    async def reset_password(request: Request):
        data = await request.json()
        user = users_core.reset_password(user_repo, data)
        return _user_safe(user)


    # ── Rooms ─────────────────────────────────────────────────────────────
    @app.get("/rooms")
    async def list_rooms_route(capacity: Optional[int] = Query(None), floor: Optional[int] = Query(None), amenities: Optional[str] = Query(None)):
        amenities_list = [a.strip() for a in amenities.split(",")] if amenities else None
        return [_to_dict(r) for r in rooms_core.list_rooms(room_repo, capacity=capacity, amenities=amenities_list, floor=floor)]

    @app.post("/rooms", status_code=201)
    async def create_room_route(request: Request):
        return _to_dict(rooms_core.create_room(room_repo, await request.json()))

    @app.post("/rooms/import", status_code=200)
    async def import_rooms_route(file: UploadFile = File(...)):
        """Import multiple rooms from a CSV file."""
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="File must be a CSV file")
        
        try:
            contents = await file.read()
            csv_content = contents.decode('utf-8', errors='ignore')
            results = rooms_core.import_rooms_from_csv(room_repo, csv_content)
            return results
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to process CSV: {str(e)}")

    @app.get("/rooms/{room_id}")
    async def get_room_route(room_id: str):
        return _to_dict(rooms_core.get_room(room_repo, room_id))

    @app.put("/rooms/{room_id}")
    async def update_room_route(room_id: str, request: Request):
        return _to_dict(rooms_core.update_room(room_repo, room_id, await request.json()))

    @app.delete("/rooms/{room_id}", status_code=204)
    async def deactivate_room_route(room_id: str):
        rooms_core.deactivate_room(room_repo, room_id)

    @app.get("/rooms/{room_id}/availability")
    async def room_availability_route(room_id: str, date: str = Query(...)):
        result = bookings_core.get_room_availability(booking_repo, room_repo, room_id, date)
        data = _to_dict(result)
        from shared.config import get_business_hours_start, get_business_hours_end
        from datetime import datetime as _dt, timedelta as _td
        sh, sm = map(int, get_business_hours_start().split(":"))
        eh, em = map(int, get_business_hours_end().split(":"))
        d = _dt.strptime(date, "%Y-%m-%d").date() if "T" not in date else _dt.fromisoformat(date).date()
        cursor = _dt(d.year, d.month, d.day, sh, sm)
        end = _dt(d.year, d.month, d.day, eh, em)
        booked = sorted(data.get("booked_slots", []), key=lambda x: x["start_time"])
        ranges = [(_dt.fromisoformat(b["start_time"]), _dt.fromisoformat(b["end_time"]), b) for b in booked]
        slots = []
        while cursor < end:
            slot_end = cursor + _td(minutes=30)
            if slot_end > end:
                break
            is_booked = any(cursor < be and slot_end > bs for bs, be, _ in ranges)
            title = next((bi.get("title", "Booked") for bs, be, bi in ranges if cursor < be and slot_end > bs), "")
            slots.append({"start_time": cursor.isoformat(), "end_time": slot_end.isoformat(), "is_available": not is_booked, "booking_title": title})
            cursor = slot_end
        data["slots"] = slots
        return data


    # ── Bookings ──────────────────────────────────────────────────────────
    @app.get("/bookings")
    async def list_bookings_route(user_id: Optional[str] = Query(None), room_id: Optional[str] = Query(None), date: Optional[str] = Query(None), status: Optional[str] = Query(None)):
        return [_to_dict(b) for b in bookings_core.list_bookings(booking_repo, user_id=user_id, room_id=room_id, date=date, status=status)]

    @app.post("/bookings", status_code=201)
    async def create_booking_route(request: Request):
        booking = bookings_core.create_booking(booking_repo, room_repo, user_repo, await request.json())
        notifications_core.notify_booking_event(notification_repo, user_repo, booking, "created")
        return _to_dict(booking)

    @app.get("/bookings/{booking_id}")
    async def get_booking_route(booking_id: str):
        return _to_dict(bookings_core.get_booking(booking_repo, booking_id))

    @app.put("/bookings/{booking_id}")
    async def update_booking_route(booking_id: str, request: Request):
        booking = bookings_core.update_booking(booking_repo, room_repo, user_repo, booking_id, await request.json())
        notifications_core.notify_booking_event(notification_repo, user_repo, booking, "updated")
        return _to_dict(booking)

    @app.delete("/bookings/{booking_id}")
    async def cancel_booking_route(booking_id: str):
        booking = bookings_core.cancel_booking(booking_repo, booking_id)
        notifications_core.notify_booking_event(notification_repo, user_repo, booking, "cancelled")
        return _to_dict(booking)

    # ── Users ─────────────────────────────────────────────────────────────
    @app.get("/users")
    async def list_users_route():
        return [_user_safe(u) for u in users_core.list_users(user_repo)]

    @app.get("/admin-contacts")
    async def list_admin_contacts_route(location: Optional[str] = Query(None)):
        return [_to_dict(a) for a in admin_contacts_core.list_admin_contacts(admin_repo, location)]

    @app.post("/admin-contacts", status_code=201)
    async def create_admin_contact_route(request: Request):
        return _to_dict(admin_contacts_core.create_admin_contact(admin_repo, await request.json()))

    @app.put("/admin-contacts/{admin_id}")
    async def update_admin_contact_route(admin_id: str, request: Request):
        return _to_dict(admin_contacts_core.update_admin_contact(admin_repo, admin_id, await request.json()))

    @app.delete("/admin-contacts/{admin_id}", status_code=204)
    async def delete_admin_contact_route(admin_id: str):
        admin_contacts_core.delete_admin_contact(admin_repo, admin_id)

    @app.post("/users", status_code=201)
    async def create_user_route(request: Request):
        return _user_safe(users_core.create_user(user_repo, await request.json()))

    @app.get("/users/{user_id}")
    async def get_user_route(user_id: str):
        return _user_safe(users_core.get_user(user_repo, user_id))

    @app.get("/users/{user_id}/bookings")
    async def get_user_bookings_route(user_id: str):
        return [_to_dict(b) for b in users_core.get_user_bookings(booking_repo, user_id)]

    @app.post("/bookings/{booking_id}/checkin")
    async def checkin_booking_route(booking_id: str):
        # Set actual_check_in to now if not already set
        import datetime
        booking = bookings_core.get_booking(booking_repo, booking_id)
        if booking.actual_check_in:
            return JSONResponse(status_code=409, content={"error": "Already checked in"})
        booking.actual_check_in = datetime.datetime.utcnow().isoformat()
        bookings_core.save_booking(booking_repo, booking)
        notifications_core.notify_booking_event(notification_repo, user_repo, booking, "checked-in")
        return _to_dict(booking)

    @app.post("/bookings/{booking_id}/checkout")
    async def checkout_booking_route(booking_id: str):
        # Set actual_check_out to now if not already set
        import datetime
        booking = bookings_core.get_booking(booking_repo, booking_id)
        if booking.actual_check_out:
            return JSONResponse(status_code=409, content={"error": "Already checked out"})
        booking.actual_check_out = datetime.datetime.utcnow().isoformat()
        # If checking out early, update end_time for availability
        if booking.actual_check_out < booking.end_time:
            booking.end_time = booking.actual_check_out
        bookings_core.save_booking(booking_repo, booking)
        notifications_core.notify_booking_event(notification_repo, user_repo, booking, "checked-out")
        return _to_dict(booking)

    # ── Notifications ─────────────────────────────────────────────────────
    @app.get("/notifications")
    async def list_notifications_route(user_id: Optional[str] = Query(None), read: Optional[bool] = Query(None)):
        return [_to_dict(n) for n in notifications_core.list_notifications(notification_repo, user_id=user_id, read=read)]

    @app.put("/notifications/{notification_id}/read")
    async def mark_notification_read_route(notification_id: str):
        return _to_dict(notifications_core.mark_notification_read(notification_repo, notification_id))

    @app.put("/notifications/{notification_id}/unread")
    async def mark_notification_unread_route(notification_id: str):
        return _to_dict(notifications_core.mark_notification_unread(notification_repo, notification_id))

    @app.put("/notifications/read-all")
    async def mark_all_notifications_read_route(user_id: str = Query(...)):
        count = notifications_core.mark_all_notifications_read(notification_repo, user_id)
        return {"updated": count}

    @app.put("/notifications/unread-all")
    async def mark_all_notifications_unread_route(user_id: str = Query(...)):
        count = notifications_core.mark_all_notifications_unread(notification_repo, user_id)
        return {"updated": count}

    return app


def _make_default_app() -> FastAPI:
    db_url = get_database_url()
    notifications_db_url = get_notifications_database_url() or db_url

    if db_url:
        return create_app(
            room_repo=PostgresRoomRepo(db_url),
            booking_repo=PostgresBookingRepo(db_url),
            user_repo=PostgresUserRepo(db_url),
            admin_repo=PostgresAdminContactRepo(db_url),
            notification_repo=PostgresNotificationRepo(notifications_db_url or db_url),
        )

    db_path = get_db_path()
    notifications_db_path = get_notifications_db_path()
    return create_app(
        room_repo=SQLiteRoomRepo(db_path),
        booking_repo=SQLiteBookingRepo(db_path),
        user_repo=SQLiteUserRepo(db_path),
        admin_repo=SQLiteAdminContactRepo(db_path),
        notification_repo=SQLiteNotificationRepo(notifications_db_path),
    )


app = _make_default_app()
