from __future__ import annotations

import json
import sqlite3
from typing import Optional

try:
    from ..core.models import Room, Booking, User, LocationWiseRoom, AdminContact
    from .base import RoomRepository, BookingRepository, UserRepository, AdminContactRepository
except ImportError:
    from core.models import Room, Booking, User, LocationWiseRoom, AdminContact  # type: ignore
    from db.base import RoomRepository, BookingRepository, UserRepository, AdminContactRepository  # type: ignore

_DDL = """
CREATE TABLE IF NOT EXISTS rooms (
    room_id    TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    floor      INTEGER NOT NULL,
    capacity   INTEGER NOT NULL CHECK (capacity >= 1),
    amenities  TEXT NOT NULL DEFAULT '[]',
    status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS location_wise_rooms (
    room_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    building TEXT,
    floor  TEXT,
    room_type TEXT,
    cabin_type TEXT,
    capacity   INTEGER NOT NULL DEFAULT 0,
    amenities  TEXT NOT NULL DEFAULT '[]',
    allowed_users TEXT NOT NULL DEFAULT '[]',
    vc_enabled INTEGER DEFAULT 0 CHECK (vc_enabled IN (0,1)),
    power_points INTEGER DEFAULT 0,
   status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    user_id       TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    department    TEXT NOT NULL DEFAULT '',
    role          TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin','employee')),
    password_hash TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_contacts (
    admin_id    TEXT PRIMARY KEY,
    location    TEXT NOT NULL,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    phone       TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'Site Admin',
    active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_contacts_location ON admin_contacts(location);

CREATE TABLE if not exists bookings (
    booking_id TEXT PRIMARY KEY,
    room_id    TEXT NOT NULL REFERENCES location_wise_rooms(room_id),
    user_id    TEXT NOT NULL REFERENCES users(user_id),
    title      TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time   TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
    attendees  TEXT NOT NULL DEFAULT '[]',
    notes      TEXT NOT NULL DEFAULT '',
    cost_centre TEXT NOT NULL DEFAULT '',
    meeting_type TEXT NOT NULL DEFAULT 'Internal Meeting',
    meeting_description TEXT NOT NULL DEFAULT '',
    send_qr INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    actual_check_in TEXT,
    actual_check_out TEXT
);



CREATE INDEX IF NOT EXISTS idx_bookings_room_time ON bookings(room_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
"""

# Schema migration: add columns if upgrading from old schema
_MIGRATIONS = [
    "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'employee'",
    "ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE bookings ADD COLUMN cost_centre TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE bookings ADD COLUMN meeting_type TEXT NOT NULL DEFAULT 'Internal Meeting'",
    "ALTER TABLE bookings ADD COLUMN meeting_description TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE bookings ADD COLUMN send_qr INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE location_wise_rooms ADD COLUMN allowed_users TEXT NOT NULL DEFAULT '[]'",
]


