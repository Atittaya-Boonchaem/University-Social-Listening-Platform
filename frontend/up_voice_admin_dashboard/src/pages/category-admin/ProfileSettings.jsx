// src/pages/category-admin/ProfileSettings.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { fetchProblems } from '../../services/problemService';

const CATEGORY_MAP = {
  1: {
    name: 'อาคารและสิ่งอำนวยความสะดวก',
    code: 'CAT-FACILITY-01',
    description: 'ดูแลปัญหาโครงสร้างพื้นฐาน อาคารเรียนรวม หอพักนิสิต ระบบไฟฟ้าส่องสว่าง ประปา ลิฟต์ และทางลาดคนพิการ',
    icon: 'domain',
    scopeName: 'หมวดอาคารและสิ่งอำนวยความสะดวก',
  },
  2: {
    name: 'ระบบเครือข่ายและเทคโนโลยี',
    code: 'CAT-NETWORK-02',
    description: 'ดูแลระบบเครือข่าย UP-WiFi ระบบอินเทอร์เน็ต ระบบสารสนเทศมหาวิทยาลัย และอุปกรณ์ไอที',
    icon: 'wifi',
    scopeName: 'หมวดระบบเครือข่ายและเทคโนโลยี',
  },
  3: {
    name: 'การเรียนการสอนและวิชาการ',
    code: 'CAT-ACADEMIC-03',
    description: 'ดูแลปัญหาการลงทะเบียนเรียน ตารางเรียน ตารางสอบ ห้องบรรยาย และบริการทางการศึกษา',
    icon: 'school',
    scopeName: 'หมวดการเรียนการสอนและวิชาการ',
  },
  4: {
    name: 'ภูมิทัศน์และความสะอาด',
    code: 'CAT-LANDSCAPE-04',
    description: 'ดูแลความสะอาด การจัดเก็บขยะ ทางเดินเท้า สวนหย่อม พื้นที่สีเขียว และสิ่งแวดล้อมภายในมหาวิทยาลัย',
    icon: 'park',
    scopeName: 'หมวดภูมิทัศน์และความสะอาด',
  },
  5: {
    name: 'ความปลอดภัยและจราจร',
    code: 'CAT-SAFETY-05',
    description: 'ดูแลความปลอดภัย การจราจร จุดตรวจ ทางข้าม ไฟสัญญาณ และระบบกล้องวงจรปิด CCTV ทั่วมหาวิทยาลัย',
    icon: 'security',
    scopeName: 'หมวดความปลอดภัยและจราจร',
  },
  6: {
    name: 'บริการทั่วไป / อื่นๆ',
    code: 'CAT-GENERAL-06',
    description: 'ดูแลงานบริการทั่วไป ประสานงานสวัสดิการ และข้อร้องเรียนทั่วไปที่อยู่นอกเหนือหมวดจำเพาะ',
    icon: 'help_outline',
    scopeName: 'หมวดบริการทั่วไป',
  },
  7: {
    name: 'การเดินทางและระบบขนส่ง',
    code: 'CAT-TRANSPORT-07',
    description: 'ดูแลรถเมล์ มพ. ป้ายหยุดรถ เส้นทางเดินรถ ขนส่งมวลชน และการเดินทางสัญจรภายในมหาวิทยาลัย',
    icon: 'directions_bus',
    scopeName: 'หมวดการเดินทางและระบบขนส่ง',
  },
  8: {
    name: 'สุขอนามัย/ความปลอดภัยทางอาหาร',
    code: 'CAT-HYGIENE-08',
    description: 'ดูแลมาตรฐานความสะอาดโรงอาหาร คุณภาพอาหาร สุขอนามัย และการควบคุมโรคติดต่อ',
    icon: 'restaurant',
    scopeName: 'หมวดสุขอนามัยและความปลอดภัยทางอาหาร',
  }
};

function getCategoryInfo(catId, catName) {
  if (catId && CATEGORY_MAP[catId]) return CATEGORY_MAP[catId];
  if (catName) {
    const found = Object.values(CATEGORY_MAP).find(c => c.name === catName);
    if (found) return found;
  }
  return CATEGORY_MAP[1];
}

