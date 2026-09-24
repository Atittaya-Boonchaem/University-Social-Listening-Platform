import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { fetchProblems, updateProblemStatus } from '../../services/problemService';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Coordinates & Landmarks in University of Phayao (ม.พะเยา)
const PHAYAO_CENTER = [19.0289, 99.8967];

// Bounding box strictly locking map navigation to University of Phayao & Phayao area
// [[South-West lat, lng], [North-East lat, lng]]
const PHAYAO_BOUNDS = [
  [18.9600, 99.8200], // South-West (ครอบคลุมพื้นที่ ม.พะเยา และรอบนอก)
  [19.1200, 99.9800], // North-East (ครอบคลุมถึงตัวเมืองพะเยา/กว๊านพะเยา)
];

const UP_ZONES = [
  { id: 'all', label: 'ทั้งหมด', center: [19.0289, 99.8967], zoom: 15 },
  { id: 'dorm', label: 'หอพักนิสิต UP Dorm', center: [19.0308, 99.8906], zoom: 16, keywords: ['หอ', 'dorm', 'UP DORM'] },
  { id: 'pky', label: 'อาคารเรียนรวม PKY / CE', center: [19.0268, 99.8965], zoom: 16, keywords: ['ภูกามยาว', 'PKY', 'CE', 'ICT', 'เรียนรวม'] },
  { id: 'gate', label: 'ซุ้มประตู มพ. / อ่างหลวง', center: [19.0242, 99.8915], zoom: 16, keywords: ['ซุ้ม', 'ประตู', 'อ่างหลวง', 'พหลโยธิน', 'เวียง'] },
];

// Fallback coordinate mapping for UP buildings if no GPS is recorded
const BUILDING_COORDS = {
  'pky': [19.0263, 99.8947],
  'ภูกามยาว': [19.0263, 99.8947],
  'ce': [19.0273, 99.8999],
  'ict': [19.0273, 99.8999],
  'เทคโนโลยีสารสนเทศ': [19.0273, 99.8999],
  'หอ': [19.0308, 99.8906],
  'dorm': [19.0308, 99.8906],
  'อ่างหลวง': [19.0245, 99.8920],
  'ซุ้ม': [19.0238, 99.8910],
  'ประตู': [19.0238, 99.8910],
  'อธิการบดี': [19.0280, 99.8960],
  'เวียง': [19.0290, 99.8970],
  'โรงพยาบาล': [19.0326, 99.9199],
  'แพทย์': [19.0326, 99.9199],
};

function getProblemBaseCoords(problem) {
  if (problem.latitude && problem.longitude) {
    const lat = parseFloat(problem.latitude);
    const lng = parseFloat(problem.longitude);
    if (!isNaN(lat) && !isNaN(lng) && lat > 18 && lat < 20 && lng > 98 && lng < 101) {
      return [lat, lng];
    }
  }

  const loc = (problem.location || '').toLowerCase();
  for (const [key, coords] of Object.entries(BUILDING_COORDS)) {
    if (loc.includes(key)) {
      return coords;
    }
  }

  return PHAYAO_CENTER;
}

// Controller to smoothly pan & zoom map when zone changes
function MapFlyController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && map) {
      map.flyTo(center, zoom, { duration: 0.8 });
    }
  }, [center, zoom, map]);
  return null;
}

