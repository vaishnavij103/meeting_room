import os
import logging
from typing import Optional

try:
    from . import rooms as rooms_core
    from . import users as users_core
    from . import admin_contacts as admin_core
    from ..db.base import RoomRepository, UserRepository, AdminContactRepository
except ImportError:
    from core import rooms as rooms_core  # type: ignore
    from core import users as users_core  # type: ignore
    from core import admin_contacts as admin_core  # type: ignore
    from db.base import RoomRepository, UserRepository, AdminContactRepository  # type: ignore

logger = logging.getLogger("room_booking.seeds")


DEFAULT_ADMIN = {
    "name": "Admin",
    "email": "admin@apexon.com",
    "password": "admin123",
    "department": "Operations",
    "role": "admin",
}


DEFAULT_ADMIN_CONTACTS = [
    {"location": "Ahmedabad", "name": "Kalpana Parmar", "email": "kalpana.parmar@apexon.com", "phone": "7698004492", "role": "Admin Team", "active": True},
    {"location": "Ahmedabad", "name": "Ayush Mathuria", "email": "ayush.mathuria@apexon.com", "phone": "9624010002", "role": "Admin Team", "active": True},
    {"location": "Chennai", "name": "Yuvaraj S", "email": "yuvaraj.s@apexon.com", "phone": "9884000341", "role": "Admin Team", "active": True},
    {"location": "Hyderabad", "name": "Yuvaraj S", "email": "yuvaraj.s@apexon.com", "phone": "9884000341", "role": "Admin Team", "active": True},
    {"location": "Coimbatore", "name": "Manoharan M", "email": "manoharan.m@apexon.com", "phone": "9626873215", "role": "Admin Team", "active": True},
    {"location": "Bangalore(Domlur)", "name": "Manjula Munikeshava", "email": "manjula.munikeshava@apexon.com", "phone": "6361476691", "role": "Admin Team", "active": True},
    {"location": "Bangalore(Signet)", "name": "Bhavya S", "email": "bhavya.s@apexon.com", "phone": "9972915522", "role": "Admin Team", "active": True},
    {"location": "Pune", "name": "Nitin Nikumbh", "email": "nitin.nikumbh@apexon.com", "phone": "7720008395", "role": "Admin Team", "active": True},
    {"location": "Mumbai", "name": "Nitin Nikumbh", "email": "nitin.nikumbh@apexon.com", "phone": "7720008395", "role": "Admin Team", "active": True},
]


def _find_csv_path() -> Optional[str]:
    # project root is two levels up from this file (room-booking-api/core)
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    candidates = [
        os.path.join(project_root, "location_wise_rooms_cleaned.csv"),
        os.path.join(os.getcwd(), "location_wise_rooms_cleaned.csv"),
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


def seed_rooms_if_needed(room_repo: RoomRepository) -> dict:
    try:
        existing = room_repo.list()
        if existing:
            logger.info("Rooms already present; skipping room seeding")
            return {"skipped": True}

        csv_path = _find_csv_path()
        if not csv_path:
            logger.warning("Rooms CSV not found; skipping room seeding")
            return {"skipped": True, "reason": "csv_missing"}

        with open(csv_path, encoding="utf-8", errors="ignore") as f:
            csv_content = f.read()

        result = rooms_core.import_rooms_from_csv(room_repo, csv_content)
        logger.info("Room seeding completed: %s", result)
        return result
    except Exception as e:
        logger.exception("Failed to seed rooms: %s", e)
        return {"error": str(e)}


def seed_admin_user_if_needed(user_repo: UserRepository) -> dict:
    try:
        existing = user_repo.get_by_email(DEFAULT_ADMIN["email"])
        if existing:
            logger.info("Admin user already exists; skipping admin seeding")
            return {"skipped": True}

        user = users_core.register_user(user_repo, DEFAULT_ADMIN)
        logger.info("Created admin user: %s", user.email)
        return {"created": user.email}
    except Exception as e:
        logger.exception("Failed to seed admin user: %s", e)
        return {"error": str(e)}


def seed_admin_contacts_if_needed(admin_repo: AdminContactRepository) -> dict:
    created = 0
    for c in DEFAULT_ADMIN_CONTACTS:
        try:
            admin_core.create_admin_contact(admin_repo, c)
            created += 1
        except Exception:
            # ignore duplicates or validation errors
            continue
    logger.info("Created %d admin contacts", created)
    return {"created": created}


def run_all_seeds(room_repo: RoomRepository, user_repo: UserRepository, admin_repo: AdminContactRepository) -> dict:
    out = {}
    out["rooms"] = seed_rooms_if_needed(room_repo)
    out["admin_user"] = seed_admin_user_if_needed(user_repo)
    out["admin_contacts"] = seed_admin_contacts_if_needed(admin_repo)
    return out


def maybe_run_seeds(room_repo: RoomRepository, user_repo: UserRepository, admin_repo: AdminContactRepository) -> dict:
    """Run seeds based on environment conditions.

    Behavior:
    - If AUTO_SEED env var is set to true/1/yes -> force run seeds (rooms seeded only if empty).
    - Else if SEED_IF_EMPTY is true (default) and rooms table is empty -> run seeds.
    """
    auto = os.environ.get("AUTO_SEED", "").lower() in ("1", "true", "yes")
    seed_if_empty = os.environ.get("SEED_IF_EMPTY", "true").lower() in ("1", "true", "yes")

    if auto:
        logger.info("AUTO_SEED enabled; running seeds")
        return run_all_seeds(room_repo, user_repo, admin_repo)

    if seed_if_empty:
        try:
            if not room_repo.list():
                logger.info("Rooms empty and SEED_IF_EMPTY enabled; running seeds")
                return run_all_seeds(room_repo, user_repo, admin_repo)
            else:
                logger.info("Rooms present; skipping seed (SEED_IF_EMPTY)")
                return {"skipped": True}
        except Exception as e:
            logger.exception("Error checking rooms for seeding: %s", e)
            return {"error": str(e)}

    logger.info("Seeding disabled by environment")
    return {"skipped": True}
