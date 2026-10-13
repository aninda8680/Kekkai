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
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-2 font-mono uppercase">Audit Logs</h1>
        <p className="text-text-secondary">
          Immutable record of all security and access events. 
          Values are redacted from logs to maintain the fail-closed security posture.
        </p>
      </div>

      <div className="bg-bg-surface border-brutal rounded-none overflow-hidden shadow-brutal">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg-elevated border-b border-border-primary text-text-secondary font-mono uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-bold">Timestamp</th>
              <th className="px-6 py-4 font-bold">Action</th>
              <th className="px-6 py-4 font-bold">Actor</th>
              <th className="px-6 py-4 font-bold">Resource</th>
              <th className="px-6 py-4 font-bold">Hash Chain</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-primary text-text-primary">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-text-secondary font-mono">
                  No audit logs found.
                </td>
              </tr>
            ) : (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-bg-elevated transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-text-secondary font-mono text-xs">
                    {new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                  </td>
                  <td className="px-6 py-4 font-bold font-mono text-xs text-brand-primary">
                    <span className="bg-brand-soft border border-brand-primary px-2 py-1 rounded-none uppercase">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-text-primary font-medium">{log.user?.email || 'System'}</span>
                      <span className="text-xs text-text-secondary font-mono">{log.ipAddress || 'unknown ip'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-text-primary font-medium capitalize">{log.resourceType.toLowerCase()}</span>
                      <span className="text-xs text-text-secondary font-mono max-w-[150px] truncate" title={log.resourceId}>
                        {log.resourceId}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-text-secondary truncate max-w-[120px]" title={log.rowHash}>
                    {log.rowHash ? log.rowHash.substring(0, 16) + '...' : 'legacy'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-bg-elevated border-t border-border-primary px-6 py-4 flex items-center justify-between">
            <span className="text-sm text-text-secondary font-mono">
              Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, total)} of {total} results
            </span>
            <div className="flex gap-2">
              <a
                href={page > 1 ? `/dashboard/audit?page=${page - 1}` : '#'}
                className={`px-3 py-1 rounded-none border border-border-primary font-mono text-sm ${page > 1 ? 'hover:bg-brand-primary hover:text-white bg-bg-surface text-text-primary transition-colors' : 'opacity-50 cursor-not-allowed text-text-secondary bg-bg-surface'}`}
              >
                Prev
              </a>
              <a
                href={page < totalPages ? `/dashboard/audit?page=${page + 1}` : '#'}
                className={`px-3 py-1 rounded-none border border-border-primary font-mono text-sm ${page < totalPages ? 'hover:bg-brand-primary hover:text-white bg-bg-surface text-text-primary transition-colors' : 'opacity-50 cursor-not-allowed text-text-secondary bg-bg-surface'}`}
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
