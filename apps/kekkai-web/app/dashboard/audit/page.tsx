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
        <h1 className="text-2xl font-bold text-white mb-2">Audit Logs</h1>
        <p className="text-neutral-400">
          Immutable record of all security and access events. 
          Values are redacted from logs to maintain the fail-closed security posture.
        </p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400">
            <tr>
              <th className="px-6 py-4 font-medium">Timestamp</th>
              <th className="px-6 py-4 font-medium">Action</th>
              <th className="px-6 py-4 font-medium">Actor</th>
              <th className="px-6 py-4 font-medium">Resource</th>
              <th className="px-6 py-4 font-medium">Hash Chain</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800 text-neutral-300">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                  No audit logs found.
                </td>
              </tr>
            ) : (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-neutral-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-neutral-400 font-mono text-xs">
                    {new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                  </td>
                  <td className="px-6 py-4 font-medium text-white">
                    <span className="bg-neutral-800 px-2 py-1 rounded">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-white">{log.user?.email || 'System'}</span>
                      <span className="text-xs text-neutral-500 font-mono">{log.ipAddress || 'unknown ip'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-white capitalize">{log.resourceType.toLowerCase()}</span>
                      <span className="text-xs text-neutral-500 font-mono max-w-[150px] truncate" title={log.resourceId}>
                        {log.resourceId}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-neutral-500 truncate max-w-[120px]" title={log.rowHash}>
                    {log.rowHash ? log.rowHash.substring(0, 16) + '...' : 'legacy'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-neutral-950 border-t border-neutral-800 px-6 py-4 flex items-center justify-between">
            <span className="text-sm text-neutral-400">
              Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, total)} of {total} results
            </span>
            <div className="flex gap-2">
              <a
                href={page > 1 ? `/dashboard/audit?page=${page - 1}` : '#'}
                className={`px-3 py-1 rounded border border-neutral-800 ${page > 1 ? 'hover:bg-neutral-800 text-white' : 'opacity-50 cursor-not-allowed text-neutral-500'}`}
              >
                Previous
              </a>
              <a
                href={page < totalPages ? `/dashboard/audit?page=${page + 1}` : '#'}
                className={`px-3 py-1 rounded border border-neutral-800 ${page < totalPages ? 'hover:bg-neutral-800 text-white' : 'opacity-50 cursor-not-allowed text-neutral-500'}`}
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
