from __future__ import annotations

import json
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional

try:
    from ..core.models import Room, Booking, User, LocationWiseRoom, AdminContact
    from .base import RoomRepository, BookingRepository, UserRepository, AdminContactRepository
except ImportError:
    from core.models import Room, Booking, User, LocationWiseRoom, AdminContact  # type: ignore
    from db.base import RoomRepository, BookingRepository, UserRepository, AdminContactRepository  # type: ignore

_DDL = """
CREATE TABLE IF NOT EXISTS location_wise_rooms (
    room_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    building TEXT,
    floor INTEGER NOT NULL,
    room_type TEXT,
    cabin_type TEXT,
    capacity INTEGER NOT NULL DEFAULT 0,
    amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
    vc_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    power_points INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    department TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin','employee')),
    password_hash TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_contacts (
    admin_id TEXT PRIMARY KEY,
    location TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Site Admin',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_contacts_location ON admin_contacts(location);

CREATE TABLE IF NOT EXISTS bookings (
    booking_id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES location_wise_rooms(room_id),
    user_id TEXT NOT NULL REFERENCES users(user_id),
    title TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
    attendees JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    actual_check_in TEXT,
    actual_check_out TEXT
);

CREATE INDEX IF NOT EXISTS idx_bookings_room_time ON bookings(room_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
"""


def _connect(database_url: str):
    conn = psycopg2.connect(database_url, cursor_factory=RealDictCursor)
    return conn


def _ensure_schema(database_url: str) -> None:
    with _connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(_DDL)


def _ensure_json(value):
    if value is None:
        return []
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return []
    return value


