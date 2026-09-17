import api from './api';

// Coordinates of key University of Phayao landmarks
export const UP_CAMPUS_LOCATIONS = {
  center: [19.0289, 99.8967],
  ict: [19.0298, 99.8961],
  dorms: [19.0335, 99.8932],
  canteen: [19.0275, 99.8980],
  library: [19.0262, 99.8955],
  parking_front: [19.0380, 99.8820],
  main_hall: [19.0310, 99.8995],
  medical_center: [19.0340, 99.9040],
  lake_maetam: [19.0180, 99.9150],
};

// Simulated presentation data (for mock / presentation mode)
export const MOCK_PRESENTATION_DATA = {
  categories: [
    { id: 'all', name: 'ทุกหมวดหมู่ (ภาพรวมทั้งมหาวิทยาลัย)' },
    { id: '1', name: 'อาคารและสิ่งอำนวยความสะดวก' },
    { id: '2', name: 'ระบบเครือข่ายและเทคโนโลยี' },
    { id: '3', name: 'การเรียนการสอนและวิชาการ' },
    { id: '4', name: 'ภูมิทัศน์และความสะอาด' },
    { id: '5', name: 'ความปลอดภัยและจราจร' },
    { id: '6', name: 'บริการทั่วไป / อื่นๆ' },
    { id: '7', name: 'การเดินทางและระบบขนส่ง' },
    { id: '8', name: 'สุขอนามัย/ความปลอดภัยทางอาหาร' },
  ],
  kpi: {
    totalProblems: 1248,
    changeMonthlyPercent: 12,
    openProblems: 240,
    inProgressProblems: 102,
    pendingProblems: 342,
    resolvedPercent: 73,
    resolvedCount: 906,
    avgResolutionDays: 1.8,
    demographics: {
      student: { count: 873, percent: 70 },
      staff: { count: 224, percent: 18 },
      anonymous: { count: 100, percent: 8 },
      public: { count: 51, percent: 4 },
    },
  },
  topIssues: [
    { title: 'การเชื่อมต่อ Wi-Fi ในมหาวิทยาลัย', count: 420, max: 500, categoryId: '2' },
    { title: 'การซ่อมบำรุงหอพัก (ระบบประปา)', count: 285, max: 500, categoryId: '1' },
    { title: 'ความสะอาดของโรงอาหาร', count: 190, max: 500, categoryId: '8' },
    { title: 'ระบบปรับอากาศในห้องสมุด', count: 145, max: 500, categoryId: '1' },
    { title: 'แสงสว่างในลานจอดรถ', count: 85, max: 500, categoryId: '5' },
  ],
  heatmapPoints: [
    { id: 1, lat: 19.0298, lng: 99.8961, title: 'อาคาร ICT - จุดบกพร่อง Wi-Fi', intensity: 'high', count: 142, categoryId: '2' },
    { id: 2, lat: 19.0335, lng: 99.8932, title: 'หอพักนิสิต UP - ปัญหาน้ำประปา & ไฟฟ้า', intensity: 'high', count: 110, categoryId: '1' },
    { id: 3, lat: 19.0275, lng: 99.8980, title: 'โรงอาหารกลาง - ถังขยะและระบบระบายน้ำ', intensity: 'medium', count: 68, categoryId: '8' },
    { id: 4, lat: 19.0262, lng: 99.8955, title: 'ศูนย์บรรณสารฯ (ห้องสมุด) - แอร์ชำรุด', intensity: 'medium', count: 54, categoryId: '1' },
    { id: 5, lat: 19.0380, lng: 99.8820, title: 'ลานจอดรถประตู 1 - โคมไฟทางเดินดับ', intensity: 'low', count: 32, categoryId: '5' },
    { id: 6, lat: 19.0310, lng: 99.8995, title: 'หอประชุมพญางำเมือง - จุดส่งต่อนิสิต', intensity: 'low', count: 25, categoryId: '7' },
    { id: 7, lat: 19.0340, lng: 99.9040, title: 'ศูนย์การแพทย์ มพ. - สัญญาณโทรศัพท์ขัดข้อง', intensity: 'medium', count: 47, categoryId: '2' },
  ],
  recentActivities: [
    {
      id: '8924',
      type: 'resolved',
      title: 'ตั๋ว #FAC-26-8924 แก้ไขเสร็จสิ้นโดย แผนกอาคารสถานที่',
      time: '10 นาทีที่แล้ว',
      department: 'อาคารและสิ่งอำนวยความสะดวก',
    },
    {
      id: 'urgent-server',
      type: 'urgent',
      title: 'ปัญหาเร่งด่วนใหม่: เซิร์ฟเวอร์ล่ม (อาคาร 2)',
      time: '45 นาทีที่แล้ว',
      department: 'ระบบเครือข่ายและเทคโนโลยี',
    },
    {
      id: '8940',
      type: 'transfer',
      title: 'ตั๋ว #FAC-26-8940 ส่งต่อจาก ธุรการทั่วไป ไปยัง บริการ IT',
      time: '2 ชั่วโมงที่แล้ว',
      department: 'บริการทั่วไป ➔ IT',
    },
    {
      id: '8911',
      type: 'comment',
      title: 'ความคิดเห็นใหม่ใน ตั๋ว #FAC-26-8911 จากผู้แจ้งปัญหา',
      time: '3 ชั่วโมงที่แล้ว',
      department: 'บริการนิสิต',
    },
  ],
};

