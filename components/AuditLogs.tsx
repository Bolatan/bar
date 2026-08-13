'use client';

import { useEffect, useState } from 'react';
import { api, type AuditLog } from '@/lib/api';
import { ClipboardList, Search, Shield, Calendar, ChevronDown, ChevronUp, RefreshCw, AlertCircle, Eye } from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('All');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  async function loadLogs() {
    setLoading(true);
    setError('');
    try {
      const res = await api.auditLogs.list();
      setLogs(res.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve audit logs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const uniqueActions = ['All', ...Array.from(new Set(logs.map((l) => l.action)))];

  const filteredLogs = logs.filter((log) => {
    const performerName = typeof log.userId === 'object' && log.userId ? log.userId.name : (log.userId || 'System');
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      performerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.entityType && log.entityType.toLowerCase().includes(searchQuery.toLowerCase())) ||
      JSON.stringify(log.details).toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = selectedAction === 'All' || log.action === selectedAction;

    return matchesSearch && matchesAction;
  });

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const getActionBadgeClass = (action: string) => {
    if (action.includes('delete') || action.includes('void')) {
      return 'bg-red-400/10 text-red-300 border border-red-400/20';
    }
    if (action.includes('create') || action.includes('open')) {
      return 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20';
    }
    if (action.includes('update') || action.includes('adjust')) {
      return 'bg-orange-400/10 text-orange-300 border border-orange-400/20';
    }
    return 'bg-sky-400/10 text-sky-300 border border-sky-400/20';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-emerald-300">Security & Compliance</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Audit Ledger</h1>
          <p className="mt-2 text-sm text-slate-400">
            Chronological record of system-critical events, administrative actions, and staff adjustments.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="button-primary inline-flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
          <AlertCircle size={18} className="shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <div className="panel overflow-hidden">
        {/* Filters */}
        <div className="flex flex-col gap-4 border-b border-white/5 p-5 md:flex-row md:items-center md:justify-between bg-[#0a1714]">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="field pl-10 bg-black/40 border-white/10 text-white"
              placeholder="Search by user, action, details..."
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400 whitespace-nowrap">Filter Action:</label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="field w-48 text-sm text-white bg-black border-white/10"
            >
              {uniqueActions.map((act) => (
                <option key={act} value={act}>
                  {act === 'All' ? 'All Actions' : act}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex h-96 items-center justify-center text-slate-400 gap-2">
            <RefreshCw size={18} className="animate-spin text-emerald-300" />
            Loading system audit ledger…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500 bg-white/[0.01]">
                <tr>
                  <th className="px-5 py-4 font-medium">Timestamp</th>
                  <th className="px-5 py-4 font-medium">Performed By</th>
                  <th className="px-5 py-4 font-medium">Action</th>
                  <th className="px-5 py-4 font-medium">Target Entity</th>
                  <th className="px-5 py-4 text-right font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const performer =
                    typeof log.userId === 'object' && log.userId
                      ? log.userId
                      : { name: log.userId || 'System', role: 'system' };

                  return (
                    <tr
                      key={log.id}
                      className="border-t border-white/5 transition hover:bg-white/[0.01] last:border-b-0"
                    >
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Calendar size={13} className="text-slate-500" />
                          <span>
                            {new Date(log.createdAt).toLocaleDateString('en-NG', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              timeZone: 'Africa/Lagos',
                            })}
                          </span>
                          <span className="text-slate-600">|</span>
                          <span className="text-slate-400">
                            {new Date(log.createdAt).toLocaleTimeString('en-NG', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              timeZone: 'Africa/Lagos',
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-400/15 text-[11px] font-bold text-purple-300">
                            {performer.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-200 text-sm">{performer.name}</p>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                              {performer.role}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${getActionBadgeClass(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {log.entityType ? (
                          <div>
                            <span className="text-slate-200 font-medium">{log.entityType}</span>
                            {log.entityId && (
                              <span className="text-slate-500 text-xs block font-mono mt-0.5">
                                ID: {log.entityId}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <button
                            onClick={() => toggleExpand(log.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 transition"
                          >
                            <Eye size={12} />
                            {isExpanded ? 'Hide Details' : 'View Details'}
                          </button>
                          {isExpanded && (
                            <div className="mt-3 w-full max-w-lg text-left p-4 rounded-xl border border-white/10 bg-black/60 font-mono text-xs text-emerald-400 overflow-x-auto shadow-inner">
                              <pre className="whitespace-pre-wrap break-all leading-relaxed">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!filteredLogs.length && (
              <div className="p-16 text-center text-slate-500">
                <ClipboardList size={32} className="mx-auto mb-4 text-slate-700" />
                <p className="text-sm font-medium">No ledger records matched your filters.</p>
                <p className="text-xs text-slate-600 mt-1">Try resetting the search or selecting all actions.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
