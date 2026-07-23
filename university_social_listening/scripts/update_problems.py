import re

with open(r'd:\mint\app\university_social_listening\app\routers\problems.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace signature
old_sig = """async def create_problem(
    problem_data: ProblemCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),  # ✅ ดึง user_id จาก JWT Token จริง
    ollama_service: OllamaService = Depends(get_ollama_service)
) -> StandardResponse:"""

new_sig = """async def create_problem(
    title: str = Form(..., min_length=5, max_length=255),
    description: str = Form(..., min_length=10),
    category_id: int = Form(...),
    building_id: Optional[int] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    is_anonymous: bool = Form(False),
    is_staff_only: bool = Form(False),
    incident_date: Optional[str] = Form(None),
    incident_time_range: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
    ollama_service: OllamaService = Depends(get_ollama_service)
) -> StandardResponse:"""

content = content.replace(old_sig, new_sig)

# Replace problem_data.category_id with category_id
content = content.replace("problem_data.category_id", "category_id")
content = content.replace("problem_data.building_id", "building_id")
content = content.replace("problem_data.title", "title")
content = content.replace("problem_data.description", "description")
content = content.replace("problem_data.latitude", "latitude")
content = content.replace("problem_data.longitude", "longitude")

# Replace image_url and parsed date saving logic
old_db_problem = """        # 5️⃣ สร้าง Problem object
        db_problem = Problem(
            user_id=user_id,
            category_id=category_id,
            building_id=building_id,
            title=title,
            description=description,
            latitude=latitude,
            longitude=longitude,
            image_url=problem_data.image_url,  # ✅ แนบ URL รูปภาพ
            incident_date=problem_data.incident_date,
            incident_time_range=problem_data.incident_time_range,
            is_anonymous=problem_data.is_anonymous,
            is_staff_only=problem_data.is_staff_only,"""

new_db_problem = """        # Save image if provided
        image_url = None
        if image and image.filename:
            upload_dir = config.IMAGE_UPLOAD_DIR
            os.makedirs(upload_dir, exist_ok=True)
            file_ext = os.path.splitext(image.filename)[1]
            unique_filename = f"{uuid.uuid4().hex}{file_ext}"
            file_path = os.path.join(upload_dir, unique_filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            # URL สำหรับ access
            image_url = f"/uploads/{unique_filename}"
            
        parsed_date = None
        if incident_date:
            try:
                parsed_date = datetime.fromisoformat(incident_date.replace('Z', '+00:00'))
            except Exception:
                parsed_date = None

        # 5️⃣ สร้าง Problem object
        db_problem = Problem(
            user_id=user_id,
            category_id=category_id,
            building_id=building_id,
            title=title,
            description=description,
            latitude=latitude,
            longitude=longitude,
            image_url=image_url,
            incident_date=parsed_date,
            incident_time_range=incident_time_range,
            is_anonymous=is_anonymous,
            is_staff_only=is_staff_only,"""

content = content.replace(old_db_problem, new_db_problem)

with open(r'd:\mint\app\university_social_listening\app\routers\problems.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done replacing.")
