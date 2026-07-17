import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import type { Problem } from './HomeFeed';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const API_BASE = 'https://university-social-listening-platform.onrender.com/api/v1';

function resolveImageUrl(raw: string | null | undefined): string | null {
  if (!raw || raw.trim() === '') return null;
  if (raw.startsWith('http')) return raw;
  const cleaned = raw.replace(/^\/+/, '').replace('uploads/', 'uploads/images/').replace('images/images/', 'images/');
  return `${API_BASE.replace('/api/v1', '')}/${cleaned}`;
}

function formatDateTime(rawDate: string | null | undefined): string {
  if (!rawDate) return '';
  try {
    const dateString = rawDate.endsWith('Z') || rawDate.includes('+') ? rawDate : rawDate + 'Z';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543;
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} • ${hh}:${mm} น.`;
  } catch {
    return '';
  }
}

export default function IssueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const passedProblem = location.state?.problem as Problem | undefined;
  const [problem, setProblem] = useState<Problem | null>(passedProblem || null);
  const [isLoading, setIsLoading] = useState(!passedProblem);
  const [error, setError] = useState('');
  
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(true);

  useEffect(() => {
    setProblem(null);
    setAiAnalysis(null);
  }, [id]);

  useEffect(() => {
    if (!problem && id) {
      const fetchProblem = async () => {
        setIsLoading(true);
        try {
          const token = localStorage.getItem('access_token');
          const res = await axios.get(`${API_BASE}/problems/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (res.data.success) {
            setProblem(res.data.data.problem || res.data.data);
          } else {
            setError(res.data.message || 'ไม่พบปัญหา');
          }
        } catch (err) {
          setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        } finally {
          setIsLoading(false);
        }
      };
      fetchProblem();
    }
  }, [id, problem]);

  useEffect(() => {
    if (problem) {
      setIsAiLoading(true);
      const pid = problem.problem_id || problem.id;
      axios.get(`${API_BASE}/problems/${pid}/ai-analysis`)
        .then(res => {
           if(res.data?.success) setAiAnalysis(res.data.data);
        })
        .catch(err => console.error("AI Analysis error:", err))
        .finally(() => setIsAiLoading(false));
    }
  }, [problem]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-error mb-2">{error || 'ไม่พบข้อมูลปัญหา'}</h2>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-primary text-white rounded-lg">กลับไปหน้าแรก</button>
      </div>
    );
  }

  let rawImages: string[] = [];
  if ((problem as any).images) rawImages = (problem as any).images;
  else if ((problem as any).imageUrls) rawImages = (problem as any).imageUrls;
  else if (problem.attachments && problem.attachments.length > 0) rawImages = problem.attachments.map(a => a.file_url);
  else {
    const single = problem.image_url || problem.image || problem.photo;
    if (single) rawImages = [single];
  }
  const images = rawImages.map(url => resolveImageUrl(url)).filter(Boolean) as string[];
  const coverImage = images.length > 0 ? images[0] : 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9EVy8KvWfDiVQVe5M_kXuW7YIK-WmCe8PSb4ut-SPoXpx0Jgu8ripdiYv9iJisvg2ZCzJIxtYY_jZeeg54HAYQ7JTkH44NriNDSCZojNZ67F1BHjpsT8GFEvAXAzSbjlXK2v6KEKJg97rQwZmffDZ792WSyYl3Q3U9VIVwMM1N3LvyWzBxuHvsT0dfi6JUxbkAE6kBFjglAFqaCmBgQmvTA_a9iisH8SQxHeamlwh7l9qtHWWd45qC13c1ak5FGDLs8igCJvz-FIC';

  const isInternal = problem.visibility === 'internal' || problem.visibility_name === 'internal';

  return (
    <div className="min-h-screen bg-surface text-on-surface pb-24 font-body-md">
      <header className="fixed top-0 left-0 md:left-60 w-full md:w-[calc(100%-15rem)] z-50 flex justify-between items-center px-4 h-16 bg-surface shadow-sm">
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full hover:bg-surface-variant/50 transition-colors" onClick={() => navigate(-1)}>
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary">รายละเอียดปัญหา</h1>
        </div>
      </header>

      <main className="pt-20 px-4 max-w-2xl mx-auto space-y-6">
        {images.length > 0 && (
          <div className="relative rounded-xl overflow-hidden shadow-sm aspect-video group bg-surface-container-highest">
            <img className="w-full h-full object-cover" src={coverImage} alt={problem.title} />
            <div className="absolute top-4 right-4">
              <span className="bg-primary text-white px-3 py-1 rounded-full text-label-sm font-label-sm shadow-lg">
                {isInternal ? 'ภายใน' : 'สาธารณะ'}
              </span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl p-5 shadow-sm border border-outline-variant/30 space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-on-surface-variant text-body-md">แจ้งเมื่อ: {formatDateTime(problem.created_at)}</p>
            </div>
          </div>
          
          <p className="text-body-md text-on-surface mt-4">
            {problem.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
          </p>

          <div className="flex flex-wrap gap-2 pt-4 border-t border-surface-variant mt-4">
            <div className="flex items-center gap-1.5 bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full">
              <span className="material-symbols-outlined text-[16px]">psychology</span>
              <span className="text-label-sm">LLM Classified: {isAiLoading ? 'กำลังวิเคราะห์...' : aiAnalysis?.ai_predicted_category || problem.category?.name || 'หมวดหมู่ทั่วไป'}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full">
              <span className="material-symbols-outlined text-[16px]">location_on</span>
              <span className="text-label-sm">{problem.building_name || problem.building?.name || problem.location || (aiAnalysis?.latitude && aiAnalysis?.longitude ? `${Number(aiAnalysis.latitude).toFixed(4)}, ${Number(aiAnalysis.longitude).toFixed(4)}` : 'ไม่ระบุพิกัด')}</span>
            </div>
          </div>
        </div>


        {problem.category_name !== 'ปัญหาเกี่ยวกับการเรียน' && problem.category?.name !== 'การเรียนการสอน' && (
          <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-outline-variant/30">
            <div className="p-4 flex items-center justify-between border-b border-surface-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">map</span>
                <span className="font-headline-md text-[18px] text-on-surface">พิกัดที่เกิดเหตุ</span>
              </div>
            </div>
          
          {(problem.latitude && problem.longitude) ? (
            <div className="h-48 w-full z-0 relative">
              <MapContainer 
                center={[Number(problem.latitude), Number(problem.longitude)]} 
                zoom={16} 
                scrollWheelZoom={false} 
                style={{ height: '100%', width: '100%', zIndex: 0 }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[Number(problem.latitude), Number(problem.longitude)]} />
              </MapContainer>
            </div>
          ) : (
            <div className="h-48 w-full bg-surface-container-highest flex items-center justify-center relative">
              <span className="text-slate-400 font-medium">ไม่พบข้อมูลพิกัดแผนที่</span>
            </div>
          )}
          
            <div className="p-4 bg-surface-container-low">
              <p className="text-body-md text-on-surface">{problem.building?.name || problem.location || 'พิกัดมหาวิทยาลัยพะเยา'}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl p-6 shadow-sm border border-outline-variant/30 space-y-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">history</span>
            <h3 className="font-headline-md text-[18px] text-on-surface">ไทม์ไลน์การดำเนินงาน</h3>
          </div>
          
          <div className="relative pl-1 mt-6">
            {(() => {
               const s = (problem as any).status_name || (problem as any).status?.status_name || 'OPEN';
               let currentStep = 1;
               if (s === 'IN_PROGRESS' || s === 'กำลังดำเนินการ') currentStep = 3;
               else if (s === 'RESOLVED' || s === 'CLOSED' || s === 'เสร็จสิ้น') currentStep = 4;
               
               const statuses = [
                 { title: 'รับเรื่องเข้าสู่ระบบ', desc: 'ระบบทำการวิเคราะห์เนื้อหาและจัดหมวดหมู่เสร็จสิ้นเรียบร้อยแล้ว' },
                 { title: 'กำลังตรวจสอบข้อความในการแจ้งปัญหา', desc: 'เจ้าหน้าที่กำลังตรวจสอบและคัดกรองรายละเอียดปัญหาของคุณ' },
                 { title: 'แจ้งหน่วยงานที่เกี่ยวข้อง', desc: 'อยู่ระหว่างรอการดำเนินการจากเจ้าหน้าที่' },
                 { title: 'ดำเนินการแก้ไข', desc: 'ดำเนินการแก้ไขเรียบร้อยรอการยืนยันการแก้ไข' }
               ];

               return statuses.map((status, index) => {
                 const stepNumber = index + 1;
                 const isCompleted = stepNumber < currentStep;
                 const isCurrent = stepNumber === currentStep;
                 const isPending = stepNumber > currentStep;

                 return (
                   <div key={index} className="relative pb-8 last:pb-0">
                     {/* Vertical Line */}
                     {index < statuses.length - 1 && (
                       <div className={`absolute top-6 left-[11px] w-[2px] h-[calc(100%-16px)] ${isCompleted ? 'bg-[#2B164D]' : 'bg-slate-200'}`}></div>
                     )}
                     
                     <div className="flex gap-4 items-start">
                       {/* Circle Node */}
                       <div className="relative z-10 mt-0.5">
                         {isCompleted ? (
                           <div className="w-6 h-6 rounded-full bg-[#2B164D] flex items-center justify-center text-white shadow-sm">
                             <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'wght' 700" }}>check</span>
                           </div>
                         ) : isCurrent ? (
                           <div className="w-6 h-6 rounded-full border-2 border-[#2B164D] bg-indigo-50 flex items-center justify-center">
                             <div className="w-2.5 h-2.5 rounded-full bg-[#2B164D]"></div>
                           </div>
                         ) : (
                           <div className="w-6 h-6 rounded-full border-2 border-slate-200 bg-slate-50 flex items-center justify-center">
                             <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                           </div>
                         )}
                       </div>

                       {/* Content */}
                       <div className="flex-1 pb-2">
                         <h5 className={`text-sm font-bold ${isPending ? 'text-slate-400' : 'text-[#2B164D]'}`}>{status.title}</h5>
                         <p className={`text-xs mt-1 leading-relaxed ${isPending ? 'text-slate-400' : 'text-slate-500'}`}>{status.desc}</p>
                         
                         {index === 0 && !isPending && (
                           <div className="text-xs text-slate-400 mt-2 font-medium">{formatDateTime(problem.created_at)}</div>
                         )}
                         {index === 1 && !isPending && (
                           <div className="flex gap-2 mt-2">
                             <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded font-medium">#{aiAnalysis?.ai_predicted_category || problem.category?.name || 'หมวดหมู่ทั่วไป'}</span>
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                 );
               });
            })()}
          </div>
        </div>
      </main>
    </div>
  );
}
