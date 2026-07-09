/** Placeholder – Profile screen (ข้อมูลส่วนตัว) */
export default function ProfilePlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
      <div className="w-20 h-20 rounded-2xl bg-[#2B164D]/10 flex items-center justify-center">
        <span className="text-4xl">👤</span>
      </div>
      <h2 className="text-xl font-bold text-[#2B164D]">ข้อมูลส่วนตัว</h2>
      <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
        โปรไฟล์และข้อมูลผู้ใช้จะแสดงที่นี่ — กำลังพัฒนา
      </p>
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700">
        🚧 Coming Soon
      </span>
    </div>
  );
}
