from __future__ import annotations

import base64
import io
import json

try:
    import qrcode
except ImportError:  # pragma: no cover
    qrcode = None

from .models import Booking, User


def _ensure_qrcode_available() -> None:
    if qrcode is None:
        raise ImportError(
            "QR code generation requires the 'qrcode' package. Install it with `pip install qrcode pillow`."
        )


def generate_qr_code_data_url(data: str) -> str:
    _ensure_qrcode_available()
    qr = qrcode.QRCode(box_size=6, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def build_external_meeting_qr_payload(
    booking: Booking,
    user: User,
    room_name: str,
    meeting_description: str = "",
    cost_centre: str = "",
    meeting_type: str = "External Meeting",
) -> dict:
    return {
        "type": meeting_type,
        "booking_id": booking.booking_id,
        "title": booking.title,
        "room_id": booking.room_id,
        "room_name": room_name,
        "start_time": booking.start_time,
        "end_time": booking.end_time,
        "user_name": user.name,
        "user_email": user.email,
        "meeting_description": meeting_description or booking.notes,
        "cost_centre": cost_centre or booking.cost_centre,
    }
