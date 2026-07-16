import React, { useState, useEffect } from 'react';

export default function ProfileSettings() {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    role: '',
    initials: ''
  });

  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setProfile({
          name: payload.display_name || payload.email || 'แอดมิน',
          email: payload.email || 'admin@up.ac.th',
          role: 'Category Admin', // Or we could use payload.role if needed
          initials: (payload.display_name || payload.email || 'CA').substring(0, 2).toUpperCase()
        });
      }
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans pb-20 text-left">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="flex items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">ตั้งค่าบัญชี (Profile & Settings)</h1>
            <p className="text-sm text-slate-500 mt-1">จัดการข้อมูลส่วนตัวและรหัสผ่านของคุณ</p>
          </div>
        </div>

        {/* Clean Card container */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 md:p-8 space-y-10">
            
            {/* Section 1 - User Profile */}
            <section>
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-[#2B164D] rounded-full"></span>
                ข้อมูลส่วนตัว (User Profile)
              </h2>
              
              <div className="flex flex-col sm:flex-row gap-8 items-start">
                {/* Profile Picture */}
                <div className="flex flex-col items-center gap-4">
                  <div className="w-32 h-32 rounded-full bg-[#2B164D] text-white border-4 border-indigo-50 shadow-md flex items-center justify-center overflow-hidden shrink-0 text-4xl font-black tracking-wider">
                    {profile.initials}
                  </div>
                  <button className="text-xs font-bold text-[#2B164D] bg-indigo-50 px-4 py-2 rounded-lg hover:bg-[#2B164D] hover:text-white transition-colors border border-indigo-100">
                    เปลี่ยนรูปภาพ
                  </button>
                </div>

                {/* Form Inputs */}
                <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 sm:mt-0">
                  {/* Name Input */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      ชื่อ-นามสกุล
                    </label>
                    <input 
                      type="text" 
                      value={profile.name}
                      readOnly
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none cursor-not-allowed opacity-80"
                    />
                  </div>

                  {/* Email Input (Read-only) */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">อีเมล (Email)</label>
                    <input 
                      type="email" 
                      value={profile.email}
                      disabled
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 cursor-not-allowed outline-none opacity-80"
                    />
                  </div>

                  {/* Role Input (Read-only) */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">บทบาท (Role)</label>
                    <input 
                      type="text" 
                      value={profile.role}
                      disabled
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-[#2B164D] cursor-not-allowed outline-none opacity-80"
                    />
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-slate-100" />

            {/* Section 2 - Change Password */}
            <section>
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                เปลี่ยนรหัสผ่าน (Change Password)
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full lg:max-w-2xl">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">รหัสผ่านเดิม (Current Password)</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[#2B164D]/20 focus:border-[#2B164D] transition-all placeholder:text-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">รหัสผ่านใหม่ (New Password)</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[#2B164D]/20 focus:border-[#2B164D] transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>
            </section>
            
            <div className="flex justify-end pt-6 border-t border-slate-100">
              <button className="px-6 py-2.5 bg-[#2B164D] text-white text-sm font-bold rounded-xl hover:bg-[#1a0d30] transition-colors shadow-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
