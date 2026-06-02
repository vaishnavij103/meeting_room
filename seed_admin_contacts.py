"""Seed script — creates default admin contacts for each location."""
import os
import requests

BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8000/api")

# Default admin contacts for each location
ADMIN_CONTACTS = [
    {
        "location": "Ahemdabad",
        "name": "Kalpana Parmar",
        "email": "kalpana.parmar@apexon.com",
        "phone": "7698004492",
        "role": "Admin Team",
        "active": True,
    },
    {
        "location": "Ahemdabad",
        "name": "Ayush Mathuria",
        "email": "ayush.mathuria@apexon.com",
        "phone": "9624010002",
        "role": "Admin Team",
        "active": True,
    },
    {
        "location": "Chennai",
        "name": "Yuvaraj S",
        "email": "yuvaraj.s@apexon.com",
        "phone": "9884000341",
        "role": "Admin Team",
        "active": True,
    },
        {
        "location": "Hyderabad",
        "name": "Yuvaraj S",
        "email": "yuvaraj.s@apexon.com",
        "phone": "9884000341",
        "role": "Admin Team",
        "active": True,
    },
    {
        "location": "Coimbatore",
        "name": "Manoharan M",
        "email": "manoharan.m@apexon.com",
        "phone": "9626873215",
        "role": "Admin Team",
        "active": True,
    },
    {
        "location": "Bangalore (Domlur office)",
        "name": "Manjula Munikeshava",
        "email": "manjula.munikeshava@apexon.com",
        "phone": "6361476691",
        "role": "Admin Team",
        "active": True,
    },
    {
        "location": "Bangalore (Signet office)",
        "name": "Bhavya S",
        "email": "bhavya.s@apexon.com",
        "phone": "9972915522",
        "role": "Admin Team",
        "active": True,
    },
    {
        "location": "Pune",
        "name": "Nitin Nikumbh",
        "email": "nitin.nikumbh@apexon.com",
        "phone": "7720008395",
        "role": "Admin Team",
        "active": True,
    },
        {
        "location": "Mumbai",
        "name": "Nitin Nikumbh",
        "email": "nitin.nikumbh@apexon.com",
        "phone": "7720008395",
        "role": "Admin Team",
        "active": True,
    },
]


def main():
    print("\n👨‍💼 Apexon Room Booking — Admin Contacts Seeder")
    print("=" * 50)
    
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        r.raise_for_status()
        print("✅ API is up\n")
    except Exception as e:
        print(f"❌ Cannot reach API: {e}")
        return

    created_count = 0
    for contact in ADMIN_CONTACTS:
        try:
            resp = requests.post(
                f"{BASE_URL}/admin-contacts",
                json=contact,
                timeout=5,
            )
            if resp.status_code == 201:
                print(f"✅ Created: {contact['name']} ({contact['location']})")
                created_count += 1
            elif resp.status_code == 400:
                print(f"⚠️  Already exists: {contact['name']} ({contact['location']})")
            else:
                print(f"❌ Failed to create {contact['name']}: {resp.status_code} - {resp.text}")
        except Exception as e:
            print(f"❌ Error creating {contact['name']}: {e}")

    print(f"\n📊 Summary: {created_count} admin contact(s) created")


if __name__ == "__main__":
    main()
