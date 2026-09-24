/**
 * ReportIssuePage.tsx
 *
 * Wraps ReportProblem component so both /report and /report-issue
 * deliver the unified, modern UP Connect reporting experience.
 */

import ReportProblem from '../components/ReportProblem';

export default function ReportIssuePage() {
  const roleId = Number(localStorage.getItem('role_id') ?? 0);

  return (
    <ReportProblem
      roleId={roleId}
      onSuccess={() => {
        console.log('Problem reported successfully!');
      }}
      onUnauthorized={() => {
        window.location.href = '/login';
      }}
    />
  );
}
