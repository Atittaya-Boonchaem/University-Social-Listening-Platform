import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function TrackingPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getCategoryColor = (reportCategory: string) => {
    // Add debugging log inside the helper
    console.log("Trying to match report category:", reportCategory);
    
    const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
      'ซ่อมบำรุงสถานที่': '#EF4444',
      'ความปลอดภัย': '#EAB308',
      'ความสะอาด': '#22C55E',
      'ไอทีและเครือข่าย': '#3B82F6',
      'การเรียนการสอน': '#8B5CF6'
    };
    
    const cat = categories.find(c => 
      c.category_name === reportCategory || 
      c.name === reportCategory ||
      String(c.id) === String(reportCategory) || 
      String(c.category_id) === String(reportCategory)
    );
    
    console.log("Matched Category Object:", cat);
    
    return cat?.color || DEFAULT_CATEGORY_COLORS[reportCategory] || '#94a3b8';
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem('access_token');
        let userId = localStorage.getItem('user_id') || localStorage.getItem('id');
        if (userId === 'undefined' || userId === 'null') userId = null;
        
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        // Fetch personal reports if token is present, otherwise fallback to public problems list
        const url = token 
          ? `${API_BASE}/problems/my-problems` 
          : `${API_BASE}/problems/list`;
          
        const [res, catRes] = await Promise.all([
          axios.get(url, { headers }),
          axios.get(`${API_BASE}/problems/categories`)
        ]);

        console.log("API Response (Problems):", res.data);
        console.log("Current Local userId:", userId);

        let items = [];
        if (Array.isArray(res.data)) items = res.data;
        else if (res.data?.data && Array.isArray(res.data.data)) items = res.data.data;
        else if (res.data?.data?.items && Array.isArray(res.data.data.items)) items = res.data.data.items;
        else if (res.data?.items && Array.isArray(res.data.items)) items = res.data.items;
        const catItems = catRes.data?.data?.items || catRes.data?.items || catRes.data || [];
        
        // Exact replica of MasterDataSettings color assignment logic
        catItems.sort((a: any, b: any) => (a.category_id || a.id || 0) - (b.category_id || b.id || 0));
        const mockColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
        catItems.forEach((c: any, i: number) => c.color = c.color || mockColors[i % mockColors.length]);
        
        setCategories(catItems);
        
        console.log("Master Categories from Backend:", catItems);
        console.log("FIRST REPORT OBJECT FROM API:", items[0]);

        const mappedReports = items.map((p: any) => {
          let step = 1;
          const s = p.status_name || p.status;
          if (s === 'IN_PROGRESS' || s === 'กำลังดำเนินการ') step = 3;
          else if (s === 'RESOLVED' || s === 'CLOSED' || s === 'เสร็จสิ้น') step = 4;
          else if (s === 'OPEN' || s === 'รับเรื่องแล้ว' || s === 'รับเรื่อง') step = 1; 
          
          return {
            id: `AP-${p.id}`,
            realId: p.id,
            ticketIdStr: p.ticket_id || (p.ticket_prefix ? `${p.ticket_prefix}-${new Date(p.created_at).getFullYear().toString().slice(-2)}-${String(p.id).padStart(4, '0')}` : `Ticket #${p.id}`),
            category: p.category_name || p.category?.name || p.category?.category_name || 'ไม่ระบุ',
            categoryId: p.category_id || p.category?.id || p.category?.category_id || 0,
            // Color is now resolved via getCategoryColor during render
            description: p.description || p.content || p.title || 'ไม่มีรายละเอียด',
            location: p.building_name || null,
            images: (() => {
              const parseUrl = (u: string) => {
                if (!u) return '';
                if (u.startsWith('http')) return u;
                return `${import.meta.env.VITE_BASE_URL || 'http://localhost:8000'}${u.startsWith('/') ? '' : '/'}${u}`;
              };
              if (p.attachments && p.attachments.length > 0) {
                return p.attachments.map((att: any) => parseUrl(att.file_url || att.url));
              }
              if (p.images) {
                return p.images.map((img: any) => parseUrl(img.image_url));
              }
              return [];
            })(),
            date: new Date(p.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
            statusStep: step,
            adminReply: p.admin_reply || null,
            authorId: p.user_id || p.author?.user_id || p.author_id
          };
        });
        
        console.log("Mapped Reports:", mappedReports);

        // BYPASS USER FILTERING: Show ALL reports in the database regardless of the authorId
        const filteredReports = mappedReports;
          
        console.log("Filtered Reports to Show:", filteredReports);

        setReports(filteredReports);
      } catch (err) {
        console.error('Failed to fetch reports', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* Task 1: Header */}
      <div className="bg-white px-6 py-8 shadow-sm border-b border-slate-100">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#2B164D] mb-1">รายงานของฉัน</h1>
            <p className="text-sm text-slate-500">ติดตามและจัดการการแจ้งความเห็นและรายงานปัญหาที่คุณส่งเข้าระบบ</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
              กรอง
            </button>
            <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path></svg>
              เรียงลำดับ
            </button>
          </div>
        </div>
      </div>

      {/* Report Cards */}
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {isLoading ? (
          <div className="text-center text-slate-500 py-10">กำลังโหลดข้อมูล...</div>
        ) : reports.length === 0 ? (
          <div className="text-center text-slate-500 py-10">ยังไม่มีรายงานปัญหาของคุณ</div>
        ) : reports.map((report: any) => (
          <ReportCard 
            key={report.id} 
            report={report} 
            getCategoryColor={getCategoryColor}
            onDelete={(id: number) => {
              setReports(prev => prev.filter(r => r.realId !== id));
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ReportCard({ report, getCategoryColor, onDelete }: any) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentUserId = localStorage.getItem('user_id') ? Number(localStorage.getItem('user_id')) : null;
  const isOwn = currentUserId !== null && report.authorId === currentUserId;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบโพสต์นี้? (ข้อมูลในระบบจะไม่สูญหาย)')) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/problems/${report.realId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.data.success) {
        onDelete(report.realId);
      } else {
        alert(res.data.message || 'เกิดข้อผิดพลาดในการลบโพสต์');
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถลบโพสต์ได้');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (isExpanded && !aiAnalysis && !isAiLoading) {
      setIsAiLoading(true);
      axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/problems/${report.realId}/ai-analysis`)
        .then(res => {
           if(res.data?.success) setAiAnalysis(res.data.data);
        })
        .catch(err => console.error(err))
        .finally(() => setIsAiLoading(false));
    }
  }, [isExpanded, report.realId]);
  
  // Custom status descriptions
  const statuses = [
    { title: 'รับเรื่องเข้าสู่ระบบ', desc: 'ระบบทำการวิเคราะห์เนื้อหาและจัดหมวดหมู่เสร็จสิ้นเรียบร้อยแล้ว' },
    { title: 'รวบรวมและวิเคราะห์ปัญหา', desc: 'พบเหตุการณ์ที่คล้ายคลึงกันในระบบ' },
    { title: 'แจ้งหน่วยงานที่เกี่ยวข้อง', desc: 'อยู่ระหว่างรอการดำเนินการจากเจ้าหน้าที่' },
    { title: 'ดำเนินการแก้ไข', desc: 'ดำเนินการแก้ไขเรียบร้อยรอการยืนยันการแก้ไข' }
  ];

  const currentStep = report.statusStep || 1; // 1 to 4

  const getBadgeStyle = () => {
    if (currentStep === 1) return 'bg-pink-100 text-pink-600';
    if (currentStep === 4) return 'bg-emerald-100 text-emerald-600';
    return 'bg-purple-100 text-[#2B164D]';
  };
  
  const getBadgeText = () => {
    if (currentStep === 1) return 'รอดำเนินการยืนยัน';
    if (currentStep === 4) return 'เสร็จสิ้น';
    return 'กำลังดำเนินการ';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Top Header Section */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 cursor-pointer hover:bg-slate-50 transition-colors"
      >
        <div className="flex justify-between items-start mb-4">
          <span className={`px-3 py-1.5 text-xs font-bold rounded-full ${getBadgeStyle()}`}>
            {getBadgeText()}
          </span>
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg"
            style={{ 
              backgroundColor: `${getCategoryColor(report.category)}20`, 
              color: getCategoryColor(report.category) 
            }}
          >
             {report.categoryId > 0 ? String(report.categoryId).padStart(2, '0') : '-'}
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-slate-800 font-bold text-lg mb-1">{report.ticketIdStr}</h3>
          <p className="text-slate-500 text-xs font-medium">ส่งเมื่อ: {report.date}</p>
        </div>

        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex items-start gap-2">
           <span className="text-slate-700 font-semibold text-sm whitespace-nowrap">หัวข้อ:</span>
           <p className="text-slate-600 text-sm line-clamp-2">{report.description}</p>
        </div>
      </div>

      <div className={`transition-all duration-300 ease-in-out border-t border-slate-100 bg-white ${isExpanded ? 'max-h-[1500px] opacity-100' : 'max-h-0 opacity-0 border-transparent overflow-hidden'}`}>
        <div className="p-6">
          
          {/* AI Insights Panel */}
          <div className="mb-6 p-4 rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-50 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-violet-200/40 to-fuchsia-200/40 rounded-bl-full -z-0"></div>
            <h4 className="flex items-center gap-2 text-violet-800 font-bold text-sm mb-3 relative z-10">
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              ✨ AI วิเคราะห์โพสต์ของคุณ
            </h4>
            
            {isAiLoading ? (
              <div className="flex items-center gap-2 text-violet-600/70 text-xs font-medium py-2">
                <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                กำลังให้ AI วิเคราะห์ข้อมูล...
              </div>
            ) : aiAnalysis ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative z-10">
                <div className="bg-white/80 rounded-lg p-3 border border-violet-100/50">
                  <div className="text-[10px] text-violet-500 font-semibold mb-1 uppercase tracking-wide">หมวดหมู่ที่คาดเดา</div>
                  <div className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-violet-400">category</span>
                    {aiAnalysis.ai_predicted_category}
                  </div>
                </div>
                <div className="bg-white/80 rounded-lg p-3 border border-violet-100/50">
                  <div className="text-[10px] text-violet-500 font-semibold mb-1 uppercase tracking-wide">พิกัดสถานที่</div>
                  <div className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-violet-400">location_on</span>
                    {aiAnalysis.latitude && aiAnalysis.longitude ? `${Number(aiAnalysis.latitude).toFixed(4)}, ${Number(aiAnalysis.longitude).toFixed(4)}` : 'ไม่ระบุ'}
                  </div>
                </div>
                <div className="bg-white/80 rounded-lg p-3 border border-violet-100/50">
                  <div className="text-[10px] text-violet-500 font-semibold mb-1 uppercase tracking-wide">ความซ้ำซ้อน</div>
                  <div className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-violet-400">content_copy</span>
                    ตรวจพบปัญหาคล้ายกัน <span className="text-rose-500">{aiAnalysis.similar_posts_count}</span> รายการ
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">ไม่สามารถวิเคราะห์ข้อมูลได้</div>
            )}
          </div>

          <h4 className="text-slate-800 font-bold text-sm mb-6">ไทม์ไลน์การดำเนินงาน</h4>
          
          <div className="relative pl-1">
            {statuses.map((status, index) => {
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
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
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
                      
                      {/* Sub-tags for step 2 */}
                      {index === 1 && !isPending && (
                        <div className="flex gap-2 mt-2">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded font-medium">#{report.category}</span>
                        </div>
                      )}

                      {/* Admin Reply for step 3 */}
                      {isCurrent && index === 2 && report.adminReply && (
                        <div className="mt-3 bg-slate-50 border-l-2 border-yellow-400 p-3 text-xs text-slate-600">
                          {report.adminReply}
                        </div>
                      )}
                      
                      {!isPending && (
                        <div className="text-xs text-slate-400 mt-2 font-medium">{report.date}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <hr className="border-slate-100 my-6" />

          {/* Details */}
          <div className="space-y-4">
            {report.location && (
              <div className="flex items-start gap-2 text-slate-700">
                <svg className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <div>
                  <h3 className="text-xs font-bold text-slate-600">สถานที่</h3>
                  <p className="text-xs text-slate-500">{report.location}</p>
                </div>
              </div>
            )}

            {report.images && report.images.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-600 mb-2">รูปภาพ</h3>
                <div className={`grid gap-2 ${report.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {report.images.map((img: any, idx: number) => (
                    <img key={idx} src={img} alt="report attachment" className="w-full h-32 object-cover rounded-lg border border-slate-200" />
                  ))}
                </div>
              </div>
            )}

            {isOwn && (
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  {isDeleting ? 'กำลังลบ...' : 'ลบโพสต์นี้'}
                </button>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