def _row_to_room(row) -> LocationWiseRoom:
    return LocationWiseRoom(
        room_id=row["room_id"],
        name=row["name"],
        location=row["location"],
        floor=row["floor"],
        room_type=row["room_type"],
        cabin_type=row["cabin_type"],
        capacity=row["capacity"],
        amenities=_ensure_json(row["amenities"]),
        vc_enabled=bool(row["vc_enabled"]),
        power_points=row["power_points"],
        status=row["status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        building=row.get("building"),
    )


def _row_to_booking(row) -> Booking:
    return Booking(
        booking_id=row["booking_id"],
        room_id=row["room_id"],
        user_id=row["user_id"],
        title=row["title"],
        start_time=row["start_time"],
        end_time=row["end_time"],
        status=row["status"],
        attendees=_ensure_json(row["attendees"]),
        notes=row["notes"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        actual_check_in=row.get("actual_check_in"),
        actual_check_out=row.get("actual_check_out"),
    )


def _row_to_user(row) -> User:
    return User(
        user_id=row["user_id"],
        name=row["name"],
        email=row["email"],
        department=row["department"],
        role=row["role"],
        password_hash=row["password_hash"],
        created_at=row["created_at"],
    )


def _row_to_admin_contact(row) -> AdminContact:
    return AdminContact(
        admin_id=row["admin_id"],
        location=row["location"],
        name=row["name"],
        email=row["email"],
        phone=row["phone"],
        role=row["role"],
        active=bool(row["active"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class PostgresRoomRepo(RoomRepository):
    def __init__(self, database_url: str):
        self._database_url = database_url
        _ensure_schema(database_url)

    def get(self, room_id: str) -> Optional[LocationWiseRoom]:
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM location_wise_rooms WHERE room_id=%s", (room_id,))
                row = cur.fetchone()
        return _row_to_room(row) if row else None

    def list(self, capacity: int = None, amenities: list[str] = None, floor: int = None) -> list[LocationWiseRoom]:
        query = "SELECT * FROM location_wise_rooms WHERE 1=1"
        params: list = []
        if capacity is not None:
            query += " AND capacity >= %s";
            params.append(capacity)
        if floor is not None:
            query += " AND floor = %s";
            params.append(floor)
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                rows = cur.fetchall()
        rooms = [_row_to_room(r) for r in rows]
        if amenities:
            rooms = [r for r in rooms if all(a in r.amenities for a in amenities)]
        return rooms

    def create(self, room: LocationWiseRoom) -> LocationWiseRoom:
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO location_wise_rooms (
                        room_id, name, location, floor, capacity, amenities, status,
                        building, room_type, cabin_type, vc_enabled, power_points,
                        created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        room.room_id,
                        room.name,
                        room.location,
                        room.floor,
                        room.capacity,
                        json.dumps(room.amenities or []),
                        room.status,
                        room.building,
                        room.room_type,
                        room.cabin_type,
                        room.vc_enabled,
                        room.power_points,
                        room.created_at,
                        room.updated_at,
                    ),
                )
        return room

    def update(self, room: LocationWiseRoom) -> LocationWiseRoom:
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE location_wise_rooms SET
                        name=%s,
                        location=%s,
                        floor=%s,
                        capacity=%s,
                        amenities=%s,
                        status=%s,
                        building=%s,
                        room_type=%s,
                        cabin_type=%s,
                        vc_enabled=%s,
                        power_points=%s,
                        updated_at=%s
                    WHERE room_id=%s
                    """,
                    (
                        room.name,
                        room.location,
                        room.floor,
                        room.capacity,
                        json.dumps(room.amenities or []),
                        room.status,
                        room.building,
                        room.room_type,
                        room.cabin_type,
                        room.vc_enabled,
                        room.power_points,
                        room.updated_at,
                        room.room_id,
                    ),
                )
        return room

    def delete(self, room_id: str) -> None:
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute("UPDATE location_wise_rooms SET status='inactive' WHERE room_id=%s", (room_id,))


class PostgresBookingRepo(BookingRepository):
    def __init__(self, database_url: str):
        self._database_url = database_url
        _ensure_schema(database_url)

    def get(self, booking_id: str) -> Optional[Booking]:
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM bookings WHERE booking_id=%s", (booking_id,))
                row = cur.fetchone()
        return _row_to_booking(row) if row else None

    def list(self, user_id: str = None, room_id: str = None, date: str = None, status: str = None) -> list[Booking]:
        query = "SELECT * FROM bookings WHERE 1=1"
        params: list = []
        if user_id is not None:
            query += " AND user_id=%s"; params.append(user_id)
        if room_id is not None:
            query += " AND room_id=%s"; params.append(room_id)
        if date is not None:
            query += " AND start_time LIKE %s"; params.append(f"{date}%")
        if status is not None:
            query += " AND status=%s"; params.append(status)
        query += " ORDER BY start_time DESC"
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                rows = cur.fetchall()
        return [_row_to_booking(r) for r in rows]

    def create(self, booking: Booking) -> Booking:
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO bookings (booking_id, room_id, user_id, title, start_time, end_time, status, attendees, notes, created_at, updated_at, actual_check_in, actual_check_out) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                    (
                        booking.booking_id,
                        booking.room_id,
                        booking.user_id,
                        booking.title,
                        booking.start_time,
                        booking.end_time,
                        booking.status,
                        json.dumps(booking.attendees or []),
                        booking.notes,
                        booking.created_at,
                        booking.updated_at,
                        booking.actual_check_in,
                        booking.actual_check_out,
                    ),
                )
        return booking

    def update(self, booking: Booking) -> Booking:
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE bookings SET room_id=%s, user_id=%s, title=%s, start_time=%s, end_time=%s, status=%s, attendees=%s, notes=%s, updated_at=%s, actual_check_in=%s, actual_check_out=%s WHERE booking_id=%s",
                    (
                        booking.room_id,
                        booking.user_id,
                        booking.title,
                        booking.start_time,
                        booking.end_time,
                        booking.status,
                        json.dumps(booking.attendees or []),
                        booking.notes,
                        booking.updated_at,
                        booking.actual_check_in,
                        booking.actual_check_out,
                        booking.booking_id,
                    ),
                )
        return booking

    def cancel(self, booking_id: str) -> Booking:
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute("UPDATE bookings SET status='cancelled' WHERE booking_id=%s", (booking_id,))
                cur.execute("SELECT * FROM bookings WHERE booking_id=%s", (booking_id,))
                row = cur.fetchone()
        return _row_to_booking(row)

    def get_overlapping(self, room_id: str, start_time: str, end_time: str, exclude_booking_id: str = None) -> list[Booking]:
        query = "SELECT * FROM bookings WHERE room_id=%s AND start_time<%s AND end_time>%s AND status='confirmed'"
        params: list = [room_id, end_time, start_time]
        if exclude_booking_id is not None:
            query += " AND booking_id<>%s"; params.append(exclude_booking_id)
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                rows = cur.fetchall()
        return [_row_to_booking(r) for r in rows]


class PostgresUserRepo(UserRepository):
    def __init__(self, database_url: str):
        self._database_url = database_url
        _ensure_schema(database_url)

    def get(self, user_id: str) -> Optional[User]:
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM users WHERE user_id=%s", (user_id,))
                row = cur.fetchone()
        return _row_to_user(row) if row else None

    def get_by_email(self, email: str) -> Optional[User]:
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM users WHERE email=%s", (email,))
                row = cur.fetchone()
        return _row_to_user(row) if row else None

    def list(self) -> list[User]:
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM users ORDER BY name")
                rows = cur.fetchall()
        return [_row_to_user(r) for r in rows]

    def create(self, user: User) -> User:
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO users (user_id, name, email, department, role, password_hash, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                    (
                        user.user_id,
                        user.name,
                        user.email,
                        user.department,
                        user.role,
                        user.password_hash,
                        user.created_at,
                    ),
                )
        return user

    def update(self, user: User) -> User:
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE users SET name=%s, email=%s, department=%s, role=%s, password_hash=%s WHERE user_id=%s",
                    (
                        user.name,
                        user.email,
                        user.department,
                        user.role,
                        user.password_hash,
                        user.user_id,
                    ),
                )
        return user


class PostgresAdminContactRepo(AdminContactRepository):
    def __init__(self, database_url: str):
        self._database_url = database_url
        _ensure_schema(database_url)

    def get(self, admin_id: str) -> Optional[AdminContact]:
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM admin_contacts WHERE admin_id=%s", (admin_id,))
                row = cur.fetchone()
        return _row_to_admin_contact(row) if row else None

    def list(self, location: str = None) -> list[AdminContact]:
        query = "SELECT * FROM admin_contacts WHERE active=TRUE"
        params: list = []
        if location is not None:
            query += " AND location = %s"
            params.append(location)
        query += " ORDER BY name"
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                rows = cur.fetchall()
        return [_row_to_admin_contact(r) for r in rows]

    def create(self, admin_contact: AdminContact) -> AdminContact:
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO admin_contacts (admin_id, location, name, email, phone, role, active, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                    (
                        admin_contact.admin_id,
                        admin_contact.location,
                        admin_contact.name,
                        admin_contact.email,
                        admin_contact.phone,
                        admin_contact.role,
                        admin_contact.active,
                        admin_contact.created_at,
                        admin_contact.updated_at,
                    ),
                )
        return admin_contact

    def update(self, admin_contact: AdminContact) -> AdminContact:
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE admin_contacts SET location=%s, name=%s, email=%s, phone=%s, role=%s, active=%s, updated_at=%s WHERE admin_id=%s",
                    (
                        admin_contact.location,
                        admin_contact.name,
                        admin_contact.email,
                        admin_contact.phone,
                        admin_contact.role,
                        admin_contact.active,
                        admin_contact.updated_at,
                        admin_contact.admin_id,
                    ),
                )
        return admin_contact

    def delete(self, admin_id: str) -> None:
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute("UPDATE admin_contacts SET active=FALSE WHERE admin_id=%s", (admin_id,))