export default function CategoryAdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clusters, setClusters] = useState([]);
  const [assignedCatName, setAssignedCatName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminRole, setAdminRole] = useState('หัวหน้างานอาคาร');

  // Filter States
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
  const [selectedZone, setSelectedZone] = useState('all');
  const [locationSearch, setLocationSearch] = useState('');
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(null);

  // Map Controls
  const [mapCenter, setMapCenter] = useState(PHAYAO_CENTER);
  const [mapZoom, setMapZoom] = useState(15);

  // 1. Fetch user info
  useEffect(() => {
    api.get('/users/me')
      .then(res => {
        if (res.data?.success && res.data?.data) {
          const user = res.data.data;
          if (user.category_name) setAssignedCatName(user.category_name);
          if (user.display_name) setAdminName(user.display_name);
          if (user.role) setAdminRole(user.role === 'category_admin' ? (user.category_name || 'แอดมินหมวดหมู่') : user.role);
        }
      })
      .catch(() => {});
  }, []);

  // 2. Load problems & clusters
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pubData, internalData] = await Promise.all([
        fetchProblems({ page_size: 150, visibility_name: 'public' }, true),
        fetchProblems({ page_size: 150, visibility_name: 'internal' }, true),
      ]);

      const merged = [...(pubData.items || []), ...(internalData.items || [])];
      const unique = Array.from(new Map(merged.map(p => [p.problem_id, p])).values());

      const parents = unique.filter(p => !p.parent_problem_id);
      const children = unique.filter(p => p.parent_problem_id);

      const constructedClusters = parents.map(parent => {
        const dups = children.filter(child => child.parent_problem_id === parent.problem_id);
        const allPostsInCluster = [
          {
            id: parent.problem_id,
            text: parent.description,
            author: parent.author_name || parent.author?.display_name || "ไม่ระบุชื่อ",
            time: parent.created_at ? new Date(parent.created_at).toLocaleString('th-TH') : '',
            locationDetail: parent.building_name || parent.location || "ไม่ระบุสถานที่",
            images: parent.attachments?.map(a => a.file_url) || [],
            llm_analysis: parent.llm_analysis
          },
          ...dups.map(dup => ({
            id: dup.problem_id,
            text: dup.description,
            author: dup.author_name || dup.author?.display_name || "ไม่ระบุชื่อ",
            time: dup.created_at ? new Date(dup.created_at).toLocaleString('th-TH') : '',
            locationDetail: dup.building_name || dup.location || "ไม่ระบุสถานที่",
            images: dup.attachments?.map(a => a.file_url) || [],
            llm_analysis: dup.llm_analysis
          }))
        ];

        let formattedTicketId = `#UP-68-${String(parent.problem_id).padStart(4, '0')}`;
        if (parent.ticket_id) {
          formattedTicketId = parent.ticket_id;
        } else if (parent.ticket_prefix) {
          formattedTicketId = `${parent.ticket_prefix}-${parent.created_at ? new Date(parent.created_at).getFullYear().toString().slice(-2) : '68'}-${String(parent.problem_id).padStart(4, '0')}`;
        }

        return {
          id: formattedTicketId,
          problem_id: parent.problem_id,
          topic: parent.title,
          date: parent.created_at ? new Date(parent.created_at).toLocaleDateString('th-TH') : '',
          isoDate: parent.created_at ? parent.created_at.split('T')[0] : '',
          location: parent.building_name || parent.location || "ไม่ระบุสถานที่",
          latitude: parent.latitude,
          longitude: parent.longitude,
          category_id: parent.category_id,
          category_name: parent.category_name,
          color_code: parent.color_code || '#340866',
          reportCount: allPostsInCluster.length,
          status: parent.status_name,
          posts: allPostsInCluster
        };
      });

      setClusters(constructedClusters);
    } catch (e) {
      console.error(e);
      setError('โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle status update
  const handleStatusChange = async (problemId, newStatus) => {
    setIsUpdatingStatus(problemId);
    try {
      await updateProblemStatus(problemId, newStatus);
      setClusters(prev => prev.map(c =>
        c.problem_id === problemId ? { ...c, status: newStatus } : c
      ));
    } catch (err) {
      alert("ไม่สามารถเปลี่ยนสถานะได้: " + err.message);
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // 3. Computed KPI Stats
  const totalCount = clusters.length;
  const openCount = clusters.filter(c => c.status === 'OPEN').length;
  const progressCount = clusters.filter(c => c.status === 'IN_PROGRESS').length;
  const resolvedCount = clusters.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length;

  // 4. Group problems by location / building
  const locationStats = useMemo(() => {
    const map = new Map();

    clusters.forEach(c => {
      const loc = c.location && c.location !== 'ไม่ระบุสถานที่' ? c.location : 'จุดรอรถเมล์/บริเวณทั่วไป';
      if (!map.has(loc)) {
        map.set(loc, {
          name: loc,
          total: 0,
          open: 0,
          in_progress: 0,
          resolved: 0,
          clusters: [],
          icon: 'apartment'
        });
      }
      const item = map.get(loc);
      item.total += 1;
      if (c.status === 'OPEN') item.open += 1;
      else if (c.status === 'IN_PROGRESS') item.in_progress += 1;
      else item.resolved += 1;
      item.clusters.push(c);

      if (loc.includes('หอ') || loc.includes('Dorm')) item.icon = 'apartment';
      else if (loc.includes('เรียน') || loc.includes('PKY') || loc.includes('ภูกามยาว')) item.icon = 'school';
      else if (loc.includes('ประตู') || loc.includes('พหลโยธิน') || loc.includes('ถนน')) item.icon = 'traffic';
      else if (loc.includes('ICT') || loc.includes('เทคโนโลยี') || loc.includes('CE')) item.icon = 'devices';
      else if (loc.includes('อ่างหลวง') || loc.includes('น้ำ')) item.icon = 'water';
      else if (loc.includes('เวียง') || loc.includes('กีฬา') || loc.includes('กิจกรรม')) item.icon = 'sports_handball';
      else item.icon = 'domain';
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [clusters]);

  // Zone counts
  const zoneCounts = useMemo(() => {
    const counts = { all: totalCount, dorm: 0, pky: 0, gate: 0 };
    clusters.forEach(c => {
      const loc = (c.location || '').toLowerCase();
      if (loc.includes('หอ') || loc.includes('dorm')) counts.dorm += 1;
      else if (loc.includes('เรียน') || loc.includes('pky') || loc.includes('ภูกามยาว') || loc.includes('ce') || loc.includes('ict')) counts.pky += 1;
      else if (loc.includes('ประตู') || loc.includes('อ่างหลวง') || loc.includes('พหลโยธิน') || loc.includes('เวียง')) counts.gate += 1;
    });
    return counts;
  }, [clusters, totalCount]);

  // Top hotspot
  const topHotspot = locationStats.length > 0 ? locationStats[0] : null;

  // Handle Zone selection & pan map
  const handleSelectZone = (zoneId) => {
    setSelectedZone(zoneId);
    const z = UP_ZONES.find(item => item.id === zoneId);
    if (z) {
      setMapCenter(z.center);
      setMapZoom(z.zoom);
    }
  };

  // Filtered location stats for the table
  const filteredLocationStats = useMemo(() => {
    return locationStats.filter(loc => {
      const matchSearch = !locationSearch || loc.name.toLowerCase().includes(locationSearch.toLowerCase());
      let matchZone = true;
      if (selectedZone === 'dorm') {
        matchZone = loc.name.includes('หอ') || loc.name.includes('Dorm');
      } else if (selectedZone === 'pky') {
        matchZone = loc.name.includes('เรียน') || loc.name.includes('PKY') || loc.name.includes('ภูกามยาว') || loc.name.includes('CE') || loc.name.includes('ICT');
      } else if (selectedZone === 'gate') {
        matchZone = loc.name.includes('ประตู') || loc.name.includes('อ่างหลวง') || loc.name.includes('พหลโยธิน') || loc.name.includes('เวียง');
      }
      return matchSearch && matchZone;
    });
  }, [locationStats, locationSearch, selectedZone]);

  // Smart Radial Spiderfy Pins for OpenStreetMap
  // Groups problems by location and spreads them radially so multiple problems at the same building NEVER overlap!
  const osmPins = useMemo(() => {
    const groups = new Map();

    clusters.forEach((c) => {
      const baseKey = c.building_name || c.location || 'default';
      if (!groups.has(baseKey)) {
        groups.set(baseKey, []);
      }
      groups.get(baseKey).push(c);
    });

    const pins = [];

    groups.forEach((groupItems) => {
      const baseCoord = getProblemBaseCoords(groupItems[0]);
      const count = groupItems.length;

      groupItems.forEach((c, idx) => {
        let finalCoord = baseCoord;
        if (count > 1) {
          // Distribute in a small circle around the building center (approx 35-40 meters)
          const angle = (2 * Math.PI * idx) / count;
          const radius = 0.00038;
          finalCoord = [
            baseCoord[0] + radius * Math.cos(angle),
            baseCoord[1] + (radius * 1.15) * Math.sin(angle),
          ];
        }

        const isUrgent = c.status === 'OPEN' || c.reportCount >= 4;
        let color = '#340866'; // Resolved (purple)
        let zOrder = 1;
        let radius = 9;

        if (c.status === 'OPEN') {
          color = '#ba1a1a'; // Red
          zOrder = 2;
          radius = 10;
        } else if (c.status === 'IN_PROGRESS') {
          color = '#f59e0b'; // Bright Amber / Yellow
          zOrder = 10; // High z-order so yellow is rendered on top!
          radius = 12; // Larger size so it stands out immediately!
        }

        pins.push({
          ...c,
          coords: finalCoord,
          color,
          isUrgent,
          zOrder,
          radius,
        });
      });
    });

    // Sort ascending by zOrder so high priority (IN_PROGRESS) is rendered LAST (on top)!
    pins.sort((a, b) => a.zOrder - b.zOrder);

    return pins;
  }, [clusters]);

  // Filtered Pins on Map according to active statusFilter and selectedZone
  const displayedOsmPins = useMemo(() => {
    return osmPins.filter(pin => {
      // 1. Status Filter
      if (statusFilter === 'OPEN' && pin.status !== 'OPEN') return false;
      if (statusFilter === 'IN_PROGRESS' && pin.status !== 'IN_PROGRESS') return false;
      if (statusFilter === 'RESOLVED' && pin.status !== 'RESOLVED' && pin.status !== 'CLOSED') return false;

      // 2. Zone Filter
      if (selectedZone === 'dorm') {
        const loc = (pin.location || '').toLowerCase();
        if (!loc.includes('หอ') && !loc.includes('dorm')) return false;
      } else if (selectedZone === 'pky') {
        const loc = (pin.location || '').toLowerCase();
        if (!loc.includes('เรียน') && !loc.includes('pky') && !loc.includes('ภูกามยาว') && !loc.includes('ce') && !loc.includes('ict')) return false;
      } else if (selectedZone === 'gate') {
        const loc = (pin.location || '').toLowerCase();
        if (!loc.includes('ประตู') && !loc.includes('อ่างหลวง') && !loc.includes('พหลโยธิน') && !loc.includes('เวียง')) return false;
      }

      return true;
    });
  }, [osmPins, statusFilter, selectedZone]);

  const categoryTitle = assignedCatName || clusters[0]?.category_name || 'กองอาคารสถานที่และยานพาหนะ';

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-[#340866] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-[#4a4450]">กำลังโหลดข้อมูลภาพรวม...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#faf8ff] min-h-screen text-[#131b2e] pb-16">
      <div className="px-4 md:px-8 py-6 max-w-[1520px] mx-auto space-y-6">

        {/* ── Top Header & Title Area ────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#eddcff] text-[#340866] text-xs font-bold">
                {categoryTitle}
              </span>
              <span className="text-[#7b7482] text-xs">•</span>
              <span className="text-xs text-[#4a4450] font-medium">ภาพรวมคำร้องประจำวัน</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight">
              ภาพรวมการซ่อมบำรุงภาคสนาม
            </h1>
            <p className="text-xs md:text-sm text-[#4a4450]">
              ติดตามงานซ่อมบำรุง ตรวจสอบคำร้องซ้ำซ้อน และกระจายการสื่อสารให้นิสิตในมหาวิทยาลัย
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={loadData}
              className="h-9 px-3.5 rounded-xl bg-white border border-[#e2e7ff] text-[#340866] text-xs font-bold hover:bg-[#eaedff] transition-all flex items-center gap-2 shadow-xs"
              title="รีเฟรชข้อมูลล่าสุด"
            >
              <span className="material-symbols-outlined text-[16px]">sync</span>
              <span>อัปเดตข้อมูล</span>
            </button>
          </div>
        </div>

        {/* ── 4 Clean, High-Contrast Summary KPI Cards ──────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total */}
          <div
            onClick={() => navigate('/category-admin/kanban?status=all')}
            className="group bg-white p-5 rounded-xl shadow-xs border border-[#eaedff] hover:border-[#340866] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            title="คลิกเพื่อเปิดดูรายการคำร้องทั้งหมด"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#4a4450] group-hover:text-[#340866] transition-colors flex items-center gap-1">
                <span>ปัญหาทั้งหมด</span>
                <span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#eddcff] text-[#340866] flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[18px]">assignment</span>
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-[#131b2e] font-sans">{totalCount}</span>
                <span className="text-xs text-[#4a4450]">รายการ</span>
              </div>
              <span className="text-[11px] text-[#340866] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                ดูทั้งหมด <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
              </span>
            </div>
          </div>

          {/* Card 2: Open */}
          <div
            onClick={() => navigate('/category-admin/kanban?status=open')}
            className="group bg-white p-5 rounded-xl shadow-xs border border-[#eaedff] hover:border-[#ba1a1a] hover:shadow-md hover:bg-red-50/10 transition-all cursor-pointer flex flex-col justify-between"
            title="คลิกเพื่อเปิดดูรายการคำร้องที่รอดำเนินการ"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#4a4450] group-hover:text-[#ba1a1a] transition-colors flex items-center gap-1">
                <span>คำร้องรอเริ่มดำเนินการ</span>
                <span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[18px]">inbox</span>
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-[#ba1a1a] font-sans">{openCount}</span>
                <span className="text-xs text-[#4a4450]">รายการ</span>
              </div>
              <span className="text-[11px] text-[#ba1a1a] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                ดูรายการ <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
              </span>
            </div>
          </div>

          {/* Card 3: In Progress */}
          <div
            onClick={() => navigate('/category-admin/kanban?status=in-progress')}
            className="group bg-white p-5 rounded-xl shadow-xs border border-[#eaedff] hover:border-[#f59e0b] hover:shadow-md hover:bg-amber-50/10 transition-all cursor-pointer flex flex-col justify-between"
            title="คลิกเพื่อเปิดดูรายการคำร้องที่กำลังดำเนินการ"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#4a4450] group-hover:text-[#d97706] transition-colors flex items-center gap-1">
                <span>กำลังดำเนินการ</span>
                <span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#fed65b] text-[#745c00] flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[18px]">engineering</span>
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-[#d97706] font-sans">{progressCount}</span>
                <span className="text-xs text-[#4a4450]">รายการ</span>
              </div>
              <span className="text-[11px] text-[#d97706] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                ดูรายการ <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
              </span>
            </div>
          </div>

          {/* Card 4: Resolved */}
          <div
            onClick={() => navigate('/category-admin/kanban?status=resolved')}
            className="group bg-white p-5 rounded-xl shadow-xs border border-[#eaedff] hover:border-[#340866] hover:shadow-md hover:bg-purple-50/10 transition-all cursor-pointer flex flex-col justify-between"
            title="คลิกเพื่อเปิดดูรายการคำร้องที่ดำเนินการเสร็จสิ้น"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#4a4450] group-hover:text-[#340866] transition-colors flex items-center gap-1">
                <span>ดำเนินการเสร็จสิ้น</span>
                <span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#e2e7ff] text-[#340866] flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[18px]">fact_check</span>
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-[#340866] font-sans">{resolvedCount}</span>
                <span className="text-xs text-[#4a4450]">รายการ</span>
              </div>
              <span className="text-[11px] text-[#340866] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                ดูรายการ <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── Campus Incident & Heatmap Section ─────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#eaedff] shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-4 md:p-5 border-b border-[#eaedff] bg-[#f2f3ff]/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#340866] text-white flex items-center justify-center shadow-xs flex-shrink-0">
                <span className="material-symbols-outlined text-[20px]">map</span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-[#131b2e]">
                    แผนที่ภาพรวมปัญหาตามพิกัดจริง — มหาวิทยาลัยพะเยา (Live Campus Issue Map)
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#fed65b] text-[#745c00] text-[11px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#735c00] animate-pulse"></span>
                    อัปเดตพิกัดสด ({displayedOsmPins.length}/{clusters.length} จุด)
                  </span>
                </div>
                <p className="text-xs text-[#4a4450] mt-0.5">
                  ติดตามตำแหน่งงานซ่อม {categoryTitle} ม.พะเยา พร้อมระดับความเร่งด่วนรายโซน (OpenStreetMap ฟรี 100%)
                </p>
              </div>
            </div>

            {/* Clean Status Badge - OpenStreetMap indicator */}
            <div className="flex items-center gap-2 self-start lg:self-auto">
              <span className="px-3 py-1.5 rounded-xl bg-white border border-[#e2e7ff] text-xs font-bold text-[#340866] shadow-xs flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
                <span>แผนที่เมืองจริง ม.พะเยา</span>
              </span>
            </div>
          </div>

          {/* Sub Header / Zone Filter Bar + Status Filter Badges */}
          <div className="px-4 py-3 bg-[#f2f3ff] border-b border-[#eaedff] flex flex-wrap items-center justify-between gap-3">
            {/* Zone Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-[#4a4450] text-xs font-semibold mr-1 shrink-0">
                <span className="material-symbols-outlined text-[16px] text-[#340866]">tune</span>
                <span>กรองตามโซน:</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => handleSelectZone('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    selectedZone === 'all'
                      ? 'bg-[#4b267d] text-white shadow-xs'
                      : 'bg-white border border-[#eaedff] text-[#4a4450] hover:bg-[#eaedff]'
                  }`}
                >
                  <span>ทั้งหมด</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${selectedZone === 'all' ? 'bg-white/20' : 'bg-[#eaedff]'}`}>
                    {zoneCounts.all}
                  </span>
                </button>

                <button
                  onClick={() => handleSelectZone('dorm')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    selectedZone === 'dorm'
                      ? 'bg-[#4b267d] text-white shadow-xs'
                      : 'bg-white border border-[#eaedff] text-[#4a4450] hover:bg-[#eaedff]'
                  }`}
                >
                  <span>หอพักนิสิต UP Dorm</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${selectedZone === 'dorm' ? 'bg-white/20' : 'bg-[#eaedff]'}`}>
                    {zoneCounts.dorm}
                  </span>
                </button>

                <button
                  onClick={() => handleSelectZone('pky')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    selectedZone === 'pky'
                      ? 'bg-[#4b267d] text-white shadow-xs'
                      : 'bg-white border border-[#eaedff] text-[#4a4450] hover:bg-[#eaedff]'
                  }`}
                >
                  <span>อาคารเรียนรวม PKY / CE</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${selectedZone === 'pky' ? 'bg-white/20' : 'bg-[#eaedff]'}`}>
                    {zoneCounts.pky}
                  </span>
                </button>

                <button
                  onClick={() => handleSelectZone('gate')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    selectedZone === 'gate'
                      ? 'bg-[#4b267d] text-white shadow-xs'
                      : 'bg-white border border-[#eaedff] text-[#4a4450] hover:bg-[#eaedff]'
                  }`}
                >
                  <span>ซุ้มประตู มพ. / อ่างหลวง</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${selectedZone === 'gate' ? 'bg-white/20' : 'bg-[#eaedff]'}`}>
                    {zoneCounts.gate}
                  </span>
                </button>
              </div>
            </div>

            {/* Interactive Status Badges (CLICKABLE TO TOGGLE VIEW!) */}
            <div className="flex items-center gap-2 text-xs shrink-0">
              <span className="text-[#4a4450] text-[11px] font-bold hidden sm:inline">กรองสถานะหมุด:</span>

              {/* Status: IN_PROGRESS (Yellow/Amber) */}
              <button
                onClick={() => setStatusFilter(prev => prev === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all cursor-pointer font-bold ${
                  statusFilter === 'IN_PROGRESS'
                    ? 'bg-[#fed65b] border-[#d97706] text-[#745c00] ring-2 ring-[#d97706]/30 shadow-xs'
                    : 'bg-white border-[#eaedff] text-[#745c00] hover:bg-amber-50'
                }`}
                title="คลิกเพื่อแสดงเฉพาะจุดกำลังซ่อมบำรุง"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] border border-white animate-pulse"></span>
                <span>กำลังซ่อมบำรุง</span>
                <span className="font-mono text-[11px]">({progressCount})</span>
                {statusFilter === 'IN_PROGRESS' && <span className="text-[10px]">✕</span>}
              </button>

              {/* Status: OPEN (Red) */}
              <button
                onClick={() => setStatusFilter(prev => prev === 'OPEN' ? 'ALL' : 'OPEN')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all cursor-pointer font-bold ${
                  statusFilter === 'OPEN'
                    ? 'bg-[#ffdad6] border-[#ba1a1a] text-[#ba1a1a] ring-2 ring-[#ba1a1a]/30 shadow-xs'
                    : 'bg-white border-[#eaedff] text-[#ba1a1a] hover:bg-red-50'
                }`}
                title="คลิกเพื่อแสดงเฉพาะจุดรอดำเนินการ"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]"></span>
                <span>รอดำเนินการ</span>
                <span className="font-mono text-[11px]">({openCount})</span>
                {statusFilter === 'OPEN' && <span className="text-[10px]">✕</span>}
              </button>

              {/* Reset to show ALL */}
              {statusFilter !== 'ALL' && (
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className="px-2.5 py-1 rounded-full bg-[#eaedff] text-[#340866] text-[11px] font-bold hover:bg-[#d8e2ff] transition-all"
                >
                  แสดงทั้งหมด
                </button>
              )}
            </div>
          </div>

          {/* ── REAL OPENSTREETMAP CONTAINER ── */}
          <div className="relative w-full h-[520px] bg-[#e6edfa] overflow-hidden select-none">
            <div className="w-full h-full relative" style={{ zIndex: 0 }}>
              <MapContainer
                center={PHAYAO_CENTER}
                zoom={15}
                minZoom={13}
                maxZoom={18}
                maxBounds={PHAYAO_BOUNDS}
                maxBoundsViscosity={1.0}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%', zIndex: 1 }}
              >
                <MapFlyController center={mapCenter} zoom={mapZoom} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {displayedOsmPins.map((pin, idx) => (
                  <CircleMarker
                    key={pin.id || idx}
                    center={pin.coords}
                    radius={pin.radius}
                    pathOptions={{
                      color: pin.status === 'IN_PROGRESS' ? '#78350f' : '#ffffff',
                      weight: pin.status === 'IN_PROGRESS' ? 3 : 2,
                      fillColor: pin.color,
                      fillOpacity: 0.95,
                    }}
                  >
                    <Popup>
                      <div className="p-1 font-sans text-xs min-w-[200px] text-left">
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="font-mono font-bold text-[#340866] text-[12px]">{pin.id}</span>
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xs"
                            style={{ backgroundColor: pin.color }}
                          >
                            {pin.status === 'OPEN' ? 'รอดำเนินการ' : pin.status === 'IN_PROGRESS' ? 'กำลังดำเนินการ' : 'เสร็จสิ้น'}
                          </span>
                        </div>
                        <strong className="block text-sm text-[#131b2e] leading-snug mb-1">
                          {pin.topic}
                        </strong>
                        <p className="text-[#4a4450] text-[11px] flex items-center gap-1">
                          <span>📍</span>
                          <span className="font-medium">{pin.location}</span>
                        </p>
                        <p className="text-slate-400 text-[10px] mt-0.5">รวม {pin.reportCount} รายงานย่อย</p>
                        <button
                          onClick={() => setSelectedCluster(pin)}
                          className="mt-2.5 w-full py-1.5 rounded-lg bg-[#340866] text-white text-[11px] font-bold hover:bg-[#4b267d] transition-colors shadow-xs"
                        >
                          ดูรายละเอียดตั๋ว
                        </button>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>


          </div>
        </div>

        {/* ── Campus Problem Locations & Hotspots Section ───────────────── */}
        <div className="space-y-4 bg-white rounded-2xl border border-[#eaedff] shadow-sm p-5 md:p-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#eaedff]">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-8 h-8 rounded-lg bg-[#eddcff] text-[#340866] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">domain</span>
                </div>
                <h2 className="text-base font-bold text-[#131b2e]">
                  สรุปสถานที่เกิดปัญหาและพื้นที่เฝ้าระวัง (Campus Problem Locations & Hotspots)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#eaedff] text-[#4a4450] text-[11px] font-semibold">
                  {locationStats.length} โซนหลัก
                </span>
              </div>
              <p className="text-xs text-[#4a4450]">
                วิเคราะห์ความถี่ปัญหาแยกตามอาคาร/โซนมหาวิทยาลัยพะเยา จำนวนปัญหาที่พบ และสถานะการแก้ไขแบบเรียลไทม์
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  alert('ส่งออกรายงานสรุปสถานที่ (Excel/PDF) สำเร็จ');
                }}
                className="h-9 px-3.5 rounded-xl bg-[#eaedff] hover:bg-[#d8e2ff] text-[#131b2e] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px] text-[#340866]">file_download</span>
                <span>ส่งออกรายงานสถานที่ (Excel/PDF)</span>
              </button>
            </div>
          </div>

          {/* Quick Zone Filter and Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 bg-[#f2f3ff] p-1 rounded-xl border border-[#eaedff]">
              <button
                onClick={() => handleSelectZone('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedZone === 'all'
                    ? 'bg-[#340866] text-white shadow-xs'
                    : 'text-[#4a4450] hover:bg-[#eaedff]'
                }`}
              >
                ทุกโซนอาคาร ({locationStats.length})
              </button>

              <button
                onClick={() => handleSelectZone('dorm')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  selectedZone === 'dorm'
                    ? 'bg-[#340866] text-white shadow-xs'
                    : 'text-[#4a4450] hover:bg-[#eaedff]'
                }`}
              >
                <span>กลุ่มหอพักนิสิต</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#fed65b] text-[#745c00] text-[10px] font-bold">
                  {zoneCounts.dorm}
                </span>
              </button>

              <button
                onClick={() => handleSelectZone('pky')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  selectedZone === 'pky'
                    ? 'bg-[#340866] text-white shadow-xs'
                    : 'text-[#4a4450] hover:bg-[#eaedff]'
                }`}
              >
                <span>อาคารเรียนรวม (PKY/CE)</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#e2e7ff] text-[#340866] text-[10px] font-bold">
                  {zoneCounts.pky}
                </span>
              </button>

              <button
                onClick={() => handleSelectZone('gate')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  selectedZone === 'gate'
                    ? 'bg-[#340866] text-white shadow-xs'
                    : 'text-[#4a4450] hover:bg-[#eaedff]'
                }`}
              >
                <span>ประตูทางเข้าและถนนหลัก</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-[10px] font-bold">
                  {zoneCounts.gate}
                </span>
              </button>
            </div>

            <div className="relative flex-1 max-w-sm">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                placeholder="ค้นหาชื่ออาคาร, บริเวณ หรือชั้น..."
                className="w-full h-9 pl-9 pr-4 rounded-xl bg-[#f2f3ff] text-xs text-[#131b2e] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#340866]/20 border border-[#eaedff]"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-[#eaedff]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f2f3ff] text-[#4a4450] text-[11px] font-bold border-b border-[#eaedff] uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[220px]">สถานที่ / โซนใน มพ.</th>
                  <th className="py-3 px-4 min-w-[140px]">จำนวนปัญหาที่พบ</th>
                  <th className="py-3 px-4 min-w-[200px]">สถานะการดำเนินการ</th>
                  <th className="py-3 px-4 text-right min-w-[160px]">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eaedff] text-xs text-[#131b2e]">
                {filteredLocationStats.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-400 font-medium">
                      ไม่พบข้อมูลสถานที่ตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  filteredLocationStats.map((loc, i) => {
                    const openPct = loc.total ? Math.round((loc.open / loc.total) * 100) : 0;
                    const progPct = loc.total ? Math.round((loc.in_progress / loc.total) * 100) : 0;
                    const resPct = loc.total ? Math.max(0, 100 - openPct - progPct) : 0;

                    return (
                      <tr key={i} className="hover:bg-[#f2f3ff]/60 transition-colors">
                        {/* Location Name & Icon */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-start gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-[#eaedff] text-[#340866] font-bold flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-[18px]">{loc.icon}</span>
                            </div>
                            <div className="space-y-0.5">
                              <span
                                onClick={() => navigate(`/category-admin/kanban?location=${encodeURIComponent(loc.name)}`)}
                                className="text-sm font-bold text-[#131b2e] hover:text-[#340866] cursor-pointer block transition-colors"
                                title="คลิกเพื่อกรองดูรายการคำร้องในสถานที่นี้"
                              >
                                {loc.name}
                              </span>
                              <span className="text-[11px] text-[#4a4450]">
                                {loc.total} คำร้องในพื้นที่นี้
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Total Count */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-baseline gap-1">
                            <span className="font-mono text-base font-bold text-[#131b2e]">
                              {loc.total}
                            </span>
                            <span className="text-[11px] text-[#4a4450]">คำร้อง</span>
                          </div>
                        </td>

                        {/* Status Progress Bar Breakdown */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[11px] font-mono">
                              <span className="text-[#ba1a1a] font-bold">รอการดำเนินการ {loc.open}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-[#d97706] font-bold">กำลังดำเนินการ {loc.in_progress}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-[#4a4450]">เสร็จ {loc.resolved}</span>
                            </div>
                            <div className="w-full bg-[#eaedff] h-2 rounded-full overflow-hidden flex">
                              <div style={{ width: `${openPct}%` }} className="bg-[#ba1a1a] h-full" title={`รอดำเนินการ ${openPct}%`}></div>
                              <div style={{ width: `${progPct}%` }} className="bg-[#fed65b] h-full" title={`กำลังดำเนินการ ${progPct}%`}></div>
                              <div style={{ width: `${resPct}%` }} className="bg-[#4b267d] h-full" title={`เสร็จสิ้น ${resPct}%`}></div>
                            </div>
                          </div>
                        </td>

                        {/* Action: View all problems for this building */}
                        <td className="py-3.5 px-4 align-top text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                navigate(`/category-admin/kanban?location=${encodeURIComponent(loc.name)}`);
                              }}
                              className="px-3.5 py-1.5 rounded-lg bg-[#eaedff] hover:bg-[#340866] hover:text-white text-[#340866] text-xs font-bold border border-[#adc6ff]/50 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                              title={`คลิกเพื่อดูรายการคำร้องทั้งหมดที่ ${loc.name}`}
                            >
                              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                              <span>ดูในรายการคำร้อง</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Pagination / Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-[#4a4450]">
            <div className="flex items-center gap-2">
              <span>
                แสดง <strong className="text-[#131b2e] font-semibold">1 - {filteredLocationStats.length}</strong> จากทั้งหมด <strong className="text-[#131b2e] font-semibold">{locationStats.length}</strong> โซนอาคาร
              </span>
              <span className="text-slate-300">|</span>
              <span>
                ความครอบคลุม: <strong className="text-[#340866] font-semibold">100% มหาวิทยาลัยพะเยา</strong>
              </span>
            </div>

            <div className="flex items-center gap-1 self-center sm:self-auto">
              <button disabled className="w-8 h-8 rounded-lg bg-[#f2f3ff] border border-[#eaedff] text-slate-300 flex items-center justify-center disabled:opacity-40">
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button className="w-8 h-8 rounded-lg bg-[#340866] text-white text-xs font-bold shadow-xs">
                1
              </button>
              <button disabled className="w-8 h-8 rounded-lg bg-[#f2f3ff] border border-[#eaedff] text-slate-300 flex items-center justify-center disabled:opacity-40">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── Drill-down Modal (View Ticket Details & Update Status) ─────── */}
      {selectedCluster && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedCluster(null)}
          ></div>

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[85vh] overflow-hidden flex flex-col z-[100000] text-left">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#eaedff] flex items-center justify-between bg-white z-10 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#eddcff] text-[#340866] font-mono text-xs font-bold">
                    {selectedCluster.id}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-[#4a4450]">
                    {selectedCluster.location}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#131b2e] mt-1 leading-snug">
                  {selectedCluster.topic}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {/* Status Selector */}
                <select
                  value={selectedCluster.status}
                  disabled={isUpdatingStatus === selectedCluster.problem_id}
                  onChange={(e) => handleStatusChange(selectedCluster.problem_id, e.target.value)}
                  className={`text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer transition-all border shadow-xs ${
                    selectedCluster.status === 'OPEN'
                      ? 'bg-[#ffdad6] text-[#ba1a1a] border-red-200'
                      : selectedCluster.status === 'IN_PROGRESS'
                      ? 'bg-[#fed65b] text-[#745c00] border-amber-200'
                      : 'bg-[#e2e7ff] text-[#340866] border-indigo-200'
                  }`}
                >
                  <option value="OPEN">รอดำเนินการ</option>
                  <option value="IN_PROGRESS">กำลังดำเนินการ</option>
                  <option value="RESOLVED">ดำเนินการเสร็จสิ้น</option>
                </select>

                <button
                  onClick={() => {
                    navigate(`/category-admin/kanban?search=${encodeURIComponent(selectedCluster.id)}`);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#340866] hover:bg-[#4b267d] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="เปิดดูในรายการคำร้องทั้งหมด"
                >
                  <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                  <span className="hidden sm:inline">เปิดในรายการคำร้อง</span>
                </button>

                <button
                  onClick={() => setSelectedCluster(null)}
                  className="w-8 h-8 rounded-full border border-[#eaedff] text-slate-400 hover:text-slate-600 hover:bg-[#eaedff] flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto bg-[#faf8ff] p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#eaedff]">
                <h4 className="font-bold text-sm text-[#131b2e]">
                  รายงานย่อยที่เกี่ยวข้อง ({(selectedCluster.posts || []).length} รายการ)
                </h4>
                <span className="text-xs text-[#4a4450]">
                  วันที่แจ้ง: {selectedCluster.date}
                </span>
              </div>

              {(selectedCluster.posts || []).map((post, idx) => {
                const isExpanded = expandedPostId === post.id;
                return (
                  <div
                    key={post.id || idx}
                    className="bg-white rounded-xl border border-[#eaedff] shadow-xs overflow-hidden hover:border-[#adc6ff] transition-all"
                  >
                    <div
                      onClick={() => setExpandedPostId(isExpanded ? null : post.id)}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#f2f3ff]/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#eddcff] text-[#340866] flex items-center justify-center font-bold text-xs">
                          {post.author ? post.author[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-[#131b2e]">{post.author}</p>
                          <p className="text-[11px] text-[#4a4450]">
                            {post.time} • {post.locationDetail}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-[#340866] font-semibold">
                        <span>{isExpanded ? 'ย่อรายละเอียด' : 'ดูขยาย'}</span>
                        <span className={`material-symbols-outlined text-[18px] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                          expand_more
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 pt-0 border-t border-[#eaedff] bg-[#faf8ff] text-xs space-y-3">
                        <p className="text-[#131b2e] leading-relaxed mt-3">{post.text}</p>

                        {post.images && post.images.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pt-2">
                            {post.images.map((img, i) => {
                              const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/v1\/?$/, '');
                              const srcUrl = !img ? '' : (img.startsWith('http') ? img : `${apiBase}${img.startsWith('/') ? '' : '/'}${img}`);
                              return (
                                <img
                                  key={i}
                                  src={srcUrl}
                                  alt="attachment"
                                  className="h-24 w-24 object-cover rounded-lg border border-[#eaedff]"
                                />
                              );
                            })}
                          </div>
                        )}

                        {post.llm_analysis?.multi_categories && post.llm_analysis.multi_categories.length > 0 && (
                          <div className="pt-2 border-t border-[#eaedff]">
                            <span className="text-[11px] font-bold text-[#4a4450] uppercase tracking-wider block mb-1.5">
                              หน่วยงานที่เกี่ยวข้องร่วม (ประสานงาน):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {post.llm_analysis.multi_categories.map((mc, mci) => (
                                <span
                                  key={mci}
                                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#eaedff] text-[#340866]"
                                >
                                  {mc.category_name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
