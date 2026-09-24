// src/utils/authorUtils.js
/**
 * Strict User Privacy & Role Masking Utility
 * Ensures personal real names and emails are NEVER exposed in the UI.
 * Classifies submitters into predefined university roles with corresponding icons,
 * emojis, and badge passes.
 */

export const getAnonymousAuthor = (ticket) => {
  if (!ticket) {
    return {
      name: 'ผู้ใช้งานระบบ',
      roleTitle: 'นิสิต มพ.',
      icon: 'school',
      emoji: '🎓',
      passTag: 'UP-DORM-PASS',
      avatarBg: 'bg-[#340866]/10 text-[#340866]',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200'
    };
  }

  // 1. Check Explicit Anonymous
  const isAnon = Boolean(
    ticket.is_anonymous ||
    ticket.author?.is_anonymous ||
    ticket.author?.role === 'anonymous' ||
    (typeof ticket.author_name === 'string' && ticket.author_name.includes('ไม่ระบุตัวตน')) ||
    (typeof ticket.author?.display_name === 'string' && ticket.author.display_name.includes('ไม่ระบุตัวตน'))
  );

  if (isAnon) {
    return {
      name: 'ผู้แจ้งไม่ประสงค์ออกนาม',
      roleTitle: 'ไม่ระบุตัวตน',
      icon: 'visibility_off',
      emoji: '👤',
      passTag: 'UP-ANONYMOUS',
      avatarBg: 'bg-slate-100 text-slate-600',
      badgeBg: 'bg-slate-100 text-slate-600 border-slate-200'
    };
  }

  // 2. Extract role and raw identity strings
  const role = (ticket.author?.role || ticket.role || '').toLowerCase();
  const rawId = String(ticket.author?.student_id || ticket.student_id || ticket.author?.username || ticket.author?.email || ticket.author_name || '');
  const email = String(ticket.author?.email || '').toLowerCase();

  // 3. Staff / Faculty / Teacher / Officer / Admin
  if (
    role.includes('staff') ||
    role.includes('admin') ||
    role.includes('officer') ||
    role.includes('teacher') ||
    role.includes('อาจารย์') ||
    role.includes('บุคลากร')
  ) {
    return {
      name: 'บุคลากร',
      roleTitle: 'บุคลากรมหาวิทยาลัยพะเยา',
      icon: 'badge',
      emoji: '🪪',
      passTag: 'UP-STAFF-PASS',
      avatarBg: 'bg-sky-100 text-sky-700',
      badgeBg: 'bg-sky-50 text-sky-700 border-sky-200'
    };
  }

  // 4. Alumni (ศิษย์เก่า)
  if (role.includes('alumni') || role.includes('ศิษย์เก่า')) {
    return {
      name: 'ศิษย์เก่า มพ.',
      roleTitle: 'ศิษย์เก่ามหาวิทยาลัยพะเยา',
      icon: 'workspace_premium',
      emoji: '🏅',
      passTag: 'UP-ALUMNI-PASS',
      avatarBg: 'bg-amber-100 text-amber-700',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200'
    };
  }

  // 5. Parent / Guardian (ผู้ปกครอง)
  if (role.includes('parent') || role.includes('guardian') || role.includes('ผู้ปกครอง')) {
    return {
      name: 'ผู้ปกครอง',
      roleTitle: 'ผู้ปกครองนิสิต',
      icon: 'family_restroom',
      emoji: '👨‍👩‍👧',
      passTag: 'UP-GUARDIAN-PASS',
      avatarBg: 'bg-rose-100 text-rose-700',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200'
    };
  }

  // 6. General Public (บุคคลทั่วไป / อีเมลภายนอกที่ไม่ใช่ @up.ac.th และไม่มีรหัสนิสิต)
  if (
    role.includes('public') ||
    role.includes('external') ||
    role.includes('ทั่วไป') ||
    (email && !email.includes('@up.ac.th') && !rawId.match(/6[0-9]{6,}/))
  ) {
    return {
      name: 'บุคคลทั่วไป',
      roleTitle: 'บุคคลภายนอก / ทั่วไป',
      icon: 'public',
      emoji: '🌐',
      passTag: 'UP-PUBLIC-PASS',
      avatarBg: 'bg-teal-100 text-teal-700',
      badgeBg: 'bg-teal-50 text-teal-700 border-teal-200'
    };
  }

  // 7. Student (นิสิต มพ. <2 ตัวหน้าของรหัส>)
  // Look for 2-digit admission cohort (e.g. 64, 65, 66, 67, 68)
  const match = rawId.match(/(?:^|\D)(6[0-9])/);
  const year = match ? match[1] : '66';

  return {
    name: `นิสิต มพ. ${year}`,
    roleTitle: `นิสิต มพ.`,
    icon: 'school',
    emoji: '🎓',
    passTag: 'UP-DORM-PASS',
    avatarBg: 'bg-[#340866]/10 text-[#340866]',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200'
  };
};
