import React, { useState, useEffect, useMemo } from 'react';
import ExecutiveSidebar from '../components/ExecutiveSidebar';
import ExecutiveHeader from '../components/ExecutiveHeader';
import HeatmapCard from '../components/HeatmapCard';
import KpiCards from '../components/KpiCards';
import TopIssuesCard from '../components/TopIssuesCard';
import RecentActivityCard from '../components/RecentActivityCard';
import ExecutiveReportsView from '../components/ExecutiveReportsView';
import ExecutiveReportModal from '../components/ExecutiveReportModal';
import {
  MOCK_PRESENTATION_DATA,
  fetchRealExecutiveData,
  filterExecutiveData,
} from '../services/dashboardService';
import { RefreshCw } from 'lucide-react';

export default function ExecutiveDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'reports'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeframe, setTimeframe] = useState('30days');
  const [isReportOpen, setIsReportOpen] = useState(false);
  
  // Real data state
  const [useRealData, setUseRealData] = useState(true);
  const [realDataset, setRealDataset] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load real backend data on mount
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchRealExecutiveData();
      setRealDataset(data);
    } catch (e) {
      console.error('Failed to load real data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Determine active source dataset (Real vs Mock)
  const activeBaseData = useMemo(() => {
    if (useRealData && realDataset) {
      return realDataset;
    }
    return MOCK_PRESENTATION_DATA;
  }, [useRealData, realDataset]);

  // Compute filtered view reactively
  const currentData = useMemo(() => {
    return filterExecutiveData(activeBaseData, selectedCategory, searchQuery);
  }, [activeBaseData, selectedCategory, searchQuery]);

  const categories = activeBaseData?.categories || MOCK_PRESENTATION_DATA.categories;
  const selectedCategoryName =
    categories.find((c) => c.id === selectedCategory)?.name || 'ภาพรวมทั้งหมด';

  return (
    <div className="flex min-h-screen bg-[#f4f6fb]">
      {/* Sidebar with only 2 items: ภาพรวมระบบ & รายงานผู้บริหาร */}
      <ExecutiveSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Executive Header */}
        <ExecutiveHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          categories={categories}
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          onOpenReport={() => setActiveTab('reports')}
          user={user}
          useRealData={useRealData}
          setUseRealData={setUseRealData}
        />

        {/* Dynamic Tab Views */}
        <main className="p-6 md:p-8 flex-1 space-y-6 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' ? (
            <>
              {/* Data Source & Status Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 px-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-2.5 text-xs">
                  <span className={`w-2.5 h-2.5 rounded-full ${useRealData ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                  <span className="font-semibold text-slate-700">
                    {useRealData ? (
                      <>
                        กำลังแสดงผลด้วย <strong className="text-emerald-700 font-bold">ข้อมูลจริงจากฐานข้อมูลระบบ (Live Backend API)</strong>
                        <span className="text-slate-400 ml-2 font-normal">
                          (พบ {realDataset?.rawProblems?.length || 0} รายการจริงในระบบ • รวมสถิติโหมดไม่ระบุตัวตน Anonymous)
                        </span>
                      </>
                    ) : (
                      <>
                        กำลังแสดงผลด้วย <strong className="text-amber-700 font-bold">ชุดข้อมูลจำลองเชิงสถิติ (Demo 1,248 เคส)</strong>
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {selectedCategory !== 'all' && (
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className="text-xs font-bold text-purple-700 hover:text-purple-900 underline"
                    >
                      ล้างตัวกรองหมวดหมู่
                    </button>
                  )}
                  <button
                    onClick={loadData}
                    disabled={loading}
                    title="รีเฟรชข้อมูลจริงล่าสุด"
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-600' : ''}`} />
                    <span>ซิงค์ข้อมูล</span>
                  </button>
                </div>
              </div>

              {/* Top Row: Heatmap (65%) + KPI Summary Cards (35%) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <HeatmapCard heatmapPoints={currentData.heatmapPoints} />
                </div>
                <div className="lg:col-span-4">
                  <KpiCards kpi={currentData.kpi} />
                </div>
              </div>

              {/* Bottom Row: 5 อันดับปัญหา (55%) + กิจกรรมล่าสุด (45%) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7">
                  <TopIssuesCard topIssues={currentData.topIssues} />
                </div>
                <div className="lg:col-span-5">
                  <RecentActivityCard activities={currentData.recentActivities} />
                </div>
              </div>
            </>
          ) : (
            /* Tab 2: Executive Reports View */
            <ExecutiveReportsView
              data={currentData}
              selectedCategoryName={selectedCategoryName}
              user={user}
            />
          )}
        </main>

        {/* Footer matching mockup */}
        <footer className="border-t border-slate-200 bg-white/50 px-8 py-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2 mt-auto">
          <div>© 2024 มหาวิทยาลัยพะเยา สงวนลิขสิทธิ์</div>
          <div className="text-slate-400">ระบบเวอร์ชัน 4.2.1-stable • ศูนย์ข้อมูลผู้บริหาร (Executive Command)</div>
        </footer>
      </div>

      {/* Executive Report Modal */}
      <ExecutiveReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        data={currentData}
        selectedCategoryName={selectedCategoryName}
      />
    </div>
  );
}
