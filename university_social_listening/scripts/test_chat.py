import asyncio
from app.services.location_service import extract_location_pipeline
import json

result = extract_location_pipeline("รถเมล์ที่วิ่งผ่านบริเวณตึกไอซีทีไม่มีเลย แย่มาก")
print(json.dumps(result, ensure_ascii=False, indent=2))
