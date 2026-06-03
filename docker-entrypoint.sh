#!/bin/bash
set -e

echo "🏢 Apexon RoomBook — Starting..."
echo "================================="

# Render sets PORT env var; default to 80 for local Docker
export PORT=${PORT:-80}
echo "  Listening on port: $PORT"

# Substitute PORT into nginx config
envsubst '$PORT' < /etc/nginx/conf.d/default.conf > /tmp/nginx.conf
mv /tmp/nginx.conf /etc/nginx/conf.d/default.conf

# Set Python path
export PYTHONPATH=/app/room-booking-api

# Initialize database
echo "📦 Initializing database..."
python -c "
import sys
sys.path.insert(0, '/app/room-booking-api')
from db.sqlite_adapter import SQLiteRoomRepo, SQLiteBookingRepo, SQLiteUserRepo
db = '/data/bookings.db'
SQLiteRoomRepo(db)
SQLiteBookingRepo(db)
SQLiteUserRepo(db)
print('  ✅ Database ready')
"

# Seed data (rooms, admin, admin contacts)
echo "🌱 Seeding data..."
python -c "
import sys, os, subprocess, time, requests
sys.path.insert(0, '/app/room-booking-api')
os.environ['DB_PATH'] = '/data/bookings.db'
from db.sqlite_adapter import SQLiteRoomRepo, SQLiteUserRepo, SQLiteBookingRepo

db_path = '/data/bookings.db'
force_seed = '$FORCE_SEED'.lower() == 'true'

# Start API server
print('  Starting API server for seeding...')
proc = subprocess.Popen(
    ['python', '-m', 'uvicorn', 'fastapi_app.main:app', '--host', '0.0.0.0', '--port', '8000'],
    cwd='/app/room-booking-api',
    env={**os.environ, 'DB_PATH': db_path, 'PYTHONPATH': '/app/room-booking-api'},
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)
time.sleep(3)

try:
    # Check if API is ready (try both /health and /api/health)
    for attempt in range(10):
        ok = False
        for base in ('http://localhost:8000/health', 'http://localhost:8000/api/health'):
            try:
                resp = requests.get(base, timeout=2)
                if resp.status_code == 200:
                    print('  ✅ API server ready')
                    ok = True
                    break
            except:
                pass
        if ok:
            break
        if attempt < 9:
            time.sleep(1)
    
    # 1. Seed rooms
    rooms_repo = SQLiteRoomRepo(db_path)
    rooms = rooms_repo.list()
    if force_seed or len(rooms) == 0:
        print('  📍 Seeding rooms...')
        exec(open('/app/seed_rooms.py').read())
    else:
        print(f'  ✅ {len(rooms)} rooms already exist')
    
    # 2. Seed admin user
    users_repo = SQLiteUserRepo(db_path)
    users = users_repo.list()
    admin_exists = any(u.email == 'admin@apexon.com' for u in users)
    if force_seed or not admin_exists:
        print('  👤 Seeding admin user...')
        exec(open('/app/seed_admin.py').read())
    else:
        print('  ✅ Admin user already exists')
    
    # 3. Seed admin contacts
    try:
        print('  👨‍💼 Seeding admin contacts...')
        exec(open('/app/seed_admin_contacts.py').read())
    except Exception as e:
        print(f'  ⚠️  Admin contacts seed error: {e}')
    
except Exception as e:
    print(f'  ❌ Seeding error: {e}')
    import traceback
    traceback.print_exc()
finally:
    print('  Stopping API server...')
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
"

echo ""
echo "🚀 Starting services..."
echo "  Frontend: http://0.0.0.0:$PORT"
echo "  API:      http://0.0.0.0:8000"
echo "================================="
echo ""

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/app.conf
