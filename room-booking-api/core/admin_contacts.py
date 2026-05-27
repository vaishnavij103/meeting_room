import re
import uuid
from datetime import datetime

try:
    from .models import AdminContact, BookingError
    from ..db.base import AdminContactRepository
except ImportError:
    from core.models import AdminContact, BookingError  # type: ignore
    from db.base import AdminContactRepository  # type: ignore

_EMAIL_RE = re.compile(r'^[^@]+@[^@]+\.[^@]+$')
_PHONE_RE = re.compile(r'^[0-9+\-() ]{6,30}$')


def _normalize_text(value: str, field_name: str) -> str:
    value = str(value or '').strip()
    if not value:
        raise BookingError(f"{field_name} is required", http_status=422)
    return value


def _validate_email(email: str) -> str:
    if not _EMAIL_RE.match(email):
        raise BookingError("invalid email", http_status=422)
    return email.strip().lower()


def _validate_phone(phone: str) -> str:
    phone = str(phone or '').strip()
    if not _PHONE_RE.match(phone):
        raise BookingError("invalid phone number", http_status=422)
    return phone


def list_admin_contacts(repo: AdminContactRepository, location: str = None) -> list[AdminContact]:
    return repo.list(location=location)


def get_admin_contact(repo: AdminContactRepository, admin_id: str) -> AdminContact:
    admin = repo.get(admin_id)
    if admin is None:
        raise BookingError("admin contact not found", http_status=404)
    return admin


def create_admin_contact(repo: AdminContactRepository, data: dict) -> AdminContact:
    admin = AdminContact(
        admin_id=str(uuid.uuid4()),
        location=_normalize_text(data.get('location'), 'location'),
        name=_normalize_text(data.get('name'), 'name'),
        email=_validate_email(data.get('email', '')),
        phone=_validate_phone(data.get('phone', '')),
        role=str(data.get('role', 'Site Admin')).strip() or 'Site Admin',
        active=bool(data.get('active', True)),
        created_at=datetime.utcnow().isoformat(),
        updated_at=datetime.utcnow().isoformat(),
    )
    return repo.create(admin)


def update_admin_contact(repo: AdminContactRepository, admin_id: str, data: dict) -> AdminContact:
    existing = get_admin_contact(repo, admin_id)
    updated = AdminContact(
        admin_id=existing.admin_id,
        location=_normalize_text(data.get('location', existing.location), 'location'),
        name=_normalize_text(data.get('name', existing.name), 'name'),
        email=_validate_email(data.get('email', existing.email)),
        phone=_validate_phone(data.get('phone', existing.phone)),
        role=str(data.get('role', existing.role)).strip() or existing.role,
        active=bool(data.get('active', existing.active)),
        created_at=existing.created_at,
        updated_at=datetime.utcnow().isoformat(),
    )
    return repo.update(updated)


def delete_admin_contact(repo: AdminContactRepository, admin_id: str) -> None:
    get_admin_contact(repo, admin_id)
    repo.delete(admin_id)
