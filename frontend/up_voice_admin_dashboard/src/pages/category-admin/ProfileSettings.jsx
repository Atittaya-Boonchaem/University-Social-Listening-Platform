// src/pages/category-admin/ProfileSettings.jsx
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { User, Key, Bell, Shield, CheckCircle2, Save, Mail, FolderKanban, Lock } from 'lucide-react';

export default function ProfileSettings() {
  const [profile, setProfile] = useState({
    name: 'กำลังโหลด...',
    email: 'กำลังโหลด...',
    role: 'กำลังโหลด...',
    categoryName: 'กำลังโหลด...',
    initials: 'CA'
  });

  const [passwords, setPasswords] = useState({
    current: '',
    newPass: '',
    confirmPass: ''
  });

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    urgentAlerts: true,
    slaReminders: true
  });

  const [toastMsg, setToastMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await api.get('/users/me');
        const userData = res.data?.data;
        if (userData) {
          const displayName = userData.display_name || userData.email || 'แอดมินหมวดหมู่';
          const roleTitle = userData.role === 'category_admin' ? 'Category Admin (แอดมินประจำหมวดหมู่)' :
                            userData.role === 'super_admin' ? 'Super Admin (ผู้ดูแลระบบสูงสุด)' : (userData.role || 'Category Admin');
          const catName = userData.category_name || 'บริหารจัดการกลุ่มปัญหาประจำหมวดหมู่';
          
          setProfile({
            name: displayName,
            email: userData.email || 'admin@up.ac.th',
            role: roleTitle,
            categoryName: catName,
            initials: displayName.substring(0, 2).toUpperCase()
          });
        }
      } catch (err) {
        console.error('Failed to load user profile me:', err);
        // Fallback from JWT token
        try {
          const token = localStorage.getItem('token');
          if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setProfile({
              name: payload.display_name || payload.email || 'แอดมินหมวดหมู่',
              email: payload.email || 'admin@up.ac.th',
              role: 'Category Admin',
              categoryName: 'ปัญหาเกี่ยวกับรถเมล์',
              initials: (payload.display_name || payload.email || 'CA').substring(0, 2).toUpperCase()
            });
          }
        } catch {}
      }
    }
    loadMe();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (passwords.newPass) {
      if (passwords.newPass.length < 6) {
        showToast('❌ รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
        return;
      }
      if (passwords.newPass !== passwords.confirmPass) {
        showToast('❌ รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
        return;
      }
    }

    setSaving(true);
    try {
      if (passwords.newPass) {
        await api.post('/users/change-password', {
          current_password: passwords.current,
          new_password: passwords.newPass
        });
      }
      showToast('✅ บันทึกข้อมูลตั้งค่าบัญชีและเปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
      setPasswords({ current: '', newPass: '', confirmPass: '' });
    } catch (err) {
      console.error(err);
      const errDetail = err.response?.data?.detail || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน';
      showToast(`❌ ${errDetail}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans pb-20 text-left space-y-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="flex items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <User size={24} className="text-indigo-600" />
              <span>ตั้งค่าบัญชี (Profile & Settings)</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">จัดการข้อมูลส่วนตัว หมวดหมู่ที่รับผิดชอบ การแจ้งเตือน และรหัสผ่าน</p>
          </div>
        </div>

        {/* Card container */}
        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 md:p-8 space-y-8">
            
            {/* Section 1 - User Profile */}
            <section>
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-[#2B164D] rounded-full"></span>
                ข้อมูลส่วนตัวและหมวดหมู่ที่รับผิดชอบ (User Profile & Category)
              </h2>
              
              <div className="flex flex-col sm:flex-row gap-8 items-start">
                {/* Profile Picture */}
                <div className="flex flex-col items-center gap-3">
                  <div className="w-28 h-28 rounded-full bg-[#2B164D] text-white border-4 border-indigo-50 shadow-md flex items-center justify-center overflow-hidden shrink-0 text-3xl font-black tracking-wider">
                    {profile.initials}
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Category Admin
                  </span>
                </div>

                {/* Form Inputs */}
                <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Name Input */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">ชื่อ-นามสกุลผู้ใช้งาน</label>
                    <input 
                      type="text" 
                      value={profile.name}
                      readOnly
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none opacity-90 cursor-not-allowed"
                    />
                  </div>

                  {/* Email Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">อีเมล (Email)</label>
                    <input 
                      type="email" 
                      value={profile.email}
                      readOnly
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 outline-none opacity-90 cursor-not-allowed"
                    />
                  </div>

                  {/* Assigned Category Badge */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">หมวดหมู่ปัญหาที่รับผิดชอบ</label>
                    <div className="w-full px-4 py-2.5 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-700 flex items-center gap-2">
                      <FolderKanban size={15} />
                      <span className="truncate">{profile.categoryName}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-slate-100" />

            {/* Section 2 - Notification Settings */}
            <section>
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-sky-500 rounded-full"></span>
                การตั้งค่าการแจ้งเตือน (Notifications & Alerts)
              </h2>
              
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/80 cursor-pointer hover:border-indigo-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-indigo-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">แจ้งเตือนทางอีเมลเมื่อมีปัญหาใหม่</p>
                      <p className="text-[11px] text-slate-400">รับอีเมลแจ้งเตือนทันทีเมื่อผู้ใช้ส่งปัญหาเข้ามาในหมวดหมู่ของคุณ</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.emailAlerts}
                    onChange={(e) => setNotifications({ ...notifications, emailAlerts: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/80 cursor-pointer hover:border-indigo-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <Bell size={16} className="text-amber-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">แจ้งเตือนตั๋วปัญหาด่วนมาก (Urgent Cases)</p>
                      <p className="text-[11px] text-slate-400">ส่งการแจ้งเตือนทันทีเมื่อมีเคสที่ถูกรายงานซ้ำเกิน 5 ครั้ง</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.urgentAlerts}
                    onChange={(e) => setNotifications({ ...notifications, urgentAlerts: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                </label>
              </div>
            </section>

            <hr className="border-slate-100" />

            {/* Section 3 - Change Password */}
            <section>
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                เปลี่ยนรหัสผ่าน (Change Password)
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">รหัสผ่านปัจจุบัน</label>
                  <input 
                    type="password"
                    value={passwords.current}
                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">รหัสผ่านใหม่</label>
                  <input 
                    type="password"
                    value={passwords.newPass}
                    onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ยืนยันรหัสผ่านใหม่</label>
                  <input 
                    type="password"
                    value={passwords.confirmPass}
                    onChange={(e) => setPasswords({ ...passwords, confirmPass: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            </section>
            
            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button 
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-[#2B164D] text-white text-xs font-bold rounded-xl hover:bg-[#1a0d30] disabled:opacity-60 transition-all shadow-md flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    บันทึกการเปลี่ยนแปลง
                  </>
                )}
              </button>
            </div>
            
          </div>
        </form>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-slate-800 text-white text-xs font-semibold rounded-2xl shadow-xl">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