def _connect(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _run_migrations(db_path: str) -> None:
    with _connect(db_path) as conn:
        for sql in _MIGRATIONS:
            try:
                conn.execute(sql)
            except sqlite3.OperationalError:
                pass  # column already exists


def _normalize_existing_locations(db_path: str) -> None:
    with _connect(db_path) as conn:
        conn.execute("UPDATE location_wise_rooms SET location=trim(location) WHERE location != trim(location)")
        conn.execute(
            "UPDATE location_wise_rooms SET location='Bangalore(Domlur)' WHERE lower(trim(location)) LIKE 'bangalore%domlur%'"
        )
        conn.execute(
            "UPDATE location_wise_rooms SET location='Bangalore(Signet)' WHERE lower(trim(location)) LIKE 'bangalore%signet%'"
        )
        conn.commit()


def _row_to_room(row: sqlite3.Row) -> LocationWiseRoom:
    return LocationWiseRoom(
        room_id=row["room_id"],
        name=row["name"],
        location=row["location"],
        floor=row["floor"],
        room_type=row["room_type"],
        cabin_type=row["cabin_type"],
        capacity=row["capacity"],
        amenities=json.loads(row["amenities"]),
        allowed_users=json.loads(row["allowed_users"]) if "allowed_users" in row.keys() else [],
        vc_enabled=bool(row["vc_enabled"]),
        power_points=row["power_points"],
        status=row["status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _row_to_booking(row: sqlite3.Row) -> Booking:
    return Booking(
        booking_id=row["booking_id"], room_id=row["room_id"], user_id=row["user_id"],
        title=row["title"], start_time=row["start_time"], end_time=row["end_time"],
        status=row["status"], attendees=json.loads(row["attendees"]),
        notes=row["notes"], cost_centre=row["cost_centre"] if "cost_centre" in row.keys() else "",
        meeting_type=row["meeting_type"] if "meeting_type" in row.keys() else "Internal Meeting",
        meeting_description=row["meeting_description"] if "meeting_description" in row.keys() else "",
        send_qr=bool(row["send_qr"]) if "send_qr" in row.keys() else False,
        created_at=row["created_at"], updated_at=row["updated_at"],
        actual_check_in=row["actual_check_in"] if "actual_check_in" in row.keys() else None,
        actual_check_out=row["actual_check_out"] if "actual_check_out" in row.keys() else None,
    )


def _row_to_user(row: sqlite3.Row) -> User:
    return User(
        user_id=row["user_id"], name=row["name"], email=row["email"],
        department=row["department"],
        role=row["role"] if "role" in row.keys() else "employee",
        password_hash=row["password_hash"] if "password_hash" in row.keys() else "",
        created_at=row["created_at"],
    )


def _row_to_admin_contact(row: sqlite3.Row) -> AdminContact:
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


class SQLiteRoomRepo(RoomRepository):
    def __init__(self, db_path: str):
        self._db_path = db_path
        self._init_schema()

    def _init_schema(self) -> None:
        with _connect(self._db_path) as conn:
            conn.executescript(_DDL)
        _normalize_existing_locations(self._db_path)

    def get(self, room_id: str) -> Optional[LocationWiseRoom]:
        with _connect(self._db_path) as conn:
            row = conn.execute("SELECT * FROM location_wise_rooms WHERE room_id = ?", (room_id,)).fetchone()
        return _row_to_room(row) if row else None

    def list(self, capacity: int = None, amenities: list[str] = None, floor: int = None) -> list[LocationWiseRoom]:
        query = "SELECT * FROM location_wise_rooms WHERE 1=1"
        params: list = []
        if capacity is not None:
            query += " AND capacity >= ?"; params.append(capacity)
        if floor is not None:
            query += " AND floor = ?"; params.append(floor)
        with _connect(self._db_path) as conn:
            rows = conn.execute(query, params).fetchall()
        rooms = [_row_to_room(r) for r in rows]
        if amenities:
            rooms = [r for r in rooms if all(a in r.amenities for a in amenities)]
        return rooms

    def create(self, room: LocationWiseRoom) -> LocationWiseRoom:
        with _connect(self._db_path) as conn:
            conn.execute("""
                INSERT INTO location_wise_rooms (
                    room_id,
                    name,
                    location,
                    floor,
                    capacity,
                    amenities,
                    status,
                    building,
                    room_type,
                    cabin_type,
                    allowed_users,
                    vc_enabled,
                    power_points,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                room.room_id,
                room.name,
                room.location,          # ✅ REQUIRED FIX
                room.floor,
                room.capacity,
                json.dumps(room.amenities),
                room.status,
                room.building,
                room.room_type,
                room.cabin_type,
                json.dumps(room.allowed_users),
                int(room.vc_enabled),  # ✅ bool → SQLite int
                int(room.power_points),
                room.created_at,
                room.updated_at
            ))
        return room


    def update(self, room: LocationWiseRoom) -> LocationWiseRoom:
        with _connect(self._db_path) as conn:
            conn.execute("""
                UPDATE location_wise_rooms SET
                    name=?,
                    location=?,
                    floor=?,
                    capacity=?,
                    amenities=?,
                    status=?,
                    building=?,
                    room_type=?,
                    cabin_type=?,
                    allowed_users=?,
                    vc_enabled=?,
                    power_points=?,
                    updated_at=?
                WHERE room_id=?
            """, (
                room.name,
                room.location,
                room.floor,
                room.capacity,
                json.dumps(room.amenities),
                room.status,
                room.building,
                room.room_type,
                room.cabin_type,
                json.dumps(room.allowed_users),
                int(room.vc_enabled),
                int(room.power_points),
                room.updated_at,
                room.room_id
            ))
        return room

    def delete(self, room_id: str) -> None:
        with _connect(self._db_path) as conn:
            conn.execute("UPDATE location_wise_rooms SET status='inactive' WHERE room_id=?", (room_id,))


class SQLiteBookingRepo(BookingRepository):
    def __init__(self, db_path: str):
        self._db_path = db_path
        self._init_schema()

    def _init_schema(self) -> None:
        with _connect(self._db_path) as conn:
            conn.executescript(_DDL)

    def get(self, booking_id: str) -> Optional[Booking]:
        with _connect(self._db_path) as conn:
            row = conn.execute("SELECT * FROM bookings WHERE booking_id=?", (booking_id,)).fetchone()
        return _row_to_booking(row) if row else None

    def list(self, user_id: str = None, room_id: str = None, date: str = None, status: str = None) -> list[Booking]:
        query = "SELECT * FROM bookings WHERE 1=1"
        params: list = []
        if user_id is not None:
            query += " AND user_id=?"; params.append(user_id)
        if room_id is not None:
            query += " AND room_id=?"; params.append(room_id)
        if date is not None:
            query += " AND start_time LIKE ?"; params.append(f"{date}%")
        if status is not None:
            query += " AND status=?"; params.append(status)
        query += " ORDER BY start_time DESC"
        with _connect(self._db_path) as conn:
            rows = conn.execute(query, params).fetchall()
        return [_row_to_booking(r) for r in rows]

    def create(self, booking: Booking) -> Booking:
        with _connect(self._db_path) as conn:
            conn.execute(
                "INSERT INTO bookings (booking_id,room_id,user_id,title,start_time,end_time,status,attendees,notes,cost_centre,meeting_type,meeting_description,send_qr,created_at,updated_at,actual_check_in,actual_check_out) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    booking.booking_id,
                    booking.room_id,
                    booking.user_id,
                    booking.title,
                    booking.start_time,
                    booking.end_time,
                    booking.status,
                    json.dumps(booking.attendees),
                    booking.notes,
                    booking.cost_centre,
                    booking.meeting_type,
                    booking.meeting_description,
                    int(booking.send_qr),
                    booking.created_at,
                    booking.updated_at,
                    booking.actual_check_in,
                    booking.actual_check_out,
                ),
            )
        return booking

    def update(self, booking: Booking) -> Booking:
        with _connect(self._db_path) as conn:
            conn.execute(
                "UPDATE bookings SET room_id=?,user_id=?,title=?,start_time=?,end_time=?,status=?,attendees=?,notes=?,cost_centre=?,meeting_type=?,meeting_description=?,send_qr=?,updated_at=? , actual_check_in=?,actual_check_out=? WHERE booking_id=?",
                (booking.room_id, booking.user_id, booking.title, booking.start_time, booking.end_time, booking.status, json.dumps(booking.attendees), booking.notes, booking.cost_centre, booking.meeting_type, booking.meeting_description, int(booking.send_qr), booking.updated_at,booking.actual_check_in, booking.actual_check_out, booking.booking_id),
            )
        return booking

    def cancel(self, booking_id: str) -> Booking:
        with _connect(self._db_path) as conn:
            conn.execute("UPDATE bookings SET status='cancelled' WHERE booking_id=?", (booking_id,))
            row = conn.execute("SELECT * FROM bookings WHERE booking_id=?", (booking_id,)).fetchone()
        return _row_to_booking(row)

    def get_overlapping(self, room_id: str, start_time: str, end_time: str, exclude_booking_id: str = None) -> list[Booking]:
        query = "SELECT * FROM bookings WHERE room_id=? AND start_time<? AND end_time>? AND status='confirmed'"
        params: list = [room_id, end_time, start_time]
        if exclude_booking_id is not None:
            query += " AND booking_id!=?"; params.append(exclude_booking_id)
        with _connect(self._db_path) as conn:
            rows = conn.execute(query, params).fetchall()
        return [_row_to_booking(r) for r in rows]


class SQLiteUserRepo(UserRepository):
    def __init__(self, db_path: str):
        self._db_path = db_path
        self._init_schema()
        _run_migrations(db_path)

    def _init_schema(self) -> None:
        with _connect(self._db_path) as conn:
            conn.executescript(_DDL)
        _normalize_existing_locations(self._db_path)

    def get(self, user_id: str) -> Optional[User]:
        with _connect(self._db_path) as conn:
            row = conn.execute("SELECT * FROM users WHERE user_id=?", (user_id,)).fetchone()
        return _row_to_user(row) if row else None

    def get_by_email(self, email: str) -> Optional[User]:
        with _connect(self._db_path) as conn:
            row = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        return _row_to_user(row) if row else None

    def list(self) -> list[User]:
        with _connect(self._db_path) as conn:
            rows = conn.execute("SELECT * FROM users ORDER BY name").fetchall()
        return [_row_to_user(r) for r in rows]

    def create(self, user: User) -> User:
        with _connect(self._db_path) as conn:
            conn.execute(
                "INSERT INTO users (user_id,name,email,department,role,password_hash,created_at) VALUES (?,?,?,?,?,?,?)",
                (user.user_id, user.name, user.email, user.department, user.role, user.password_hash, user.created_at),
            )
        return user

    def update(self, user: User) -> User:
        with _connect(self._db_path) as conn:
            conn.execute(
                "UPDATE users SET name=?,email=?,department=?,role=?,password_hash=? WHERE user_id=?",
                (user.name, user.email, user.department, user.role, user.password_hash, user.user_id),
            )
        return user


class SQLiteAdminContactRepo(AdminContactRepository):
    def __init__(self, db_path: str):
        self._db_path = db_path
        self._init_schema()

    def _init_schema(self) -> None:
        with _connect(self._db_path) as conn:
            conn.executescript(_DDL)

    def get(self, admin_id: str) -> Optional[AdminContact]:
        with _connect(self._db_path) as conn:
            row = conn.execute("SELECT * FROM admin_contacts WHERE admin_id=?", (admin_id,)).fetchone()
        return _row_to_admin_contact(row) if row else None

    def list(self, location: str = None) -> list[AdminContact]:
        query = "SELECT * FROM admin_contacts WHERE active=1"
        params: list = []
        if location is not None:
            query += " AND location = ?"
            params.append(location)
        query += " ORDER BY name"
        with _connect(self._db_path) as conn:
            rows = conn.execute(query, params).fetchall()
        return [_row_to_admin_contact(r) for r in rows]

    def create(self, admin_contact: AdminContact) -> AdminContact:
        with _connect(self._db_path) as conn:
            conn.execute(
                "INSERT INTO admin_contacts (admin_id,location,name,email,phone,role,active,created_at,updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (admin_contact.admin_id, admin_contact.location, admin_contact.name, admin_contact.email, admin_contact.phone, admin_contact.role, int(admin_contact.active), admin_contact.created_at, admin_contact.updated_at),
            )
        return admin_contact

    def update(self, admin_contact: AdminContact) -> AdminContact:
        with _connect(self._db_path) as conn:
            conn.execute(
                "UPDATE admin_contacts SET location=?,name=?,email=?,phone=?,role=?,active=?,updated_at=? WHERE admin_id=?",
                (admin_contact.location, admin_contact.name, admin_contact.email, admin_contact.phone, admin_contact.role, int(admin_contact.active), admin_contact.updated_at, admin_contact.admin_id),
            )
        return admin_contact

    def delete(self, admin_id: str) -> None:
        with _connect(self._db_path) as conn:
            conn.execute("UPDATE admin_contacts SET active=0 WHERE admin_id=?", (admin_id,))