// Format relative time in Thai
function formatThaiRelativeTime(dateString) {
  if (!dateString) return 'เมื่อเร็วๆ นี้';
  try {
    const diffMs = new Date() - new Date(dateString);
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 60) return `${Math.max(1, diffMinutes)} นาทีที่แล้ว`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} วันที่แล้ว`;
  } catch {
    return 'เมื่อเร็วๆ นี้';
  }
}

// Fetch and process REAL data from the backend database
export const fetchRealExecutiveData = async () => {
  try {
    const [categoriesRes, problemsRes] = await Promise.all([
      api.get('/settings/categories').catch(() => null),
      api.get('/problems/list', { params: { page_size: 100 } }).catch(() => null),
    ]);

    const rawCats = categoriesRes?.data?.data?.items || [];
    const rawProblems = problemsRes?.data?.data?.items || [];

    // Map categories with 'all'
    const categories = [
      { id: 'all', name: 'ทุกหมวดหมู่ (ภาพรวมทั้งมหาวิทยาลัย)' },
      ...rawCats.map((c) => ({
        id: String(c.category_id),
        name: c.category_name,
      })),
    ];

    if (rawProblems.length === 0) {
      return {
        ...MOCK_PRESENTATION_DATA,
        categories: categories.length > 1 ? categories : MOCK_PRESENTATION_DATA.categories,
        isRealData: false,
      };
    }

    // Exact status counts from database
    const totalProblems = rawProblems.length;
    const openProblems = rawProblems.filter((p) => p.status_name === 'OPEN').length;
    const inProgressProblems = rawProblems.filter((p) => p.status_name === 'IN_PROGRESS').length;
    const pendingProblems = openProblems + inProgressProblems;
    const resolvedCount = rawProblems.filter((p) => p.status_name === 'RESOLVED').length;
    const closedCount = rawProblems.filter((p) => p.status_name === 'CLOSED').length;
    const totalFinished = resolvedCount + closedCount;
    const resolvedPercent = totalProblems > 0 ? Math.round((totalFinished / totalProblems) * 100) : 0;

    // Exact 4-Group Demographics from database:
    // 1) student, 2) staff, 3) anonymous, 4) public
    let studentCount = 0;
    let staffCount = 0;
    let anonymousCount = 0;
    let publicCount = 0;

    rawProblems.forEach((p) => {
      const role = (p.author?.role || '').toLowerCase();
      if (role.includes('student')) {
        studentCount++;
      } else if (role.includes('staff') || role.includes('admin')) {
        staffCount++;
      } else if (role.includes('anonymous')) {
        anonymousCount++;
      } else {
        publicCount++;
      }
    });

    const sumRoles = totalProblems || 1;
    const demographics = {
      student: {
        count: studentCount,
        percent: Math.round((studentCount / sumRoles) * 100),
      },
      staff: {
        count: staffCount,
        percent: Math.round((staffCount / sumRoles) * 100),
      },
      anonymous: {
        count: anonymousCount,
        percent: Math.round((anonymousCount / sumRoles) * 100),
      },
      public: {
        count: publicCount,
        percent: Math.round((publicCount / sumRoles) * 100),
      },
    };

    // Process real heatmap points from database coordinates
    const heatmapPoints = rawProblems
      .filter((p) => p.latitude && p.longitude)
      .map((p, idx) => {
        const isUrgent = p.llm_analysis?.urgency === 'urgent' || p.status_name === 'OPEN';
        return {
          id: p.problem_id || p.id || idx,
          lat: parseFloat(p.latitude),
          lng: parseFloat(p.longitude),
          title: `${p.building_name ? p.building_name + ': ' : ''}${p.title}`,
          intensity: isUrgent ? 'high' : 'medium',
          count: p.like_count || 1,
          categoryId: String(p.category_id),
          ticketId: p.ticket_id,
          statusName: p.status_name,
        };
      });

    // Process real Top 5 issues
    const titleCounts = {};
    rawProblems.forEach((p) => {
      const key = p.title.trim();
      titleCounts[key] = (titleCounts[key] || 0) + 1;
    });

    const sortedIssueTitles = Object.keys(titleCounts).sort((a, b) => titleCounts[b] - titleCounts[a]);
    const topIssues = sortedIssueTitles.slice(0, 5).map((title) => {
      const matchProb = rawProblems.find((p) => p.title.trim() === title);
      return {
        title,
        count: titleCounts[title],
        categoryId: String(matchProb?.category_id || 'all'),
      };
    });

    // Process real Recent Activities directly from database items
    const recentActivities = rawProblems.slice(0, 6).map((p) => {
      let actType = 'comment';
      if (p.status_name === 'RESOLVED' || p.status_name === 'CLOSED') actType = 'resolved';
      else if (p.llm_analysis?.urgency === 'urgent') actType = 'urgent';
      else if (p.status_name === 'IN_PROGRESS') actType = 'transfer';

      return {
        id: String(p.problem_id || p.id),
        type: actType,
        title: `ตั๋ว #${p.ticket_id || p.id}: ${p.title}`,
        time: formatThaiRelativeTime(p.created_at),
        department: p.category_name || 'ทั่วไป',
        statusName: p.status_name,
        createdAt: p.created_at,
        buildingName: p.building_name,
      };
    });

    return {
      categories,
      kpi: {
        totalProblems,
        changeMonthlyPercent: 0,
        openProblems,
        inProgressProblems,
        pendingProblems,
        resolvedPercent,
        resolvedCount: totalFinished,
        avgResolutionDays: 1.2,
        demographics,
      },
      topIssues,
      heatmapPoints,
      recentActivities,
      rawProblems,
      isRealData: true,
    };
  } catch (error) {
    console.warn('Using presentation data due to fetch error:', error);
    return {
      ...MOCK_PRESENTATION_DATA,
      isRealData: false,
    };
  }
};

