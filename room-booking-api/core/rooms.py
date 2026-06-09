import re
import uuid
import csv
import io
from datetime import datetime

try:
    from .models import Room, BookingError , LocationWiseRoom
    from ..db.base import RoomRepository
except ImportError:
    from core.models import Room, BookingError , LocationWiseRoom # type: ignore
    from db.base import RoomRepository  # type: ignore


def get_room(repo: RoomRepository, room_id: str) -> LocationWiseRoom:
    room = repo.get(room_id)
    if room is None:
        raise BookingError("room not found", http_status=404)
    return room


def list_rooms(
    repo: RoomRepository,
    capacity: int = None,
    amenities: list[str] = None,
    floor: int = None,
) -> list[LocationWiseRoom]:
    return repo.list(capacity=capacity, amenities=amenities, floor=floor)


def _validate_room_data(data: dict, require_name: bool = True) -> None:
    name = data.get("name")
    if require_name or "name" in data:
        if not name or not isinstance(name, str) or not name.strip():
            raise BookingError("name is required", http_status=422)

    capacity = data.get("capacity")
    # if capacity is not None:
    #     if not isinstance(capacity, int) or capacity < 1:
    #         raise BookingError("capacity must be at least 1", http_status=422)

    status = data.get("status")
    if status is not None and status not in ("active", "inactive"):
        raise BookingError("invalid status", http_status=422)


def _normalize_location(value: str) -> str:
    if not value or not isinstance(value, str):
        raise BookingError("location is required", http_status=422)

    normalized = value.strip()
    normalized = re.sub(r"\s+", " ", normalized)
    normalized = re.sub(r"(?i)bangalore\s*[\(\[]?\s*domlur[\)\]]?", "Bangalore(Domlur)", normalized)
    normalized = re.sub(r"(?i)bangalore\s*[\(\[]?\s*signet[\)\]]?", "Bangalore(Signet)", normalized)
    return normalized


def create_room(repo: RoomRepository, data: dict) -> LocationWiseRoom:
    _validate_room_data(data, require_name=True)

    if data.get("capacity") is None:
        raise BookingError("capacity must be at least 1", http_status=422)

    now = datetime.utcnow().isoformat()
    room = LocationWiseRoom(
        room_id=str(uuid.uuid4()),
        name=data["name"].strip(),
        location=_normalize_location(data.get("location")),  # ✅ REQUIRED
        floor=data.get("floor", 1),
        capacity=data["capacity"],
        amenities=data.get("amenities", []),
        status=data.get("status", "active"),

        # ✅ Optional fields
        building=data.get("building"),
        room_type=data.get("room_type"),
        cabin_type=data.get("cabin_type"),
        vc_enabled=data.get("vc_enabled", False),
        power_points=data.get("power_points", False),
        allowed_users=data.get("allowed_users", []),
        created_at=now,
        updated_at=now,
    )

    return repo.create(room)


def update_room(repo: RoomRepository, room_id: str, data: dict) -> LocationWiseRoom:
    room = repo.get(room_id)
    if room is None:
        raise BookingError("room not found", http_status=404)

    _validate_room_data(data, require_name=False)

    if "name" in data:
        room.name = data["name"].strip()
    if "location" in data:
        room.location = _normalize_location(data["location"])
    if "floor" in data:
        room.floor = data["floor"]
    if "capacity" in data:
        room.capacity = data["capacity"]
    if "amenities" in data:
        room.amenities = data["amenities"]
    if "status" in data:
        room.status = data["status"]
    if "allowed_users" in data:
        room.allowed_users = data["allowed_users"]

    room.updated_at = datetime.utcnow().isoformat()
    return repo.update(room)


def deactivate_room(repo: RoomRepository, room_id: str) -> None:
    room = repo.get(room_id)
    if room is None:
        raise BookingError("room not found", http_status=404)

    room.status = "inactive"
    room.updated_at = datetime.utcnow().isoformat()
    repo.update(room)


def _parse_rooms_from_csv(csv_content: str) -> list[dict]:
    """Parse rooms from CSV content. Returns list of room dicts."""
    rooms = []

    def clean(v):
        return v.strip() if v and v.strip() != "" else None

    def yes_no(v):
        return True if v and v.strip().lower() == "yes" else False

    try:
        reader = csv.DictReader(io.StringIO(csv_content))
        if not reader.fieldnames:
            raise BookingError("Invalid CSV format: no headers found", http_status=400)

        for row in reader:
            try:
                amenities_raw = clean(
                    row.get("Amenities Available (Projector, Whiteboard, TV,")
                )

                if amenities_raw and amenities_raw.lower() != "no":
                    amenities = [a.strip() for a in amenities_raw.split(",")]
                else:
                    amenities = []

                capacity = clean(row.get("Seating Capacity"))
                capacity = int(capacity) if capacity and capacity.isdigit() else 0

                room = {
                    "name": clean(row.get("Room Name")),
                    "location": clean(row.get("Location / Building")) or "Default",
                    "floor": int(clean(row.get("Floor")) or 1),
                    "capacity": capacity,
                    "amenities": amenities,
                    "status": "active",
                    "room_type": clean(row.get("Room Type")),
                    "cabin_type": clean(row.get("Cabin Type")),
                    "vc_enabled": yes_no(row.get("VC Enabled")),
                    "power_points": yes_no(row.get("Power Points")),
                }

                rooms.append(room)

            except Exception as e:
                print(f"❌ Error parsing row: {e}")

        return rooms

    except Exception as e:
        raise BookingError(f"Failed to parse CSV: {str(e)}", http_status=400)


def import_rooms_from_csv(repo: RoomRepository, csv_content: str) -> dict:
    """Import rooms from CSV content. Returns dict with created, failed, and error details."""
    rooms_data = _parse_rooms_from_csv(csv_content)

    results = {
        "total": len(rooms_data),
        "created": 0,
        "failed": 0,
        "skipped": 0,
        "errors": [],
        "created_rooms": [],
        "failed_rooms": [],
    }

    for room_data in rooms_data:
        try:
            # Check if room already exists by name and location
            existing = repo.list()
            if any(
                r.name == room_data["name"] and r.location == room_data["location"]
                for r in existing
            ):
                results["skipped"] += 1
                results["failed_rooms"].append(
                    {"name": room_data["name"], "reason": "duplicate"}
                )
                continue

            room = create_room(repo, room_data)
            results["created"] += 1
            results["created_rooms"].append(
                {"name": room.name, "room_id": room.room_id, "location": room.location}
            )

        except BookingError as e:
            results["failed"] += 1
            results["failed_rooms"].append(
                {"name": room_data.get("name", "Unknown"), "reason": e.message}
            )
            results["errors"].append(
                f"Room '{room_data.get('name', 'Unknown')}': {e.message}"
            )
        except Exception as e:
            results["failed"] += 1
            results["failed_rooms"].append(
                {
                    "name": room_data.get("name", "Unknown"),
                    "reason": "unexpected error",
                }
            )
            results["errors"].append(
                f"Room '{room_data.get('name', 'Unknown')}': {str(e)}"
            )

    return results