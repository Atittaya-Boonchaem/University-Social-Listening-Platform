import json
from app.database import SessionLocal
from app.models import Building

db = SessionLocal()
buildings = db.query(Building).all()

locations = []
# Pre-existing manual overrides
manual_overrides = {
    "ประตู 1 มหาวิทยาลัยพะเยา": {
         "aliases": ["หน้ามอ", "ประตูหน้า", "ประตู 1", "หน้าม.พะเยา"],
         "canonical_name": "ประตู 1 มหาวิทยาลัยพะเยา",
         "id_override": "LOC001"
    },
    "หอพัก 12": {
         "aliases": ["หอ 12", "หอสิบสอง", "หน้าหอ 12"],
         "canonical_name": "หอพัก 12",
         "id_override": "LOC002"
    },
    "คณะเทคโนโลยีสารสนเทศและการสื่อสาร": {
        "aliases": ["ตึก ict", "ตึกไอซีที", "ตึกไอที", "คณะเทคโนโลยีสารสนเทศและการสื่อสาร", "คณะไอซีที"],
        "canonical_name": "คณะเทคโนโลยีสารสนเทศและการสื่อสาร",
        "id_override": "LOC003"
    }
}

# Separate buildings into preferred and others
preferred_buildings = [None] * 3
other_buildings = []

for b in buildings:
    if b.name == "ประตู 1 มหาวิทยาลัยพะเยา":
        preferred_buildings[0] = b
    elif b.name == "หอพัก 12":
        preferred_buildings[1] = b
    elif b.name == "คณะเทคโนโลยีสารสนเทศและการสื่อสาร":
        preferred_buildings[2] = b
    else:
        other_buildings.append(b)

# Combine them (removing None if any of the preferred were not found)
ordered_buildings = [b for b in preferred_buildings if b is not None] + other_buildings

for idx, b in enumerate(ordered_buildings):
    override = manual_overrides.get(b.name)
    loc_id = override.get("id_override") if override and "id_override" in override else f"LOC{(idx+1):03d}"
    
    canonical = b.name
    aliases = []
    
    if b.name.startswith("คณะ"):
        aliases.append(b.name.replace("คณะ", "ตึก"))
    elif b.name.startswith("อาคาร"):
        aliases.append(b.name.replace("อาคาร", "ตึก"))
    elif b.name.startswith("หอพัก"):
        aliases.append(b.name.replace("หอพัก", "หอ"))
        aliases.append(b.name.replace("หอพัก", "หน้าหอ"))
        
    if override:
        aliases.extend(override.get("aliases", []))
        canonical = override.get("canonical_name", b.name)
        
    aliases = list(set(aliases))
    
    locations.append({
        "location_id": loc_id,
        "canonical_name": canonical,
        "aliases": aliases,
        "latitude": float(b.latitude) if b.latitude else None,
        "longitude": float(b.longitude) if b.longitude else None
    })

# If manual overrides exist for locations not in DB (like ประตู 1 might not be a building), add them manually
for name, override in manual_overrides.items():
    if not any(loc["canonical_name"] == override["canonical_name"] for loc in locations):
        locations.append({
            "location_id": override["id_override"],
            "canonical_name": override["canonical_name"],
            "aliases": override["aliases"],
            "latitude": 19.0286 if name == "ประตู 1 มหาวิทยาลัยพะเยา" else (19.0290 if name == "หอพัก 12" else None),
            "longitude": 99.8948 if name == "ประตู 1 มหาวิทยาลัยพะเยา" else (99.8950 if name == "หอพัก 12" else None)
        })

# Sort locations by location_id
locations.sort(key=lambda x: x["location_id"])

with open('app/ai_data/campus_locations.json', 'w', encoding='utf-8') as f:
    json.dump(locations, f, ensure_ascii=False, indent=2)

print(f"Generated {len(locations)} locations to campus_locations.json")
db.close()
