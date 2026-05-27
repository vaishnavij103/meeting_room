import os

def get_database_url() -> str | None:
    return os.environ.get("DATABASE_URL")


def get_notifications_database_url() -> str | None:
    return os.environ.get("NOTIFICATIONS_DATABASE_URL")


def get_db_path() -> str:
    return os.environ.get("DB_PATH", "bookings.db")

def get_business_hours_start() -> str:
    return os.environ.get("BUSINESS_HOURS_START", "08:00")

def get_business_hours_end() -> str:
    return os.environ.get("BUSINESS_HOURS_END", "20:00")

def get_notifications_db_path() -> str:
    return os.environ.get("NOTIFICATIONS_DB_PATH", "notifications.db")
