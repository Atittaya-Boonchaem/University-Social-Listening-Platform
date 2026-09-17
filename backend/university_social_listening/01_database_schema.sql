-- ========================================
-- University Social Listening Platform
-- Database Schema (MySQL)
-- ========================================

-- สร้างฐานข้อมูล
CREATE DATABASE IF NOT EXISTS university_social_listening;

USE university_social_listening;

-- ========================================
-- 1. ตาราง Role (บทบาทผู้ใช้)
-- ========================================
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 2. ตาราง Users (ผู้ใช้งาน)
-- ========================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_id INT NOT NULL,
    email VARCHAR(255),
    phone_number VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

-- Student-specific (นิสิต)
student_id VARCHAR(10),
faculty VARCHAR(100),
education_level VARCHAR(50),

-- Staff-specific (บุคลากร)
staff_account VARCHAR(100),

-- Common attributes
age INT,
    gender ENUM('M', 'F', 'Other'),
    relationship_to_university VARCHAR(100),
    is_toxic_flagged BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (role_id) REFERENCES roles(id),
    UNIQUE KEY unique_student (student_id),
    UNIQUE KEY unique_email (email),
    UNIQUE KEY unique_phone (phone_number),
    INDEX idx_role (role_id),
    INDEX idx_is_active (is_active)
);

-- ========================================
-- 3. ตาราง Problem Categories (หมวดหมู่ปัญหา)
-- ========================================
CREATE TABLE problem_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color_code VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 4. ตาราง Buildings (ตึก/อาคาร)
-- ========================================
CREATE TABLE buildings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_location (latitude, longitude)
);

-- ========================================
-- 5. ตาราง Problems/Posts (แจ้งปัญหา)
-- ========================================
CREATE TABLE problems (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    building_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

-- Time information
incident_date DATETIME, incident_time_range VARCHAR(100),

-- Status tracking
status ENUM(
    'OPEN',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED'
) DEFAULT 'OPEN',
priority ENUM(
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
) DEFAULT 'MEDIUM',

-- Privacy settings
is_anonymous BOOLEAN DEFAULT FALSE,
is_staff_only BOOLEAN DEFAULT FALSE,

-- Metadata
upvote_count INT DEFAULT 0,
    is_ai_generated_spam BOOLEAN DEFAULT FALSE,
    toxicity_score DECIMAL(3, 2) DEFAULT 0.00,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES problem_categories(id),
    FOREIGN KEY (building_id) REFERENCES buildings(id),
    INDEX idx_status (status),
    INDEX idx_created (created_at),
    INDEX idx_location (latitude, longitude),
    INDEX idx_category (category_id),
    INDEX idx_user (user_id)
);

-- ========================================
-- 6. ตาราง Images (ภาพถ่ายแจ้งปัญหา)
-- ========================================
-- ⚠️ CRITICAL: ห้ามเก็บ Email หรือ Phone ในตารางนี้
-- เก็บเฉพาะข้อมูล: file_path, extracted_coordinates, file_size
CREATE TABLE images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    problem_id INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes INT,
    extracted_latitude DECIMAL(10, 8),
    extracted_longitude DECIMAL(11, 8),
    extraction_confidence DECIMAL(3, 2),
    is_processed BOOLEAN DEFAULT FALSE,
    processing_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (problem_id) REFERENCES problems (id) ON DELETE CASCADE,
    INDEX idx_problem (problem_id),
    INDEX idx_is_processed (is_processed)
);

-- ========================================
-- 7. ตาราง Upvotes (เห็นด้วย)
-- ========================================
CREATE TABLE upvotes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    problem_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (problem_id) REFERENCES problems (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE KEY unique_upvote (problem_id, user_id),
    INDEX idx_user (user_id)
);

-- ========================================
-- 8. ตาราง Status Updates (ติดตามสถานะ)
-- ========================================
CREATE TABLE status_updates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    problem_id INT NOT NULL,
    updated_by_user_id INT NOT NULL,
    old_status ENUM(
        'OPEN',
        'IN_PROGRESS',
        'RESOLVED',
        'CLOSED'
    ),
    new_status ENUM(
        'OPEN',
        'IN_PROGRESS',
        'RESOLVED',
        'CLOSED'
    ),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (problem_id) REFERENCES problems (id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by_user_id) REFERENCES users (id),
    INDEX idx_problem (problem_id),
    INDEX idx_created (created_at)
);

-- ========================================
-- 9. ตาราง Clustering Results (AI: K-Means)
-- ========================================
CREATE TABLE user_clusters (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    cluster_id INT NOT NULL,
    behavior_score DECIMAL(5, 2),
    risk_level ENUM('LOW', 'MEDIUM', 'HIGH') DEFAULT 'LOW',
    clustering_date DATETIME,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_cluster (cluster_id),
    INDEX idx_risk_level (risk_level)
);

-- ========================================
-- 10. ตาราง Audit Logs (การตรวจสอบ)
-- ========================================
CREATE TABLE audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(255),
    resource_type VARCHAR(100),
    resource_id INT,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_created (created_at),
    INDEX idx_user (user_id),
    INDEX idx_resource (resource_type, resource_id)
);

