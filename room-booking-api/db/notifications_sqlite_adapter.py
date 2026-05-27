from __future__ import annotations

import json
import sqlite3
from typing import Optional

try:
    from ..core.models import Notification
    from ..db.base import NotificationRepository
except ImportError:
    from core.models import Notification  # type: ignore
    from db.base import NotificationRepository  # type: ignore

_DDL = """
CREATE TABLE IF NOT EXISTS notifications (
    notification_id TEXT PRIMARY KEY,
    recipient_id TEXT NOT NULL,
    sender_id TEXT,
    type TEXT NOT NULL DEFAULT 'booking' CHECK(type IN ('booking','system','admin','info','warning')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata TEXT NOT NULL DEFAULT '{}',
    related_booking_id TEXT,
    created_at TEXT NOT NULL,
    read_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read_at);
"""


def _connect(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _row_to_notification(row: sqlite3.Row) -> Notification:
    return Notification(
        notification_id=row["notification_id"],
        recipient_id=row["recipient_id"],
        sender_id=row["sender_id"],
        type=row["type"],
        title=row["title"],
        message=row["message"],
        metadata=json.loads(row["metadata"] or "{}"),
        related_booking_id=row["related_booking_id"],
        created_at=row["created_at"],
        read_at=row["read_at"],
    )


class SQLiteNotificationRepo(NotificationRepository):
    def __init__(self, db_path: str):
        self._db_path = db_path
        self._init_schema()

    def _init_schema(self) -> None:
        with _connect(self._db_path) as conn:
            conn.executescript(_DDL)

    def get(self, notification_id: str) -> Optional[Notification]:
        with _connect(self._db_path) as conn:
            row = conn.execute("SELECT * FROM notifications WHERE notification_id=?", (notification_id,)).fetchone()
        return _row_to_notification(row) if row else None

    def list(self, recipient_id: str = None, read: bool = None) -> list[Notification]:
        query = "SELECT * FROM notifications WHERE 1=1"
        params: list = []
        if recipient_id is not None:
            query += " AND recipient_id=?"
            params.append(recipient_id)
        if read is True:
            query += " AND read_at IS NOT NULL"
        elif read is False:
            query += " AND read_at IS NULL"
        query += " ORDER BY created_at DESC"
        with _connect(self._db_path) as conn:
            rows = conn.execute(query, params).fetchall()
        return [_row_to_notification(row) for row in rows]

    def create(self, notification: Notification) -> Notification:
        with _connect(self._db_path) as conn:
            conn.execute(
                "INSERT INTO notifications (notification_id, recipient_id, sender_id, type, title, message, metadata, related_booking_id, created_at, read_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    notification.notification_id,
                    notification.recipient_id,
                    notification.sender_id,
                    notification.type,
                    notification.title,
                    notification.message,
                    json.dumps(notification.metadata or {}),
                    notification.related_booking_id,
                    notification.created_at,
                    notification.read_at,
                ),
            )
        return notification

    def mark_read(self, notification_id: str, read_at: str) -> Notification:
        with _connect(self._db_path) as conn:
            conn.execute("UPDATE notifications SET read_at=? WHERE notification_id=?", (read_at, notification_id))
            row = conn.execute("SELECT * FROM notifications WHERE notification_id=?", (notification_id,)).fetchone()
        return _row_to_notification(row)

    def mark_unread(self, notification_id: str) -> Notification:
        with _connect(self._db_path) as conn:
            conn.execute("UPDATE notifications SET read_at=NULL WHERE notification_id=?", (notification_id,))
            row = conn.execute("SELECT * FROM notifications WHERE notification_id=?", (notification_id,)).fetchone()
        return _row_to_notification(row)

    def mark_all_read(self, recipient_id: str, read_at: str) -> int:
        with _connect(self._db_path) as conn:
            cursor = conn.execute("UPDATE notifications SET read_at=? WHERE recipient_id=? AND read_at IS NULL", (read_at, recipient_id))
        return cursor.rowcount

    def mark_all_unread(self, recipient_id: str) -> int:
        with _connect(self._db_path) as conn:
            cursor = conn.execute("UPDATE notifications SET read_at=NULL WHERE recipient_id=? AND read_at IS NOT NULL", (recipient_id,))
        return cursor.rowcount
