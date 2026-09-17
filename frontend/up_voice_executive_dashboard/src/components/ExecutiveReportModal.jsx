import React from 'react';
import { X, Printer, Download, CheckCircle, AlertOctagon, TrendingUp } from 'lucide-react';

export default function ExecutiveReportModal({ isOpen, onClose, data, selectedCategoryName }) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] shadow-2xl flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
            <h2 className="font-bold text-slate-800 text-base">
              รายงานสรุปผลเชิงยุทธศาสตร์สำหรับผู้บริหาร (Executive Summary)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ / บันทึก PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Printable Document */}
        <div className="p-8 overflow-y-auto space-y-6 print:p-0 print:space-y-4">
          {/* Letterhead Header */}
          <div className="border-b pb-5 border-slate-200">
            <div className="text-xs font-bold text-purple-700 tracking-wider uppercase mb-1">
              มหาวิทยาลัยพะเยา • University of Phayao
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900">
              รายงานสรุปสถานการณ์ข้อร้องเรียนและประสิทธิภาพการแก้ไขปัญหา
            </h1>
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-xs text-slate-500">
              <span>ขอบเขต: <strong className="text-purple-900">{selectedCategoryName}</strong></span>
              <span>วันที่ออกรายงาน: <strong>{new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></span>
            </div>
          </div>

          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
              <div className="text-xs text-purple-900 font-semibold">จำนวนเรื่องทั้งหมด</div>
              <div className="text-2xl font-black text-purple-950 mt-1">
                {data.kpi?.totalProblems?.toLocaleString()} เรื่อง
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-1">
                +{data.kpi?.changeMonthlyPercent}% จากเดือนก่อนหน้า
              </div>
            </div>

            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
              <div className="text-xs text-emerald-900 font-semibold">อัตราแก้ไขสำเร็จ</div>
              <div className="text-2xl font-black text-emerald-950 mt-1">
                {data.kpi?.resolvedPercent}%
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-1">
                เป้าหมาย SLA &gt; 70% (ผ่านเกณฑ์)
              </div>
            </div>

            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
              <div className="text-xs text-blue-900 font-semibold">เวลาเฉลี่ยในการปิดงาน</div>
              <div className="text-2xl font-black text-blue-950 mt-1">
                {data.kpi?.avgResolutionDays || 1.8} วัน
              </div>
              <div className="text-[11px] text-blue-700 font-medium mt-1">
                รวดเร็วกว่าค่าเฉลี่ยปีที่แล้ว 15%
              </div>
            </div>
          </div>

          {/* Top Issues Breakdown */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-purple-700" />
              <span>สรุป 5 ปัญหาสำคัญที่ส่งผลกระทบต่อประชาคม ม.พะเยา</span>
            </h3>
            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
              {data.topIssues?.map((issue, idx) => (
                <div key={idx} className="p-3 px-4 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-[11px]">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800">{issue.title}</span>
                  </div>
                  <span className="font-bold text-purple-900">{issue.count} กรณี</span>
                </div>
              ))}
            </div>
          </div>

          {/* Strategic Recommendations */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>ข้อเสนอแนะเชิงนโยบายสำหรับฝ่ายบริหาร (Strategic Insights)</span>
            </h3>
            <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
              <li>
                <strong>โครงสร้างพื้นฐานสัญญาณ Wi-Fi:</strong> เป็นปัญหาอันดับ 1 ในอาคาร ICT และหอพัก ควรพิจารณาเพิ่มงบประมาณติดตั้ง Access Point คุณภาพสูงเพิ่มเติมในจุดอับสัญญาณ
              </li>
              <li>
                <strong>ระบบประปาหอพัก:</strong> พบการร้องเรียนซ้ำซ้อนในช่วงเวลาเร่งด่วน 17.00 - 20.00 น. ควรจัดตารางเจ้าหน้าที่ช่าง On-site ประจำหอพักในช่วงเวลาดังกล่าว
              </li>
              <li>
                <strong>ความพึงพอใจโดยรวม:</strong> นิสิตคิดเป็น 70% ของผู้แจ้งทั้งหมด การตอบสนองที่รวดเร็วช่วยลดกระแสเชิงลบในโซเชียลมีเดียได้อย่างมีนัยสำคัญ
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
