import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000/api/v1';

// Map faculty name → faculty_id (must match backend data)
const FACULTY_OPTIONS = [
  { id: 1,  label: 'คณะเทคโนโลยีสารสนเทศและการสื่อสาร' },
  { id: 2,  label: 'คณะวิศวกรรมศาสตร์' },
  { id: 3,  label: 'คณะวิทยาศาสตร์' },
  { id: 4,  label: 'คณะแพทยศาสตร์' },
  { id: 5,  label: 'คณะศิลปศาสตร์' },
  { id: 6,  label: 'คณะบริหารธุรกิจและนิเทศศาสตร์' },
  { id: 7,  label: 'คณะนิติศาสตร์' },
  { id: 8,  label: 'คณะสหเวชศาสตร์และสาธารณสุขศาสตร์' },
  { id: 9,  label: 'คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ' },
  { id: 10, label: 'คณะทันตแพทยศาสตร์' },
  { id: 11, label: 'คณะสถาปัตยกรรมศาสตร์และศิลปกรรมศาสตร์' },
  { id: 12, label: 'คณะพยาบาลศาสตร์' },
  { id: 13, label: 'คณะเภสัชศาสตร์' },
  { id: 14, label: 'วิทยาลัยการศึกษา' },
];

const EDUCATION_LEVEL: Record<string, number> = {
  bachelor: 1,
  master: 2,
  doctorate: 3,
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const type = queryParams.get('type') || 'student'; // 'student' or 'staff'
  const isStaff = type === 'staff';

  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [formData, setFormData] = useState({
    faculty_id: '',
    degree: '',
    age: '',
    gender: '',
    student_prefix: '',
    privacy: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    
    try {
      const token = localStorage.getItem('access_token');
      const payload: Record<string, any> = {
        age: formData.age,
        gender: formData.gender,
      };
      if (!isStaff) {
        payload.faculty_id = formData.faculty_id ? Number(formData.faculty_id) : null;
        payload.education_level = formData.degree ? EDUCATION_LEVEL[formData.degree] ?? null : null;
        payload.student_prefix = formData.student_prefix.slice(0, 2);
      }

      await axios.post(`${API_BASE}/users/me/onboarding`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Cache for profile display
      if (!isStaff) {
        localStorage.setItem('faculty_id', formData.faculty_id);
        localStorage.setItem('education_level', formData.degree);
        localStorage.setItem('student_prefix', formData.student_prefix.slice(0, 2));
      }
      localStorage.setItem('age', formData.age);
      localStorage.setItem('gender', formData.gender);

      setShowToast(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.response?.data?.detail || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col text-on-surface bg-surface font-body-md">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-mobile h-16 bg-surface-container-low shadow-sm transition-colors duration-200 ease-in-out md:px-margin-desktop">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl">hub</span>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary">UP Connect</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 rounded-full hover:bg-surface-variant/50 transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">search</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow pt-24 pb-12 px-margin-mobile md:px-0 flex flex-col items-center">
        {/* Welcome Section */}
        <div className="max-w-xl w-full text-center mb-stack-lg">
          <h2 className="font-headline-lg text-headline-lg text-primary mb-2">
            {isStaff ? 'ยินดีต้อนรับบุคลากรใหม่' : 'ยินดีต้อนรับนิสิตใหม่'}
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">กรุณากรอกข้อมูลส่วนตัวเพื่อเริ่มต้นการใช้งานระบบเป็นครั้งแรก</p>
        </div>

        {/* Onboarding Form Container */}
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-gutter">
          
          {/* Left Info Card */}
          <div className="md:col-span-5 relative overflow-hidden rounded-xl h-full min-h-[300px] shadow-sm">
            <div 
              className="absolute inset-0 z-0 bg-cover bg-center" 
              style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCzAkP2BoaRBJLfyBXHmpfCISB531QLCO-9WEjXsuPPxRfbybM-YKMEPp80kWBg8tVQm_O9eFfUd0p6ijvwAoVEYFR6MQL6Fop28LTJESRUyV9YyTppUDhYsXbGPAHJtNwwaNh9QlvwlnOnMv9sd8EYyc-NsULw1SMkKjg1x_HJPgzCq6LuNoGTetcTuVj63xV8kOOIDjOOJY4Er5-iHokrkcJj7Cso_kA4nCXot-xs_ViGEvGLZru4XvEvHcpPmRWVz7TJiKXjCyLj')" }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent z-10 flex flex-col justify-end p-8 text-white">
              <span className="bg-tertiary-container text-on-tertiary-container px-3 py-1 rounded-full text-label-sm font-label-sm w-fit mb-4">
                สถานะ: {isStaff ? 'บุคลากร' : 'นิสิตใหม่'}
              </span>
              <h3 className="font-headline-md text-headline-md mb-2">เริ่มต้นเส้นทางของคุณ</h3>
              <p className="font-body-md opacity-90">
                {isStaff 
                  ? 'ข้อมูลของคุณจะถูกใช้เพื่อแนะนำบริการและระบบต่างๆ ที่ตรงกับความต้องการของบุคลากร'
                  : 'ข้อมูลของคุณจะถูกใช้เพื่อแนะนำกิจกรรม และบริการที่ตรงกับความต้องการของคณะและระดับการศึกษาของคุณ'
                }
              </p>
            </div>
          </div>

          {/* Form Content Card */}
          <div className="md:col-span-7 bg-white/80 backdrop-blur-md border border-[#cdc3d4]/30 p-8 rounded-xl shadow-sm">
            <form className="space-y-stack-md" onSubmit={handleSubmit}>
              
              {/* Faculty Selection */}
              {!isStaff && (
                <div className="flex flex-col gap-2">
                  <label className="font-label-sm text-label-sm text-primary flex items-center gap-2" htmlFor="faculty">
                    <span className="material-symbols-outlined text-sm">school</span> คณะ / วิทยาลัย
                  </label>
                  <div className="relative">
                    <select 
                      id="faculty" 
                      required={!isStaff}
                      value={formData.faculty_id}
                      onChange={(e) => setFormData({...formData, faculty_id: e.target.value})}
                      className="w-full bg-surface-container-low border-0 rounded-lg p-4 font-body-md text-on-surface appearance-none focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    >
                      <option disabled value="">เลือกคณะที่สังกัด</option>
                      {FACULTY_OPTIONS.map(f => (
                        <option key={f.id} value={String(f.id)}>{f.label}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
                  </div>
                </div>
              )}

              {/* Student Prefix (2-digit year code) */}
              {!isStaff && (
                <div className="flex flex-col gap-2">
                  <label className="font-label-sm text-label-sm text-primary flex items-center gap-2" htmlFor="student_prefix">
                    <span className="material-symbols-outlined text-sm">badge</span> 2 หลักแรกของรหัสนิสิต (ปีที่เข้า)
                  </label>
                  <input
                    id="student_prefix"
                    type="text"
                    maxLength={2}
                    pattern="[0-9]{2}"
                    required={!isStaff}
                    placeholder="เช่น 66"
                    value={formData.student_prefix}
                    onChange={(e) => setFormData({...formData, student_prefix: e.target.value.replace(/\D/g, '')})}
                    className="w-full bg-surface-container-low border-0 rounded-lg p-4 font-body-md text-on-surface focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  />
                </div>
              )}

              {/* Row: Education Level & Age */}
              <div className={`grid grid-cols-1 gap-gutter ${isStaff ? '' : 'sm:grid-cols-2'}`}>
                {!isStaff && (
                  <div className="flex flex-col gap-2">
                    <label className="font-label-sm text-label-sm text-primary flex items-center gap-2" htmlFor="degree">
                      <span className="material-symbols-outlined text-sm">workspace_premium</span> ระดับการศึกษา
                    </label>
                    <div className="relative">
                      <select 
                        id="degree" 
                        required={!isStaff}
                        value={formData.degree}
                        onChange={(e) => setFormData({...formData, degree: e.target.value})}
                        className="w-full bg-surface-container-low border-0 rounded-lg p-4 font-body-md text-on-surface appearance-none focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                      >
                        <option disabled value="">เลือกระดับ</option>
                        <option value="bachelor">ปริญญาตรี</option>
                        <option value="master">ปริญญาโท</option>
                        <option value="doctorate">ปริญญาเอก</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col gap-2">
                  <label className="font-label-sm text-label-sm text-primary flex items-center gap-2" htmlFor="age">
                    <span className="material-symbols-outlined text-sm">calendar_today</span> อายุ
                  </label>
                  <input 
                    id="age" 
                    type="number" 
                    min="15" 
                    max="99" 
                    required 
                    placeholder="เช่น 18"
                    value={formData.age}
                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                    className="w-full bg-surface-container-low border-0 rounded-lg p-4 font-body-md text-on-surface focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Gender Selection */}
              <div className="flex flex-col gap-2">
                <label className="font-label-sm text-label-sm text-primary flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-sm">person</span> เพศ
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <label className="cursor-pointer group">
                    <input 
                      type="radio" 
                      name="gender" 
                      value="male" 
                      className="sr-only peer" 
                      required 
                      checked={formData.gender === 'male'}
                      onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    />
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface-variant peer-checked:bg-secondary-container peer-checked:text-on-secondary-container peer-checked:border-secondary transition-all">
                      <span className="material-symbols-outlined mb-1">male</span>
                      <span className="font-label-sm">ชาย</span>
                    </div>
                  </label>
                  
                  <label className="cursor-pointer group">
                    <input 
                      type="radio" 
                      name="gender" 
                      value="female" 
                      className="sr-only peer" 
                      checked={formData.gender === 'female'}
                      onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    />
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface-variant peer-checked:bg-secondary-container peer-checked:text-on-secondary-container peer-checked:border-secondary transition-all">
                      <span className="material-symbols-outlined mb-1">female</span>
                      <span className="font-label-sm">หญิง</span>
                    </div>
                  </label>

                  <label className="cursor-pointer group">
                    <input 
                      type="radio" 
                      name="gender" 
                      value="other" 
                      className="sr-only peer" 
                      checked={formData.gender === 'other'}
                      onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    />
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface-variant peer-checked:bg-secondary-container peer-checked:text-on-secondary-container peer-checked:border-secondary transition-all">
                      <span className="material-symbols-outlined mb-1">transgender</span>
                      <span className="font-label-sm">อื่นๆ</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Privacy Consent */}
              <div className="flex items-start gap-3 mt-4">
                <input 
                  type="checkbox" 
                  id="privacy" 
                  required 
                  checked={formData.privacy}
                  onChange={(e) => setFormData({...formData, privacy: e.target.checked})}
                  className="mt-1 rounded-sm border-outline text-primary focus:ring-primary" 
                />
                <label htmlFor="privacy" className="font-label-sm text-on-surface-variant leading-tight cursor-pointer">
                  ฉันยอมรับนโยบายความเป็นส่วนตัวและอนุญาตให้ระบบบันทึกข้อมูลเพื่อใช้ในการแสดงผลส่วนบุคคล
                </label>
              </div>

              {/* Error message */}
              {errorMsg && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                  ❌ {errorMsg}
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-primary text-on-primary py-4 rounded-xl font-headline-md text-headline-md shadow-md hover:opacity-90 active:scale-[0.98] disabled:opacity-70 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      <span>กำลังประมวลผล...</span>
                    </>
                  ) : (
                    <>
                      <span>บันทึกข้อมูล</span>
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Success Toast */}
        <div 
          className={`fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#2e3132] text-white py-3 px-6 rounded-full shadow-xl transition-all duration-300 pointer-events-none z-[100] flex items-center gap-3 ${
            showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <span className="material-symbols-outlined text-[#e9c349]">check_circle</span>
          <span className="font-body-md">บันทึกข้อมูลเรียบร้อยแล้ว กำลังนำท่านสู่หน้าหลัก</span>
        </div>
      </main>
    </div>
  );
}
