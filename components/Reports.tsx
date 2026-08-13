'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { TrendingUp, ClipboardList, AlertTriangle, DollarSign, Users, Percent, Beer, Boxes } from 'lucide-react';

const money = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });

type SubView = 'sales' | 'valuation' | 'lowstock';

interface SalesData {
  period: string;
  orderCount: number;
  revenue: number;
  vat: number;
  byCategory: { category: string; total: number }[];
  topProducts: { name: string; quantity: number }[];
  byStaff: { name: string; total: number }[];
}

interface ValuationData {
  totalValue: number;
  items: { name: string; category: string; stockQuantity: number; costPrice: number; value: number }[];
}

interface LowStockData {
  products: { id: string; name: string; category: string; stockQuantity: number; reorderThreshold: number; unit: string }[];
}

export default function Reports() {
  const [subView, setSubView] = useState<SubView>('sales');
  const [salesPeriod, setSalesPeriod] = useState<string>('daily');
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [valuationData, setValuationData] = useState<ValuationData | null>(null);
  const [lowStockData, setLowStockData] = useState<LowStockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadReports() {
    setLoading(true);
    setError('');
    try {
      if (subView === 'sales') {
        const data = await api.reports.sales(salesPeriod);
        setSalesData(data as unknown as SalesData);
      } else if (subView === 'valuation') {
        const data = await api.reports.inventoryValuation();
        setValuationData(data as unknown as ValuationData);
      } else if (subView === 'lowstock') {
        const data = await api.reports.lowStock();
        setLowStockData(data as unknown as LowStockData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve report data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, [subView, salesPeriod]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-emerald-300">Manager dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Business Intelligence</h1>
          <p className="mt-2 text-sm text-slate-400">Perform real-time analytics on sales activity, inventory valuation, and stock health.</p>
        </div>

        {/* View Switcher */}
        <div className="flex rounded-xl bg-white/[0.03] p-1 border border-white/5">
          <button
            onClick={() => setSubView('sales')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${subView === 'sales' ? 'bg-emerald-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}
          >
            Sales Analysis
          </button>
          <button
            onClick={() => setSubView('valuation')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${subView === 'valuation' ? 'bg-emerald-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}
          >
            Stock Valuation
          </button>
          <button
            onClick={() => setSubView('lowstock')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${subView === 'lowstock' ? 'bg-emerald-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}
          >
            Low Stock
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-96 items-center justify-center text-slate-400">Compiling statistics…</div>
      ) : (
        <>
          {subView === 'sales' && salesData && (
            <div className="space-y-6">
              {/* Sales Period Filter */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Report period:</span>
                <div className="flex gap-1.5 rounded-lg bg-white/[0.02] p-0.5 border border-white/5">
                  {['daily', 'weekly', 'monthly'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setSalesPeriod(p)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${salesPeriod === p ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="panel p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-slate-500 uppercase tracking-wider">Period Revenue</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                      <DollarSign size={16} />
                    </span>
                  </div>
                  <p className="text-3xl font-semibold tracking-tight text-white">{money.format(salesData.revenue)}</p>
                  <p className="mt-2 text-xs text-slate-500">Gross revenue before tax adjustments</p>
                </div>

                <div className="panel p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-slate-500 uppercase tracking-wider">Orders Cleared</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-400/10 text-sky-300">
                      <ClipboardList size={16} />
                    </span>
                  </div>
                  <p className="text-3xl font-semibold tracking-tight text-white">{salesData.orderCount}</p>
                  <p className="mt-2 text-xs text-slate-500">Completed point-of-sale checkouts</p>
                </div>

                <div className="panel p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-slate-500 uppercase tracking-wider">Federal VAT (7.5%)</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-400/10 text-purple-300">
                      <Percent size={16} />
                    </span>
                  </div>
                  <p className="text-3xl font-semibold tracking-tight text-white">{money.format(salesData.vat)}</p>
                  <p className="mt-2 text-xs text-slate-500">7.5% Federal value-added tax calculated</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Category sales breakdown */}
                <div className="panel p-6">
                  <h3 className="text-base font-semibold text-white mb-6">Sales by Product Category</h3>
                  {salesData.byCategory.length === 0 ? (
                    <p className="text-sm text-slate-500 py-6">No categorised sales recorded.</p>
                  ) : (
                    <div className="space-y-5">
                      {salesData.byCategory.map((cat, idx) => {
                        const maxTotal = Math.max(...salesData.byCategory.map((c) => c.total), 1);
                        const pct = (cat.total / maxTotal) * 100;
                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium text-slate-300">{cat.category}</span>
                              <span className="font-semibold text-white">{money.format(cat.total)}</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-white/5">
                              <div style={{ width: `${pct}%` }} className="h-full rounded-full bg-emerald-400" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Top Moving Products */}
                <div className="panel p-6">
                  <h3 className="text-base font-semibold text-white mb-6">Top Moving Items</h3>
                  {salesData.topProducts.length === 0 ? (
                    <p className="text-sm text-slate-500 py-6">No product units sold.</p>
                  ) : (
                    <div className="space-y-4">
                      {salesData.topProducts.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/5 text-[11px] font-bold text-emerald-300">
                              #{idx + 1}
                            </span>
                            <span className="text-sm font-medium text-slate-200">{p.name}</span>
                          </div>
                          <span className="text-xs font-semibold bg-white/[0.04] px-2.5 py-1 rounded-full text-slate-300">
                            {p.quantity} units
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {subView === 'valuation' && valuationData && (
            <div className="space-y-6">
              {/* Asset Header */}
              <div className="panel p-6 bg-gradient-to-r from-emerald-950/20 to-transparent">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
                    <Boxes size={24} />
                  </span>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Total Capital Tied in Stock</span>
                    <p className="text-3xl font-bold tracking-tight text-white mt-1">{money.format(valuationData.totalValue)}</p>
                  </div>
                </div>
              </div>

              {/* Asset Table */}
              <div className="panel overflow-hidden">
                <div className="p-5 border-b border-white/5">
                  <h3 className="text-base font-semibold text-white">Asset Listing</h3>
                  <p className="text-xs text-slate-500 mt-1">Breakdown of inventory values evaluated at current cost price.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Drink / Item</th>
                        <th className="px-5 py-4">Category</th>
                        <th className="px-5 py-4 text-right">Units on Hand</th>
                        <th className="px-5 py-4 text-right">Unit Cost (₦)</th>
                        <th className="px-5 py-4 text-right">Value (₦)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {valuationData.items.map((item, idx) => (
                        <tr key={idx} className="border-t border-white/5 transition hover:bg-white/[0.01]">
                          <td className="px-5 py-4 font-medium text-slate-200">{item.name}</td>
                          <td className="px-5 py-4 text-slate-400">{item.category}</td>
                          <td className="px-5 py-4 text-right text-slate-300 font-semibold">{item.stockQuantity}</td>
                          <td className="px-5 py-4 text-right text-slate-400">{money.format(item.costPrice)}</td>
                          <td className="px-5 py-4 text-right text-emerald-300 font-semibold">{money.format(item.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {subView === 'lowstock' && lowStockData && (
            <div className="space-y-6">
              {/* Warnings List */}
              <div className="panel overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-white/5">
                  <div>
                    <h3 className="text-base font-semibold text-white">Reorder Required</h3>
                    <p className="text-xs text-slate-500 mt-1">These items have fallen below their safety threshold and require immediate restock.</p>
                  </div>
                  <span className="rounded-full bg-orange-400/10 px-3 py-1 text-xs font-semibold text-orange-300 flex items-center gap-1.5">
                    <AlertTriangle size={13} />
                    {lowStockData.products.length} Warnings
                  </span>
                </div>

                {lowStockData.products.length === 0 ? (
                  <div className="py-16 text-center text-slate-500">
                    <Boxes size={40} className="mx-auto mb-3 opacity-20 text-emerald-300" />
                    <p className="text-sm font-medium text-slate-400">All shelves are perfectly healthy!</p>
                    <p className="text-xs text-slate-500 mt-1">No items are below reorder thresholds.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-5 py-4">Drink / Item</th>
                          <th className="px-5 py-4">Category</th>
                          <th className="px-5 py-4 text-right">In Stock</th>
                          <th className="px-5 py-4 text-right">Reorder Point</th>
                          <th className="px-5 py-4 text-center">Action Required</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowStockData.products.map((p) => (
                          <tr key={p.id} className="border-t border-white/5 transition hover:bg-white/[0.01]">
                            <td className="px-5 py-4 font-medium text-slate-200">{p.name}</td>
                            <td className="px-5 py-4 text-slate-400">{p.category}</td>
                            <td className="px-5 py-4 text-right text-orange-300 font-bold">{p.stockQuantity}</td>
                            <td className="px-5 py-4 text-right text-slate-400">{p.reorderThreshold}</td>
                            <td className="px-5 py-4 text-center">
                              <span className="inline-block rounded-full bg-red-400/10 px-2.5 py-1 text-xs font-semibold text-red-300">
                                Restock {p.reorderThreshold * 2} {p.unit}s
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
