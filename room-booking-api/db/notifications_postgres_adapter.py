from __future__ import annotations

import json
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional

try:
    from ..core.models import Notification
    from .base import NotificationRepository
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
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    related_booking_id TEXT,
    created_at TEXT NOT NULL,
    read_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read_at);
"""


def _connect(database_url: str):
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)


def _ensure_schema(database_url: str) -> None:
    with _connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(_DDL)


def _ensure_json(value):
    if value is None:
        return {}
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return {}
    return value


def _row_to_notification(row) -> Notification:
    return Notification(
        notification_id=row["notification_id"],
        recipient_id=row["recipient_id"],
        sender_id=row.get("sender_id"),
        type=row["type"],
        title=row["title"],
        message=row["message"],
        metadata=_ensure_json(row["metadata"]),
        related_booking_id=row.get("related_booking_id"),
        created_at=row["created_at"],
        read_at=row.get("read_at"),
    )


class PostgresNotificationRepo(NotificationRepository):
    def __init__(self, database_url: str):
        self._database_url = database_url
        _ensure_schema(database_url)

    def get(self, notification_id: str) -> Optional[Notification]:
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM notifications WHERE notification_id=%s", (notification_id,))
                row = cur.fetchone()
        return _row_to_notification(row) if row else None

    def list(self, recipient_id: str = None, read: bool = None) -> list[Notification]:
        query = "SELECT * FROM notifications WHERE 1=1"
        params: list = []
        if recipient_id is not None:
            query += " AND recipient_id=%s"
            params.append(recipient_id)
        if read is True:
            query += " AND read_at IS NOT NULL"
        elif read is False:
            query += " AND read_at IS NULL"
        query += " ORDER BY created_at DESC"
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                rows = cur.fetchall()
        return [_row_to_notification(row) for row in rows]

    def create(self, notification: Notification) -> Notification:
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO notifications (notification_id, recipient_id, sender_id, type, title, message, metadata, related_booking_id, created_at, read_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
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
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute("UPDATE notifications SET read_at=%s WHERE notification_id=%s", (read_at, notification_id))
                cur.execute("SELECT * FROM notifications WHERE notification_id=%s", (notification_id,))
                row = cur.fetchone()
        return _row_to_notification(row)

    def mark_unread(self, notification_id: str) -> Notification:
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute("UPDATE notifications SET read_at=NULL WHERE notification_id=%s", (notification_id,))
                cur.execute("SELECT * FROM notifications WHERE notification_id=%s", (notification_id,))
                row = cur.fetchone()
        return _row_to_notification(row)

    def mark_all_read(self, recipient_id: str, read_at: str) -> int:
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute("UPDATE notifications SET read_at=%s WHERE recipient_id=%s AND read_at IS NULL", (read_at, recipient_id))
                return cur.rowcount

    def mark_all_unread(self, recipient_id: str) -> int:
        with _connect(self._database_url) as conn:
            with conn.cursor() as cur:
                cur.execute("UPDATE notifications SET read_at=NULL WHERE recipient_id=%s AND read_at IS NOT NULL", (recipient_id,))
                return cur.rowcount