-- ========================================
-- 11. ตาราง Analytics Cache (สำหรับ Dashboard)
-- ========================================
CREATE TABLE analytics_cache (
    id INT PRIMARY KEY AUTO_INCREMENT,
    metric_name VARCHAR(100),
    metric_value JSON,
    calculation_date DATE,
    cache_expiry DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_metric_date (metric_name, calculation_date),
    INDEX idx_expiry (cache_expiry)
);

-- ========================================
-- 12. ตาราง NLP Analysis Results (Ollama)
-- ========================================
CREATE TABLE nlp_analysis (
    id INT PRIMARY KEY AUTO_INCREMENT,
    problem_id INT NOT NULL,
    extracted_category VARCHAR(100),
    extracted_time_context VARCHAR(255),
    confidence_score DECIMAL(3, 2),
    is_toxic BOOLEAN DEFAULT FALSE,
    toxic_keywords TEXT,
    raw_response LONGTEXT,
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (problem_id) REFERENCES problems (id) ON DELETE CASCADE,
    INDEX idx_problem (problem_id),
    INDEX idx_confidence (confidence_score)
);

-- ========================================
-- Insert Default Roles
-- ========================================
INSERT INTO
    roles (name, description)
VALUES ('student', 'นิสิต มพ.'),
    ('staff', 'บุคลากร มพ.'),
    ('public', 'บุคคลทั่วไป'),
    ('admin', 'ผู้ดูแลระบบ');

-- ========================================
-- Insert Sample Problem Categories
-- ========================================
INSERT INTO
    problem_categories (name, description, color_code)
VALUES (
        'อาคารสถานที่',
        'ปัญหาเกี่ยวกับสภาพตึก หลังคา พื้น',
        '#FF5252'
    ),
    (
        'ความสะอาด',
        'ปัญหาความสะอาด สุขาภิบาล',
        '#FFC107'
    ),
    (
        'ความปลอดภัย',
        'ปัญหาความปลอดภัย การรักษาความปลอดภัย',
        '#FF9100'
    ),
    (
        'สาธารณูปโภค',
        'ปัญหาน้ำ ไฟฟ้า การจัดสรรทรัพยากร',
        '#2196F3'
    ),
    (
        'ปัญหาสังคม',
        'ปัญหาภายในชุมชนการศึกษา',
        '#9C27B0'
    ),
    (
        'อื่น ๆ',
        'ปัญหาอื่น ๆ ที่ไม่สามารถจำแนกได้',
        '#9E9E9E'
    );

-- ========================================
-- Insert Sample Buildings
-- ========================================
INSERT INTO
    buildings (
        name,
        latitude,
        longitude,
        description
    )
VALUES (
        'ศูนย์กิจการสหกรณ์',
        13.74521,
        100.50234,
        'สำนักงานแนวหน้า'
    ),
    (
        'ห้องสมุด',
        13.74532,
        100.50298,
        'ห้องสมุดกลาง'
    ),
    (
        'อาคารเรียน A',
        13.74623,
        100.50145,
        'ชั้น 1-5'
    ),
    (
        'อาคารเรียน B',
        13.74689,
        100.50234,
        'ชั้น 1-6'
    ),
    (
        'โรงอาหาร',
        13.74456,
        100.50567,
        'ห้องทานอาหาร'
    );

-- ========================================
-- ข้อมูลความปลอดภัย (Security Best Practices)
-- ========================================
/*
✅ ความปลอดภัยข้อมูลที่ได้กำหนด:

1. Password Hashing:
- ใช้ bcrypt หรือ argon2 ในระดับ Backend
- ไม่เก็บ plain-text password

2. Image Processing Security:
- ห้ามเก็บ Email/Phone ในตาราง images (Critical ⚠️)
- เก็บเฉพาะ file_path, coordinates, file_size
- Data scrubbing ที่ Backend ก่อนบันทึก

3. Privacy Controls:
- is_staff_only flag สำหรับปัญหาส่วนตัวของบุคลากร
- is_anonymous option สำหรับนิสิตที่ต้องการความเป็นส่วนตัว

4. Audit Trail:
- audit_logs ตรวจสอบการเข้าถึงข้อมูล

5. Role-Based Access Control:
- Admin เข้าถึง analytics/admin dashboard
- Staff เข้าถึง staff_only posts
- Student เข้าถึงข้อมูลสาธารณะเท่านั้น

6. Toxic Content Flagging:
- is_toxic_flagged สำหรับ users
- is_ai_generated_spam สำหรับ problems
- toxicity_score from NLP analysis
*/

-- ========================================
-- ข้อมูลจำลองสำหรับทดสอบระบบ (Mock Data)
-- ========================================
INSERT IGNORE INTO users (
    id,
    role_id,
    email,
    password_hash,
    is_verified,
    is_active
)
VALUES (
        1,
        1,
        'test@up.ac.th',
        'hashed_password',
        true,
        true
    );