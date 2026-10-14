import React from 'react';
import { getAuditLogs } from '@/app/actions';

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const data = await getAuditLogs(undefined, page, 50);

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="pb-3 md:pb-4 border-b border-border-primary">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[10px] font-bold text-brand-dark bg-brand-soft px-2 py-0.5 border border-brand-primary/20 uppercase">
            COMPLIANCE // AUDIT
          </span>
        </div>
        <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-extrabold uppercase tracking-tight text-text-primary">
          Audit Logs
        </h1>
        <p className="text-text-secondary text-xs sm:text-sm font-sans mt-0.5">
          Immutable cryptographic log of all access events. Values are never recorded to preserve zero-trust integrity.
        </p>
      </div>

      <div className="border-brutal bg-bg-surface shadow-brutal pixel-corners overflow-hidden">
        {/* 3-dot window bar */}
        <div className="h-8 bg-bg-secondary border-b border-border-primary flex items-center px-4 gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-border-primary"></div>
          <span className="text-[11px] font-mono text-text-muted ml-2">logs // immutable-ledger</span>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-bg-secondary border-b border-border-primary text-text-secondary font-mono uppercase text-xs">
            <tr>
              <th className="px-4 md:px-6 py-2.5 font-bold">Timestamp</th>
              <th className="px-4 md:px-6 py-2.5 font-bold">Action</th>
              <th className="px-4 md:px-6 py-2.5 font-bold">Actor</th>
              <th className="px-4 md:px-6 py-2.5 font-bold">Resource</th>
              <th className="px-4 md:px-6 py-2.5 font-bold">Hash Chain</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-primary text-text-primary">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-text-secondary font-mono text-xs">
                  No audit logs recorded yet.
                </td>
              </tr>
            ) : (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-bg-secondary/40 transition-colors">
                  <td className="px-4 md:px-6 py-3 whitespace-nowrap text-text-secondary font-mono text-xs">
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td className="px-4 md:px-6 py-3 font-mono text-xs">
                    <span className="bg-brand-soft border border-brand-primary/20 text-brand-dark px-2 py-0.5 pixel-corners uppercase font-bold text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-3">
                    <div className="flex flex-col">
                      <span className="text-text-primary font-bold text-xs font-mono">{log.user?.email || 'System'}</span>
                      <span className="text-[10px] text-text-secondary font-mono">{log.ipAddress || 'unknown ip'}</span>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-3">
                    <div className="flex flex-col">
                      <span className="text-text-primary font-bold text-xs font-mono capitalize">
                        {(log.resourceType || 'system').toLowerCase()}
                      </span>
                      <span className="text-[10px] text-text-secondary font-mono max-w-[150px] truncate" title={log.resourceId || ''}>
                        {log.resourceId || '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-3 font-mono text-xs text-text-secondary truncate max-w-[120px]" title={log.rowHash}>
                    {log.rowHash ? log.rowHash.substring(0, 16) + '...' : 'legacy'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-bg-secondary border-t border-border-primary px-6 py-3 flex items-center justify-between">
            <span className="text-xs text-text-secondary font-mono">
              Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, total)} of {total} records
            </span>
            <div className="flex gap-2">
              <a
                href={page > 1 ? `/dashboard/audit?page=${page - 1}` : '#'}
                className={`px-3 py-1 pixel-corners border border-border-primary font-mono text-xs ${page > 1 ? 'hover:bg-brand-primary hover:text-white bg-bg-surface text-text-primary transition-colors' : 'opacity-40 cursor-not-allowed text-text-secondary bg-bg-surface'}`}
              >
                Prev
              </a>
              <a
                href={page < totalPages ? `/dashboard/audit?page=${page + 1}` : '#'}
                className={`px-3 py-1 pixel-corners border border-border-primary font-mono text-xs ${page < totalPages ? 'hover:bg-brand-primary hover:text-white bg-bg-surface text-text-primary transition-colors' : 'opacity-40 cursor-not-allowed text-text-secondary bg-bg-surface'}`}
              >
                Next
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatTimestamp(raw: any): string {
  if (!raw) return '—';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw);
    return d.toISOString().replace('T', ' ').substring(0, 19);
  } catch {
    return String(raw);
  }
}