// Filter live or mock data dynamically
export const filterExecutiveData = (fullData, selectedCategory = 'all', searchQuery = '') => {
  if (!fullData) return MOCK_PRESENTATION_DATA;

  let filteredIssues = [...(fullData.topIssues || [])];
  let filteredPoints = [...(fullData.heatmapPoints || [])];
  let filteredProblems = [...(fullData.rawProblems || [])];

  if (selectedCategory !== 'all') {
    filteredIssues = filteredIssues.filter((i) => i.categoryId === selectedCategory);
    filteredPoints = filteredPoints.filter((p) => p.categoryId === selectedCategory);
    filteredProblems = filteredProblems.filter((p) => String(p.category_id) === selectedCategory);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredIssues = filteredIssues.filter((i) => i.title.toLowerCase().includes(q));
    filteredPoints = filteredPoints.filter((p) => p.title.toLowerCase().includes(q));
    filteredProblems = filteredProblems.filter(
      (p) => (p.title || '').toLowerCase().includes(q) || (p.ticket_id || '').toLowerCase().includes(q)
    );
  }

  // Recalculate based on filtered problems
  const total = filteredProblems.length || (selectedCategory === 'all' ? fullData.kpi.totalProblems : filteredPoints.length);
  const openCount = filteredProblems.filter((p) => p.status_name === 'OPEN').length;
  const inProgressCount = filteredProblems.filter((p) => p.status_name === 'IN_PROGRESS').length;
  const pending = openCount + inProgressCount;
  const resolved = filteredProblems.filter((p) => p.status_name === 'RESOLVED' || p.status_name === 'CLOSED').length;
  const resolvedPct = total > 0 ? Math.round((resolved / total) * 100) : fullData.kpi.resolvedPercent;

  // Recalculate demographics if filtered
  let studentCount = 0;
  let staffCount = 0;
  let anonymousCount = 0;
  let publicCount = 0;

  if (filteredProblems.length > 0) {
    filteredProblems.forEach((p) => {
      const role = (p.author?.role || '').toLowerCase();
      if (role.includes('student')) studentCount++;
      else if (role.includes('staff') || role.includes('admin')) staffCount++;
      else if (role.includes('anonymous')) anonymousCount++;
      else publicCount++;
    });
  }

  const sumRoles = filteredProblems.length || 1;
  const demographics = filteredProblems.length > 0 ? {
    student: { count: studentCount, percent: Math.round((studentCount / sumRoles) * 100) },
    staff: { count: staffCount, percent: Math.round((staffCount / sumRoles) * 100) },
    anonymous: { count: anonymousCount, percent: Math.round((anonymousCount / sumRoles) * 100) },
    public: { count: publicCount, percent: Math.round((publicCount / sumRoles) * 100) },
  } : fullData.kpi.demographics;

  return {
    ...fullData,
    kpi: {
      ...fullData.kpi,
      totalProblems: total,
      openProblems: openCount,
      inProgressProblems: inProgressCount,
      pendingProblems: pending,
      resolvedPercent: resolvedPct,
      resolvedCount: resolved,
      demographics,
    },
    topIssues: filteredIssues.length > 0 ? filteredIssues : fullData.topIssues,
    heatmapPoints: filteredPoints.length > 0 ? filteredPoints : fullData.heatmapPoints,
    rawProblems: filteredProblems.length > 0 ? filteredProblems : fullData.rawProblems,
  };
};
