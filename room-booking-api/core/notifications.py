from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Optional

try:
    from .models import Notification, Booking, BookingError
    from ..db.base import NotificationRepository, UserRepository
except ImportError:
    from core.models import Notification, Booking, BookingError  # type: ignore
    from db.base import NotificationRepository, UserRepository  # type: ignore


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


def _normalize_metadata(metadata: Optional[dict]) -> dict:
    if metadata is None:
        return {}
    if not isinstance(metadata, dict):
        raise BookingError("notification metadata must be a dictionary", http_status=422)
    return metadata


def create_notification(
    repo: NotificationRepository,
    recipient_id: str,
    title: str,
    message: str,
    type: str = "booking",
    metadata: Optional[dict] = None,
    related_booking_id: Optional[str] = None,
    sender_id: Optional[str] = None,
) -> Notification:
    if not recipient_id:
        raise BookingError("recipient_id is required", http_status=422)
    if not title or not str(title).strip():
        raise BookingError("notification title is required", http_status=422)
    if not message or not str(message).strip():
        raise BookingError("notification message is required", http_status=422)

    notification = Notification(
        notification_id=str(uuid.uuid4()),
        recipient_id=recipient_id,
        sender_id=sender_id,
        type=type,
        title=str(title).strip(),
        message=str(message).strip(),
        metadata=_normalize_metadata(metadata),
        related_booking_id=related_booking_id,
        created_at=_now_iso(),
        read_at=None,
    )
    return repo.create(notification)


def get_notification(repo: NotificationRepository, notification_id: str) -> Notification:
    notification = repo.get(notification_id)
    if notification is None:
        raise BookingError("notification not found", http_status=404)
    return notification


def list_notifications(
    repo: NotificationRepository,
    user_id: Optional[str] = None,
    read: Optional[bool] = None,
) -> list[Notification]:
    return repo.list(recipient_id=user_id, read=read)


def mark_notification_read(repo: NotificationRepository, notification_id: str) -> Notification:
    notification = get_notification(repo, notification_id)
    if notification.read_at is not None:
        return notification
    return repo.mark_read(notification_id, _now_iso())


def mark_notification_unread(repo: NotificationRepository, notification_id: str) -> Notification:
    notification = get_notification(repo, notification_id)
    if notification.read_at is None:
        return notification
    return repo.mark_unread(notification_id)


def mark_all_notifications_read(repo: NotificationRepository, user_id: str) -> int:
    if not user_id:
        raise BookingError("user_id is required", http_status=422)
    return repo.mark_all_read(user_id, _now_iso())


def mark_all_notifications_unread(repo: NotificationRepository, user_id: str) -> int:
    if not user_id:
        raise BookingError("user_id is required", http_status=422)
    return repo.mark_all_unread(user_id)


def _admin_user_ids(user_repo: UserRepository) -> list[str]:
    return [u.user_id for u in user_repo.list() if u.role == "admin"]


def notify_booking_event(
    notification_repo: NotificationRepository,
    user_repo: UserRepository,
    booking: Booking,
    event_type: str,
) -> list[Notification]:
    user = user_repo.get(booking.user_id)
    if user is None:
        raise BookingError("booking user not found", http_status=404)

    notification_map = {
        "created": ("Booking confirmed", "Your booking '{title}' for room {room_id} is confirmed from {start_time} to {end_time}.", "{name} created a booking '{title}' for room {room_id}.") ,
        "updated": ("Booking updated", "Your booking '{title}' for room {room_id} was updated.", "{name} updated booking '{title}' for room {room_id}.") ,
        "cancelled": ("Booking cancelled", "Your booking '{title}' for room {room_id} was cancelled.", "{name} cancelled booking '{title}' for room {room_id}.") ,
        "checked-in": ("Check-in confirmed", "You checked in for booking '{title}' in room {room_id}.", "{name} checked in for booking '{title}' in room {room_id}.") ,
        "checked-out": ("Check-out confirmed", "You checked out from booking '{title}' in room {room_id}.", "{name} checked out from booking '{title}' in room {room_id}.") ,
    }

    if event_type not in notification_map:
        raise BookingError(f"unsupported booking notification event: {event_type}", http_status=400)

    user_title, user_message_template, admin_message_template = notification_map[event_type]
    admin_ids = _admin_user_ids(user_repo)
    recipient_ids = [booking.user_id] + [admin_id for admin_id in admin_ids if admin_id != booking.user_id]

    notifications: list[Notification] = []
    for recipient_id in recipient_ids:
        if recipient_id == booking.user_id:
            message = user_message_template.format(
                title=booking.title,
                room_id=booking.room_id,
                start_time=booking.start_time,
                end_time=booking.end_time,
                name=user.name,
            )
            title = user_title
        else:
            message = admin_message_template.format(
                title=booking.title,
                room_id=booking.room_id,
                start_time=booking.start_time,
                end_time=booking.end_time,
                name=user.name,
            )
            title = f"User booking {event_type}"

        notifications.append(
            create_notification(
                notification_repo,
                recipient_id=recipient_id,
                title=title,
                message=message,
                type="booking",
                metadata={
                    "event_type": event_type,
                    "booking_id": booking.booking_id,
                    "user_id": booking.user_id,
                },
                related_booking_id=booking.booking_id,
                sender_id=None,
            )
        )

    return notifications
