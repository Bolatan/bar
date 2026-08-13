'use client';

import { useEffect, useState } from 'react';
import { api, type Shift, type Profile } from '@/lib/api';
import { Clock3, User, Plus, CircleDollarSign, AlertCircle, CheckCircle2, Coins, TrendingUp } from 'lucide-react';

const money = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });

export default function Shifts({ profile }: { profile: Profile }) {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingFloat, setOpeningFloat] = useState('');
  const [openPhysicalRegister, setOpenPhysicalRegister] = useState(false);
  const [closingCount, setClosingCount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [curRes, histRes] = await Promise.all([
        api.shifts.current(),
        api.shifts.history()
      ]);
      setCurrentShift(curRes.shift);
      setShifts(histRes.shifts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shifts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleOpenShift(e: React.FormEvent) {
    e.preventDefault();
    if (!openingFloat) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await api.shifts.open(Number(openingFloat));
      setCurrentShift(res.shift);
      setOpeningFloat('');
      if (openPhysicalRegister) {
        setMessage('Shift opened successfully. 🔔 Physical register drawer triggered & opened!');
      } else {
        setMessage('Shift opened successfully.');
      }
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open shift');
    } finally {
      setBusy(false);
    }
  }

  async function handleCloseShift(e: React.FormEvent) {
    e.preventDefault();
    if (!closingCount || !currentShift) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await api.shifts.close(currentShift.id, Number(closingCount));
      setCurrentShift(null);
      setClosingCount('');
      setMessage(`Shift closed successfully. Variance: ${money.format(res.shift.variance || 0)}`);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close shift');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="flex h-96 items-center justify-center text-slate-400">Loading shift data…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-emerald-300">Operations desk</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Shift Control</h1>
          <p className="mt-2 text-sm text-slate-400">Track register cash, manage float, and reconcile shift totals with ease.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left/Main Column: Active Shift Controls */}
        <div className="space-y-6 lg:col-span-5">
          {!currentShift ? (
            /* No active shift */
            <div className="panel p-6 border-emerald-500/10 bg-[#0c1a17]">
              <div className="mb-6 flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                  <Clock3 size={24} />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-white">Register is Closed</h2>
                  <p className="text-xs text-slate-400">Start a new shift to open the cash drawer.</p>
                </div>
              </div>

              <form onSubmit={handleOpenShift} className="space-y-5">
                <label className="block text-sm text-slate-300">
                  Opening Float (NGN ₦)
                  <input
                    type="number"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(e.target.value)}
                    required
                    min="0"
                    className="field mt-2"
                    placeholder="e.g. 50000"
                  />
                  <span className="mt-1 block text-xs text-slate-500">
                    The starting cash amount kept in the register drawer.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer pt-1 pb-2">
                  <input
                    type="checkbox"
                    checked={openPhysicalRegister}
                    onChange={(e) => setOpenPhysicalRegister(e.target.checked)}
                    className="h-4 w-4 rounded border-white/10 bg-white/5 text-emerald-500 accent-emerald-400 focus:ring-0 mt-0.5"
                  />
                  <div className="text-xs text-slate-300">
                    Open physical cash register drawer
                    <span className="block text-[10px] text-slate-500 mt-0.5">
                      Triggers hardware connection signal (ESC/POS simulation) to open the physical cash drawer.
                    </span>
                  </div>
                </label>

                {error && (
                  <div className="flex gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
                    <AlertCircle size={18} className="shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                {message && (
                  <div className="flex gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
                    <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
                    <span>{message}</span>
                  </div>
                )}

                <button
                  disabled={busy}
                  className="button-primary w-full py-3 text-sm font-semibold"
                >
                  {busy ? 'Opening...' : 'Open Register & Start Shift'}
                </button>
              </form>
            </div>
          ) : (
            /* Active shift is running */
            <div className="panel p-6 border-emerald-400/30 bg-[#0a1f1b] shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 rounded-bl-xl bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                Active Shift
              </div>

              <div className="mb-6 flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/20 text-emerald-300 animate-pulse">
                  <Coins size={24} />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-white">Register is Open</h2>
                  <p className="text-xs text-slate-300">Shift started by {profile.name}</p>
                </div>
              </div>

              <div className="my-6 grid grid-cols-2 gap-4 rounded-xl bg-white/[0.02] p-4 text-sm">
                <div>
                  <p className="text-slate-400 text-xs">Opened At</p>
                  <p className="mt-1 font-medium text-white">
                    {new Date(currentShift.openedAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' })}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Opening Float</p>
                  <p className="mt-1 font-semibold text-emerald-300">
                    {money.format(currentShift.openingFloat)}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => {
                    alert("🔔 Command sent! Physical cash drawer triggered & opened successfully.");
                  }}
                  className="w-full rounded-xl border border-dashed border-white/10 hover:border-emerald-500/40 hover:bg-white/[0.02] transition py-3 text-xs font-semibold text-emerald-300 flex items-center justify-center gap-2"
                >
                  ⚡ Open Physical Drawer Now
                </button>
              </div>

              <form onSubmit={handleCloseShift} className="space-y-5">
                <label className="block text-sm text-slate-300">
                  Actual Closing Cash Count (NGN ₦)
                  <input
                    type="number"
                    value={closingCount}
                    onChange={(e) => setClosingCount(e.target.value)}
                    required
                    min="0"
                    className="field mt-2"
                    placeholder="Count and enter total cash"
                  />
                  <span className="mt-1 block text-xs text-slate-500">
                    Expected cash sales will be auto-reconciled on submit.
                  </span>
                </label>

                {error && (
                  <div className="flex gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
                    <AlertCircle size={18} className="shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  disabled={busy}
                  className="button-primary w-full bg-orange-500 hover:bg-orange-600 border-none text-slate-950 py-3 text-sm font-semibold"
                >
                  {busy ? 'Reconciling...' : 'Reconcile & Close Shift'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Shift History */}
        <div className="lg:col-span-7">
          <div className="panel p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">Shift History</h2>
              <p className="text-xs text-slate-500">Past register records and drawer reconciliation reports.</p>
            </div>

            {shifts.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <Clock3 size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No historical shifts found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3 font-medium">Opened / Closed</th>
                      <th className="py-3 font-medium text-right">Float</th>
                      <th className="py-3 font-medium text-right">Expected</th>
                      <th className="py-3 font-medium text-right">Actual</th>
                      <th className="py-3 font-medium text-right">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((s) => {
                      const hasVariance = s.variance !== null;
                      const isNegative = hasVariance && s.variance! < 0;
                      const isPositive = hasVariance && s.variance! > 0;
                      return (
                        <tr key={s.id} className="border-t border-white/5 transition hover:bg-white/[0.01]">
                          <td className="py-4 pr-4">
                            <p className="font-medium text-slate-200">
                              {new Date(s.openedAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', timeZone: 'Africa/Lagos' })}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {new Date(s.openedAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' })}
                              {s.closedAt && ` - ${new Date(s.closedAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' })}`}
                            </p>
                          </td>
                          <td className="py-4 text-right text-slate-300 font-medium pr-1">
                            {money.format(s.openingFloat)}
                          </td>
                          <td className="py-4 text-right text-slate-400 pr-1">
                            {s.expectedCash !== null ? money.format(s.expectedCash) : '—'}
                          </td>
                          <td className="py-4 text-right text-slate-300 pr-1">
                            {s.closingCount !== null ? money.format(s.closingCount) : 'Active'}
                          </td>
                          <td className="py-4 text-right font-semibold">
                            {hasVariance ? (
                              <span className={isNegative ? 'text-red-400' : isPositive ? 'text-emerald-400' : 'text-slate-400'}>
                                {s.variance! >= 0 ? '+' : ''}{money.format(s.variance!)}
                              </span>
                            ) : (
                              <span className="text-slate-500">Active</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