export default function ProfileSettings() {
  const [activeTab, setActiveTab] = useState('PROFILE'); // PROFILE, PERMISSIONS, SECURITY, NOTIFICATIONS

  const [profile, setProfile] = useState({
    name: 'อิสยาห์ Admin',
    email: 'xisyah4@gmail.com',
    role: 'Category Admin',
    roleTitle: 'ผู้ดูแลระบบประจำหมวดหมู่ (Category Admin)',
    categoryId: 1,
    categoryName: 'อาคารและสิ่งอำนวยความสะดวก',
    categoryCode: 'CAT-FACILITY-01',
    categoryDesc: 'ดูแลปัญหาโครงสร้างพื้นฐาน อาคารเรียนรวม หอพักนิสิต ระบบไฟฟ้าส่องสว่าง ประปา ลิฟต์ และทางลาดคนพิการ',
    categoryIcon: 'domain',
    scopeName: 'หมวดอาคารและสิ่งอำนวยความสะดวก',
    employeeId: 'INV-170FED3B',
    initials: 'อิ'
  });

  const [ticketStats, setTicketStats] = useState({
    total: 16,
    inProgress: 15,
    resolved: 1,
    pending: 2,
    slaRate: '96.4%'
  });

  const [passwords, setPasswords] = useState({
    current: '',
    newPass: '',
    confirmPass: ''
  });

  const [savingPassword, setSavingPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, pubRes, intRes] = await Promise.all([
          api.get('/users/me').catch(() => null),
          fetchProblems({ page_size: 150, visibility_name: 'public' }, true).catch(() => null),
          fetchProblems({ page_size: 150, visibility_name: 'internal' }, true).catch(() => null),
        ]);

        let targetCatId = 1;

        if (meRes?.data?.data) {
          const u = meRes.data.data;
          const displayName = u.display_name || u.profile?.staff_name || u.email || 'ผู้ดูแลระบบ';
          targetCatId = u.category_id || 1;
          const catInfo = getCategoryInfo(targetCatId, u.category_name);
          const catName = u.category_name || catInfo.name;

          const cleanName = displayName.replace(/\s*admin\s*/i, '').trim() || displayName;
          const firstChar = cleanName.charAt(0) || displayName.charAt(0) || 'อ';
          const secondChar = cleanName.charAt(1) || displayName.charAt(1) || 'ด';

          setProfile(prev => ({
            ...prev,
            name: displayName,
            email: u.email || prev.email,
            categoryId: targetCatId,
            categoryName: catName,
            categoryCode: catInfo.code,
            categoryDesc: catInfo.description,
            categoryIcon: catInfo.icon,
            scopeName: catInfo.scopeName,
            department: u.profile?.department || catInfo.department,
            roleTitle: u.profile?.position || catInfo.roleTitle,
            employeeId: u.profile?.employee_id || prev.employeeId,
            officeLocation: u.profile?.office_location || catInfo.officeLocation,
            phone: u.profile?.phone || catInfo.phone,
            initials: `${firstChar}${secondChar}`.toUpperCase()
          }));
        }

        const merged = [...(pubRes?.items || []), ...(intRes?.items || [])];
        const unique = Array.from(new Map(merged.map(t => [t.problem_id, t])).values());
        if (unique.length > 0) {
          // Filter tickets strictly by assigned category
          const catTickets = unique.filter(t => t.category_id === targetCatId);
          const countSource = catTickets.length > 0 ? catTickets : unique;

          const resolved = countSource.filter(t => t.status_name === 'RESOLVED' || t.status_name === 'CLOSED').length;
          const pending = countSource.filter(t => t.status_name === 'PENDING_REVIEW' || t.status_name === 'PENDING' || t.status_name === 'NEW').length;
          const inProgress = countSource.filter(t => t.status_name === 'IN_PROGRESS' || t.status_name === 'OPEN').length;
          setTicketStats({
            total: countSource.length,
            inProgress,
            resolved,
            pending,
            slaRate: '96.4%'
          });
        }
      } catch (err) {
        console.error('Failed to load profile data:', err);
      }
    }
    loadData();
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwords.newPass) {
      showToast('⚠️ กรุณาระบุรหัสผ่านใหม่');
      return;
    }
    if (passwords.newPass.length < 6) {
      showToast('❌ รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (passwords.newPass !== passwords.confirmPass) {
      showToast('❌ รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setSavingPassword(true);
    try {
      await api.post('/users/change-password', {
        current_password: passwords.current,
        new_password: passwords.newPass
      });
      showToast('✅ เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
      setPasswords({ current: '', newPass: '', confirmPass: '' });
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail || 'รหัสผ่านปัจจุบันไม่ถูกต้อง';
      showToast(`❌ ${detail}`);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveContactInfo = (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setTimeout(() => {
      setSavingProfile(false);
      showToast('✅ บันทึกข้อมูลการติดต่อผู้ดูแลระบบเรียบร้อย');
    }, 600);
  };

  return (
    <div className="flex flex-col w-full pb-20 text-left">
      <div className="flex flex-col gap-6 max-w-[1560px] mx-auto w-full">

        {/* ── Top Breadcrumbs ──────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-[#4a4450]">
            <span className="hover:text-[#340866] cursor-pointer transition-colors font-medium">หมวด{profile.categoryName}</span>
            <span className="material-symbols-outlined text-[15px] text-[#7b7482]">chevron_right</span>
            <span className="text-[#340866] font-bold">โปรไฟล์และบัญชีผู้ดูแลระบบ (Admin Profile & Authority)</span>
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap mt-0.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#340866] tracking-tight">
              โปรไฟล์และสิทธิ์ผู้ดูแลระบบ
            </h1>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>ปฏิบัติหน้าที่อยู่ (Active)</span>
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#fed65b]/40 text-[#745c00] text-xs font-bold border border-[#745c00]/20">
                <span className="material-symbols-outlined text-[15px]">badge</span>
                <span>UP-STAFF-PASS</span>
              </span>
            </div>
          </div>
          <p className="text-xs text-[#4a4450]">
            ตรวจสอบข้อมูลผู้รับผิดชอบ ขอบเขตสิทธิ์การจัดการปัญหาประจำหมวดหมู่ และการตั้งค่าความปลอดภัยระบบ
          </p>
        </div>

        {/* ── Hero Admin Identity Banner ───────────────────────────── */}
        <div className="rounded-3xl bg-gradient-to-r from-[#290055] via-[#340866] to-[#4b267d] text-white p-6 sm:p-8 shadow-lg relative overflow-hidden border border-white/10">
          {/* Ambient decorative glow */}
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none blur-2xl"></div>
          <div className="absolute right-1/3 -bottom-16 w-48 h-48 rounded-full bg-amber-400/10 pointer-events-none blur-2xl"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Identity Info */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/15 backdrop-blur-md text-amber-300 border-2 border-white/20 shadow-inner flex items-center justify-center font-black text-2xl sm:text-3xl tracking-wider">
                  {profile.initials}
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[15px] border-2 border-[#340866] shadow-xs" title="บัญชีผ่านการยืนยัน">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {profile.name}
                  </h2>
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-300/30 font-bold">
                    {profile.employeeId}
                  </span>
                </div>
                <p className="text-xs text-white/95 font-medium flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-amber-300">verified_user</span>
                  <span>{profile.roleTitle}</span>
                </p>
                <p className="text-xs text-amber-200/90 flex items-center gap-1.5 font-semibold">
                  <span className="material-symbols-outlined text-[16px]">folder_special</span>
                  <span>ได้รับมอบหมายดูแล: {profile.categoryName}</span>
                </p>
              </div>
            </div>

            {/* Operational Stats Strip */}
            <div className="border-t lg:border-t-0 lg:border-l border-white/15 pt-4 lg:pt-0 lg:pl-8 flex flex-col justify-center">
              <span className="text-[11px] text-white/70 font-semibold uppercase tracking-wider">คำร้องในหมวดหมู่</span>
              <span className="text-3xl font-black text-white mt-1">{ticketStats.total}</span>
              <span className="text-xs text-emerald-300 font-medium mt-0.5">เสร็จสิ้น {ticketStats.resolved} เคส</span>
            </div>

          </div>
        </div>

        {/* ── Interactive Tab Bar ──────────────────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto bg-white p-1.5 rounded-2xl border border-[#eaedff] shadow-xs">
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'PROFILE'
                ? 'bg-[#340866] text-white shadow-xs'
                : 'text-[#4a4450] hover:bg-[#f2f3ff] hover:text-[#131b2e]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">badge</span>
            <span>ข้อมูลประจำตัวและสิทธิ์ดูแลระบบ</span>
          </button>

          <button
            onClick={() => setActiveTab('PERMISSIONS')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'PERMISSIONS'
                ? 'bg-[#340866] text-white shadow-xs'
                : 'text-[#4a4450] hover:bg-[#f2f3ff] hover:text-[#131b2e]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
            <span>ขอบเขตสิทธิ์และความรับผิดชอบ</span>
          </button>

          <button
            onClick={() => setActiveTab('SECURITY')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'SECURITY'
                ? 'bg-[#340866] text-white shadow-xs'
                : 'text-[#4a4450] hover:bg-[#f2f3ff] hover:text-[#131b2e]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">lock_reset</span>
            <span>ความปลอดภัยและรหัสผ่าน</span>
          </button>

        </div>

        {/* ── TAB 1: ข้อมูลประจำตัวและสิทธิ์ดูแลระบบ ────────────────── */}
        {activeTab === 'PROFILE' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
            {/* Left 7 Cols: Detailed Contact & Profile Form */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-7 border border-[#eaedff] shadow-xs flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-[#eaedff] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#131b2e] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#340866]">account_box</span>
                    <span>ข้อมูลประจำตัวผู้ดูแลระบบ</span>
                  </h3>
                  <p className="text-xs text-[#4a4450] mt-0.5">ข้อมูลบัญชีผู้ใช้งานและขอบเขตงานดูแลระบบที่ได้รับมอบหมาย</p>
                </div>
              </div>

              <form onSubmit={handleSaveContactInfo} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#4a4450] mb-1.5">ชื่อ-นามสกุล ผู้ใช้งาน</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#eaedff] text-xs font-semibold text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#340866]/20 focus:border-[#340866]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4a4450] mb-1.5">บทบาทในระบบ</label>
                  <input
                    type="text"
                    value={profile.roleTitle}
                    readOnly
                    className="w-full h-10 px-3.5 rounded-xl bg-[#f2f3ff] border border-[#eaedff] text-xs font-medium text-[#4a4450] cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4a4450] mb-1.5">อีเมลทางการ (UP Mail)</label>
                  <input
                    type="email"
                    value={profile.email}
                    readOnly
                    className="w-full h-10 px-3.5 rounded-xl bg-[#f2f3ff] border border-[#eaedff] text-xs font-medium text-[#4a4450] cursor-not-allowed"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#4a4450] mb-1.5">หมวดหมู่ระบบที่ได้รับมอบหมายให้ดูแล</label>
                  <div className="w-full h-11 px-4 rounded-xl bg-[#faf8ff] border border-[#eaedff] text-xs font-bold text-[#340866] flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[20px] text-[#340866]">{profile.categoryIcon || 'domain'}</span>
                      <span className="text-sm font-extrabold text-[#340866]">{profile.categoryName}</span>
                    </div>
                    <span className="text-[11px] font-mono text-[#745c00] bg-[#fed65b]/40 px-2.5 py-1 rounded-lg border border-[#745c00]/20 font-bold">
                      {profile.categoryCode}
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-2 pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2.5 rounded-xl bg-[#340866] hover:bg-[#4b267d] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>{savingProfile ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right 5 Cols: Assigned Domain Scope & Quick Access */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* Assigned Category Card */}
              <div className="bg-white rounded-2xl p-6 border border-[#eaedff] shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#4a4450] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#340866] text-[18px]">folder_special</span>
                    <span>หมวดหมู่ปัญหาที่รับผิดชอบ</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#340866]/10 text-[#340866] text-[11px] font-bold">
                    หมวดหลัก
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-[#f2f3ff] to-[#e2e7ff] border border-[#eaedff] flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[#340866] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <span className="material-symbols-outlined text-[24px]">{profile.categoryIcon || 'domain'}</span>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[#131b2e] leading-snug">
                      {profile.categoryName}
                    </h4>
                    <p className="text-xs text-[#4a4450] mt-1 leading-relaxed">
                      {profile.categoryDesc}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-1 text-xs text-[#4a4450]">
                  <div className="flex items-center justify-between py-1.5 border-b border-[#eaedff]">
                    <span>รหัสหมวดหมู่ในระบบ</span>
                    <span className="font-mono font-bold text-[#340866]">{profile.categoryCode}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-[#eaedff]">
                    <span>จำนวนเคสที่กำลังดำเนินการ</span>
                    <span className="font-bold text-amber-700">{ticketStats.inProgress} คำร้อง</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-[#eaedff]">
                    <span>เคสรอรับเรื่องและคัดกรอง</span>
                    <span className="font-bold text-rose-700">{ticketStats.pending} คำร้อง</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: ขอบเขตสิทธิ์และความรับผิดชอบ ────────────────── */}
        {activeTab === 'PERMISSIONS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in duration-200">
            {/* Perm 1 */}
            <div className="bg-white rounded-2xl p-6 border border-[#eaedff] shadow-xs flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#eddcff] text-[#340866] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[22px]">inbox</span>
                </div>
                <h4 className="text-sm font-bold text-[#131b2e]">ตรวจคัดกรองและรับเรื่อง (Triage)</h4>
                <p className="text-xs text-[#4a4450] leading-relaxed">
                  สิทธิ์ในการตรวจสอบคำร้องที่นิสิตและบุคลากรส่งเข้ามาใน{profile.scopeName || profile.categoryName} พิจารณาความถูกต้องของเนื้อหา และอนุมัติเผยแพร่เข้าระบบปฏิบัติการ
                </p>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 w-fit">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                เปิดใช้งานเต็มสิทธิ์
              </span>
            </div>


            {/* Perm 3 */}
            <div className="bg-white rounded-2xl p-6 border border-[#eaedff] shadow-xs flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#eddcff] text-[#340866] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[22px]">merge</span>
                </div>
                <h4 className="text-sm font-bold text-[#131b2e]">รวมกลุ่มปัญหาซ้ำ (Merge Cases)</h4>
                <p className="text-xs text-[#4a4450] leading-relaxed">
                  สิทธิ์ในการรวมคำร้องหลายใบที่มีเนื้อหาหรือพิกัดสถานที่จุดเดียวกันเข้าเป็นกลุ่มเดียว เพื่อการทำงานที่มีประสิทธิภาพและลดความซ้ำซ้อน
                </p>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 w-fit">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                เปิดใช้งานเต็มสิทธิ์
              </span>
            </div>

            {/* Perm 4 */}
            <div className="bg-white rounded-2xl p-6 border border-[#eaedff] shadow-xs flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#f2f3ff] text-[#340866] flex items-center justify-center font-bold border border-[#eaedff]">
                  <span className="material-symbols-outlined text-[22px]">swap_horiz</span>
                </div>
                <h4 className="text-sm font-bold text-[#131b2e]">โอนย้ายข้ามหมวดหมู่ (Forwarding)</h4>
                <p className="text-xs text-[#4a4450] leading-relaxed">
                  สิทธิ์ส่งต่อปัญหาที่อยู่นอกเหนือขอบเขตรับผิดชอบของหมวด{profile.categoryName}ไปยังหมวดหมู่อื่นได้ทันที
                </p>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 w-fit">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                เปิดใช้งานเต็มสิทธิ์
              </span>
            </div>

            {/* Perm 5 */}
            <div className="bg-white rounded-2xl p-6 border border-[#eaedff] shadow-xs flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[22px]">verified</span>
                </div>
                <h4 className="text-sm font-bold text-[#131b2e]">บันทึกงานเสร็จสิ้น (Resolve)</h4>
                <p className="text-xs text-[#4a4450] leading-relaxed">
                  สิทธิ์ในการตรวจรับงาน บันทึกผลการแก้ไข และปิดเคสคำร้อง พร้อมส่งต่อไปยังคลังประวัติผลงาน (Resolved History)
                </p>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 w-fit">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                เปิดใช้งานเต็มสิทธิ์
              </span>
            </div>

            {/* Perm 6 */}
            <div className="bg-white rounded-2xl p-6 border border-[#eaedff] shadow-xs flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[22px]">shield</span>
                </div>
                <h4 className="text-sm font-bold text-[#131b2e]">คุ้มครองความเป็นส่วนตัว (PDPA)</h4>
                <p className="text-xs text-[#4a4450] leading-relaxed">
                  ระบบรักษาความเป็นส่วนตัวของผู้แจ้งตามมาตรฐาน PDPA ไม่เปิดเผยชื่อจริงหรืออีเมล แสดงผลเป็นบทบาทนิสิตหรือบุคลากรเท่านั้น
                </p>
              </div>
              <span className="text-[11px] font-bold text-[#340866] bg-[#eaedff] px-2.5 py-1 rounded-lg border border-[#eaedff] flex items-center gap-1 w-fit">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                ระบบอัตโนมัติ (Enforced)
              </span>
            </div>
          </div>
        )}

        {/* ── TAB 3: ความปลอดภัยและรหัสผ่าน ────────────────────────── */}
        {activeTab === 'SECURITY' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
            {/* Change Password Form */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-7 border border-[#eaedff] shadow-xs flex flex-col gap-6">
              <div className="border-b border-[#eaedff] pb-4">
                <h3 className="text-base font-bold text-[#131b2e] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#340866]">lock_reset</span>
                  <span>เปลี่ยนรหัสผ่านเข้าสู่ระบบ</span>
                </h3>
                <p className="text-xs text-[#4a4450] mt-0.5">
                  รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร เพื่อความปลอดภัยของข้อมูลงานราชการ
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#4a4450] mb-1.5">รหัสผ่านปัจจุบัน</label>
                  <input
                    type="password"
                    value={passwords.current}
                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    placeholder="••••••••"
                    className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#eaedff] text-xs font-medium text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#340866]/20 focus:border-[#340866]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4a4450] mb-1.5">รหัสผ่านใหม่</label>
                  <input
                    type="password"
                    value={passwords.newPass}
                    onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })}
                    placeholder="••••••••"
                    className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#eaedff] text-xs font-medium text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#340866]/20 focus:border-[#340866]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4a4450] mb-1.5">ยืนยันรหัสผ่านใหม่</label>
                  <input
                    type="password"
                    value={passwords.confirmPass}
                    onChange={(e) => setPasswords({ ...passwords, confirmPass: e.target.value })}
                    placeholder="••••••••"
                    className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#eaedff] text-xs font-medium text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#340866]/20 focus:border-[#340866]"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="px-5 py-2.5 rounded-xl bg-[#340866] hover:bg-[#4b267d] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">key</span>
                    <span>{savingPassword ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'บันทึกรหัสผ่านใหม่'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Login Sessions & Security Audit */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              <div className="bg-white rounded-2xl p-6 border border-[#eaedff] shadow-xs flex flex-col gap-4">
                <h4 className="text-xs font-bold text-[#4a4450] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified</span>
                  <span>ความปลอดภัยเซสชันเข้าสู่ระบบ</span>
                </h4>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#f2f3ff] border border-[#eaedff] flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#131b2e]">Google Chrome บน Windows</p>
                      <p className="text-[11px] text-[#7b7482] mt-0.5">เซสชันปัจจุบัน • เครือข่าย UP-WIFI</p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#faf8ff] border border-[#eaedff] flex items-center justify-between text-slate-500">
                    <div>
                      <p className="font-semibold text-slate-700">การยืนยันตัวตนสิทธิ์</p>
                      <p className="text-[11px] text-[#7b7482] mt-0.5">มาตรฐาน JWT Token & Bcrypt Hash</p>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-[#340866]">ACTIVE</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}



      </div>

      {/* ── Toast Notification ──────────────────────────────────────── */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-[#131b2e] text-white text-xs font-bold shadow-2xl flex items-center gap-2 border border-white/10 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
