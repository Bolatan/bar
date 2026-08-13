'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Beer, Boxes, ChevronRight, CircleDollarSign, ClipboardList, Clock3, Edit2, LogOut, Menu, PackagePlus, Plus, Search, Settings, ShoppingCart, Sparkles, Users, X, ShieldAlert } from 'lucide-react';
import { api, ApiError, clearTokens, saveTokens, type Order, type Product, type Profile } from '@/lib/api';
import Shifts from '@/components/Shifts';
import Reports from '@/components/Reports';
import Team from '@/components/Team';
import SettingsView from '@/components/SettingsView';
import AuditLogs from '@/components/AuditLogs';

type View = 'dashboard' | 'inventory' | 'pos' | 'shifts' | 'reports' | 'staff' | 'settings' | 'audit-logs';
type CartItem = Product & { quantity: number };
const money = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });
const categories = ['All', 'Beer', 'Spirits', 'Cocktails', 'Soft Drinks', 'Food', 'Wine', 'Other'];
const nav = [
  { id: 'dashboard' as View, label: 'Overview', icon: BarChart3 },
  { id: 'pos' as View, label: 'Point of sale', icon: ShoppingCart },
  { id: 'inventory' as View, label: 'Inventory', icon: Boxes },
  { id: 'shifts' as View, label: 'Shifts', icon: Clock3 },
  { id: 'reports' as View, label: 'Reports', icon: ClipboardList },
  { id: 'staff' as View, label: 'Team', icon: Users },
  { id: 'audit-logs' as View, label: 'Audit Log', icon: ShieldAlert }
];

function Logo() { return <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950"><Beer size={21} /></div><div><div className="text-[15px] font-bold tracking-tight text-white">Malt & Lime</div><div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Nigeria operations</div></div></div>; }

function AuthScreen({ onAuth }: { onAuth: (user: Profile, token: string, refreshToken: string) => void }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setError(''); setBusy(true); try { const result = await api.auth.login(email, password); if (!result.user) throw new Error('Unable to sign in'); onAuth(result.user, result.token, result.refreshToken); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in'); } finally { setBusy(false); } }
  return <main className="flex min-h-screen items-center justify-center bg-[#07110f] px-6 py-12 text-white"><div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0c1a17] shadow-2xl lg:grid-cols-[1.05fr_0.95fr]"><div className="relative hidden overflow-hidden p-12 lg:block"><div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(52,211,153,.28),transparent_36%),linear-gradient(145deg,#123d31,#07110f_70%)]" /><div className="relative flex h-full flex-col justify-between"><Logo /><div><p className="mb-5 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">Built for busy nights</p><h1 className="max-w-md text-5xl font-semibold leading-[1.05] tracking-[-0.04em]">Run the room with a clearer view.</h1><p className="mt-6 max-w-md text-base leading-7 text-slate-300">Keep tabs moving, stock accurate, and every shift accountable from one calm command centre.</p></div><div className="flex items-center gap-3 text-sm text-slate-400"><Sparkles size={16} className="text-emerald-300" /> Designed for the Nigerian hospitality rhythm</div></div></div><div className="p-8 sm:p-12"><div className="mb-12 lg:hidden"><Logo /></div><div className="mb-8"><p className="mb-3 text-sm text-emerald-300">Welcome back</p><h2 className="text-3xl font-semibold tracking-tight">Sign in to your bar</h2><p className="mt-2 text-sm text-slate-400">Pick up where the shift left off.</p></div><form onSubmit={submit} className="space-y-5"><label className="block text-sm text-slate-300">Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="field mt-2" placeholder="you@example.com" /></label><label className="block text-sm text-slate-300">Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="field mt-2" placeholder="At least 6 characters" /></label>{error && <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}<button disabled={busy} className="button-primary w-full">{busy ? 'Please wait…' : 'Enter workspace'}<ChevronRight size={17} /></button></form></div></div></main>;
}

function Stat({ label, value, detail, icon: Icon, tone = 'green' }: { label: string; value: string; detail: string; icon: typeof BarChart3; tone?: string }) { return <div className="panel p-5"><div className="mb-6 flex items-center justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone === 'orange' ? 'bg-orange-400/10 text-orange-300' : tone === 'blue' ? 'bg-sky-400/10 text-sky-300' : 'bg-emerald-400/10 text-emerald-300'}`}><Icon size={19} /></span><span className="text-xs text-emerald-300">Live</span></div><p className="text-sm text-slate-400">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight text-white">{value}</p><p className="mt-2 text-xs text-slate-500">{detail}</p></div>; }

const getLocalDateString = (date: Date) => {
  try {
    return date.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Africa/Lagos'
    });
  } catch {
    return date.toDateString();
  }
};

const isSameDay = (d1: Date, d2: Date) => {
  return getLocalDateString(d1) === getLocalDateString(d2);
};

function Dashboard({ products, orders, profile }: { products: Product[]; orders: Order[]; profile: Profile }) {
  const low = products.filter(p => p.stockQuantity <= p.reorderThreshold);
  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const stock = products.reduce((sum, p) => sum + p.stockQuantity * p.costPrice, 0);

  // Generate the last 7 days ending with today in West Africa Time
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
  }, []);

  // Group and sum revenue for each of the last 7 days
  const dailyRevenues = useMemo(() => {
    return last7Days.map(dayDate => {
      const dayOrders = orders.filter(order => {
        const orderDate = new Date(order.paidAt || order.createdAt);
        return isSameDay(orderDate, dayDate);
      });
      const total = dayOrders.reduce((sum, order) => sum + order.total, 0);
      return {
        date: dayDate,
        label: dayDate.toLocaleDateString('en-NG', { weekday: 'short', timeZone: 'Africa/Lagos' }),
        total,
        orderCount: dayOrders.length
      };
    });
  }, [orders, last7Days]);

  const maxRevenue = useMemo(() => {
    return Math.max(...dailyRevenues.map(r => r.total), 0);
  }, [dailyRevenues]);

  const todayRevenue = dailyRevenues[6]?.total || 0;
  const todayOrdersCount = dailyRevenues[6]?.orderCount || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-emerald-300">Today at Malt & Lime Nigeria</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Good evening, {profile.name.split(' ')[0]}.</h1>
          <p className="mt-2 text-sm text-slate-400">Here’s what’s happening across the floor today.</p>
        </div>
        <button className="button-primary"><Plus size={17} /> New order</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Today's revenue"
          value={money.format(todayRevenue)}
          detail={`${todayOrdersCount} paid orders today`}
          icon={CircleDollarSign}
        />
        <Stat label="Orders served" value={String(orders.length)} detail="Completed orders" icon={ShoppingCart} tone="blue" />
        <Stat label="Stock value" value={money.format(stock)} detail="At current cost price" icon={Boxes} tone="orange" />
        <Stat label="Average order" value={money.format(orders.length ? revenue / orders.length : 0)} detail="Across completed orders" icon={BarChart3} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <div className="panel p-6">
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white">Revenue this week</h2>
            <p className="mt-1 text-sm text-slate-500">Sales activity from the connected API</p>
          </div>
          <div className="flex h-56 items-end gap-3 sm:gap-5">
            {dailyRevenues.map((day, i) => {
              const height = maxRevenue > 0 ? (day.total / maxRevenue) * 100 : 0;
              const isToday = i === 6;
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-3">
                  <div
                    className="group relative flex h-40 w-full items-end"
                    title={`${day.label}: ${money.format(day.total)} (${day.orderCount} paid orders)`}
                  >
                    <div
                      style={{ height: `${height}%` }}
                      className={`w-full rounded-t-xl transition-all group-hover:bg-emerald-300 ${isToday ? 'bg-emerald-400' : 'bg-emerald-400/25'}`}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{day.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Needs attention</h2>
              <p className="mt-1 text-sm text-slate-500">Low stock across the bar</p>
            </div>
            <span className="rounded-full bg-orange-400/10 px-2.5 py-1 text-xs font-medium text-orange-300">{low.length} items</span>
          </div>
          <div className="space-y-4">
            {low.slice(0, 4).map(product => (
              <div key={product.id} className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0 last:pb-4">
                <div>
                  <p className="text-sm font-medium text-slate-200">{product.name}</p>
                  <p className="mt-1 text-xs text-slate-500">Reorder at {product.reorderThreshold} {product.unit}s</p>
                </div>
                <span className="text-sm font-semibold text-orange-300">{product.stockQuantity} left</span>
              </div>
            ))}
            {!low.length && <p className="text-sm text-slate-500">All shelves are healthy.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddProduct({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [category, setCategory] = useState('Beer');
  const [stock, setStock] = useState('');
  const [threshold, setThreshold] = useState('5');
  const [unit, setUnit] = useState('bottle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hasManuallyAdjustedCost, setHasManuallyAdjustedCost] = useState(false);

  const handlePriceChange = (val: string) => {
    setPrice(val);
    if (!hasManuallyAdjustedCost) {
      const num = Number(val);
      if (!isNaN(num)) {
        setCostPrice(String(Math.round(num * 0.6)));
      }
    }
  };

  const handleCostPriceChange = (val: string) => {
    setCostPrice(val);
    setHasManuallyAdjustedCost(true);
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.products.create({
        name,
        category,
        unit,
        sellingPrice: Number(price),
        costPrice: Number(costPrice) || Number(price) * .6,
        stockQuantity: Number(stock),
        reorderThreshold: Number(threshold)
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form onSubmit={save} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#10211c] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Add product</h2>
            <p className="mt-1 text-sm text-slate-400">Add a new item to your shelves.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <label className="block text-sm text-slate-300">
            Product name
            <input value={name} onChange={e => setName(e.target.value)} required className="field mt-2" placeholder="e.g. Star Lager" />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm text-slate-300">
              Category
              <select value={category} onChange={e => setCategory(e.target.value)} className="field mt-2">
                {categories.slice(1).map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="block text-sm text-slate-300">
              Unit (e.g. bottle)
              <input value={unit} onChange={e => setUnit(e.target.value)} required className="field mt-2" placeholder="bottle" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm text-slate-300">
              Selling price
              <input value={price} onChange={e => handlePriceChange(e.target.value)} required type="number" className="field mt-2" placeholder="1500" />
            </label>
            <label className="block text-sm text-slate-300">
              Cost price
              <input value={costPrice} onChange={e => handleCostPriceChange(e.target.value)} required type="number" className="field mt-2" placeholder="900" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm text-slate-300">
              Opening stock
              <input value={stock} onChange={e => setStock(e.target.value)} required type="number" className="field mt-2" placeholder="24" />
            </label>
            <label className="block text-sm text-slate-300">
              Low stock threshold
              <input value={threshold} onChange={e => setThreshold(e.target.value)} required type="number" className="field mt-2" placeholder="5" />
            </label>
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
        </div>
        <div className="mt-7 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="button-quiet">
            Cancel
          </button>
          <button disabled={busy} className="button-primary">
            {busy ? 'Saving…' : 'Save product'}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditProduct({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.sellingPrice));
  const [costPrice, setCostPrice] = useState(String(product.costPrice || 0));
  const [category, setCategory] = useState(product.category);
  const [stock, setStock] = useState(String(product.stockQuantity));
  const [threshold, setThreshold] = useState(String(product.reorderThreshold));
  const [unit, setUnit] = useState(product.unit || 'bottle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hasManuallyAdjustedCost, setHasManuallyAdjustedCost] = useState(false);

  const handlePriceChange = (val: string) => {
    setPrice(val);
    if (!hasManuallyAdjustedCost) {
      const num = Number(val);
      if (!isNaN(num)) {
        setCostPrice(String(Math.round(num * 0.6)));
      }
    }
  };

  const handleCostPriceChange = (val: string) => {
    setCostPrice(val);
    setHasManuallyAdjustedCost(true);
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.products.update(product.id, {
        name,
        category,
        unit,
        sellingPrice: Number(price),
        costPrice: Number(costPrice),
        stockQuantity: Number(stock),
        reorderThreshold: Number(threshold)
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form onSubmit={save} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#10211c] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Edit product</h2>
            <p className="mt-1 text-sm text-slate-400">Modify product properties and safety stock.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <label className="block text-sm text-slate-300">
            Product name
            <input value={name} onChange={e => setName(e.target.value)} required className="field mt-2" placeholder="e.g. Star Lager" />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm text-slate-300">
              Category
              <select value={category} onChange={e => setCategory(e.target.value)} className="field mt-2">
                {categories.slice(1).map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="block text-sm text-slate-300">
              Unit (e.g. bottle)
              <input value={unit} onChange={e => setUnit(e.target.value)} required className="field mt-2" placeholder="bottle" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm text-slate-300">
              Selling price
              <input value={price} onChange={e => handlePriceChange(e.target.value)} required type="number" className="field mt-2" placeholder="1500" />
            </label>
            <label className="block text-sm text-slate-300">
              Cost price
              <input value={costPrice} onChange={e => handleCostPriceChange(e.target.value)} required type="number" className="field mt-2" placeholder="900" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm text-slate-300">
              In stock
              <input value={stock} onChange={e => setStock(e.target.value)} required type="number" className="field mt-2" placeholder="24" />
            </label>
            <label className="block text-sm text-slate-300">
              Low stock threshold
              <input value={threshold} onChange={e => setThreshold(e.target.value)} required type="number" className="field mt-2" placeholder="5" />
            </label>
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
        </div>
        <div className="mt-7 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="button-quiet">
            Cancel
          </button>
          <button disabled={busy} className="button-primary">
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Inventory({ products, refresh }: { products: Product[]; refresh: () => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const filtered = products.filter(
    p => p.name.toLowerCase().includes(query.toLowerCase()) && (category === 'All' || p.category === category)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-emerald-300">Control centre</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Inventory</h1>
          <p className="mt-2 text-sm text-slate-400">Know what’s moving before the shelves do.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="button-primary">
          <PackagePlus size={17} /> Add product
        </button>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-white/5 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input value={query} onChange={e => setQuery(e.target.value)} className="field pl-10" placeholder="Search products" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {categories.map(item => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition ${
                  category === item
                    ? 'bg-emerald-400 text-slate-950'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Product</th>
                <th className="px-5 py-4 font-medium">Category</th>
                <th className="px-5 py-4 font-medium text-right">Cost Price</th>
                <th className="px-5 py-4 font-medium text-right">Selling Price</th>
                <th className="px-5 py-4 font-medium text-right">In Stock</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const low = p.stockQuantity <= p.reorderThreshold;
                return (
                  <tr key={p.id} className="border-t border-white/5 transition hover:bg-white/[0.025]">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-200">{p.name}</p>
                      <p className="mt-1 text-xs text-slate-500">Per {p.unit}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-400">{p.category}</td>
                    <td className="px-5 py-4 text-right font-medium text-slate-300">
                      {money.format(p.costPrice || 0)}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-slate-200">
                      {money.format(p.sellingPrice)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <p className="text-slate-300 font-medium">{p.stockQuantity}</p>
                      <p className="mt-1 text-xs text-slate-500">Min threshold: {p.reorderThreshold}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          low ? 'bg-orange-400/10 text-orange-300' : 'bg-emerald-400/10 text-emerald-300'
                        }`}
                      >
                        {low ? 'Reorder soon' : 'Healthy'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setEditingProduct(p)}
                        className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition inline-flex items-center"
                        title="Edit product"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && <div className="p-12 text-center text-sm text-slate-500">No products match that search.</div>}
        </div>
      </div>

      {showAdd && <AddProduct onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); refresh(); }} />}
      {editingProduct && <EditProduct product={editingProduct} onClose={() => setEditingProduct(null)} onSaved={() => { setEditingProduct(null); refresh(); }} />}
    </div>
  );
}

function Pos({ products, refresh }: { products: Product[]; refresh: () => void }) {
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tab, setTab] = useState('Table 4');
  const [message, setMessage] = useState('');
  const [printReceiptOnCheckout, setPrintReceiptOnCheckout] = useState(true);
  const [receiptToPrint, setReceiptToPrint] = useState<any | null>(null);
  const [isSimulatingPrint, setIsSimulatingPrint] = useState(false);

  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [marketingConsentEmail, setMarketingConsentEmail] = useState(false);
  const [marketingConsentWhatsApp, setMarketingConsentWhatsApp] = useState(false);

  const visible = products.filter(p => category === 'All' || p.category === category);
  const subtotal = cart.reduce((s, p) => s + p.sellingPrice * p.quantity, 0);
  const vat = subtotal * .075;
  const total = subtotal + vat;

  function add(p: Product) {
    setCart(items => items.some(i => i.id === p.id) ? items.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i) : [...items, { ...p, quantity: 1 }]);
  }

  async function checkout() {
    if (!cart.length) return;
    try {
      const { order } = await api.orders.create({ tabName: tab, items: cart.map(i => ({ productId: i.id, name: i.name, quantity: i.quantity, unitPrice: i.sellingPrice })) });
      await api.orders.checkout(order.id, {
        paymentMethod: 'cash',
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        marketingConsentEmail,
        marketingConsentWhatsApp,
      });

      const fullOrder = {
        ...order,
        subtotal,
        vat,
        total,
        discount: order.discount || 0,
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        marketingConsentEmail,
        marketingConsentWhatsApp,
        items: cart.map(i => ({ productId: i.id, name: i.name, quantity: i.quantity, unitPrice: i.sellingPrice }))
      };

      setCart([]);
      setCustomerEmail('');
      setCustomerPhone('');
      setMarketingConsentEmail(false);
      setMarketingConsentWhatsApp(false);
      if (printReceiptOnCheckout) {
        setReceiptToPrint(fullOrder);
      } else {
        setMessage('Order paid and tab closed');
        setTimeout(() => setMessage(''), 3000);
      }
      refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to complete order');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-emerald-300">Service floor</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Point of sale</h1>
          <p className="mt-2 text-sm text-slate-400">Tap a product to add it to the open tab.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          <span className="px-3 text-xs text-slate-500">Open tab</span>
          <input value={tab} onChange={e => setTab(e.target.value)} className="w-24 bg-transparent px-2 py-2 text-sm text-white outline-none" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-5 flex gap-2 overflow-x-auto">
            {categories.map(item => (
              <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition ${category === item ? 'bg-emerald-400 text-slate-950' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                {item}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map(p => (
              <button key={p.id} onClick={() => add(p)} disabled={!p.stockQuantity} className="panel group p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-400/40 disabled:opacity-40">
                <div className="mb-7 flex items-start justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-emerald-300"><Beer size={17} /></span>
                  <span className="text-[11px] text-slate-500">{p.stockQuantity} left</span>
                </div>
                <p className="text-sm font-medium text-slate-200">{p.name}</p>
                <p className="mt-1 text-sm font-semibold text-emerald-300">{money.format(p.sellingPrice)}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="panel h-fit p-5 xl:sticky xl:top-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-5">
            <div>
              <h2 className="font-semibold text-white">{tab}</h2>
              <p className="mt-1 text-xs text-slate-500">{cart.length} line items</p>
            </div>
            <button onClick={() => setCart([])} className="text-xs text-slate-500 hover:text-white">Clear</button>
          </div>
          <div className="min-h-[220px] py-4">
            {cart.length ? (
              cart.map(item => (
                <div key={item.id} className="mb-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-200">{item.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.quantity} × {money.format(item.sellingPrice)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCart(items => items.flatMap(i => i.id === item.id ? (i.quantity > 1 ? [{ ...i, quantity: i.quantity - 1 }] : []) : [i]))} className="flex h-6 w-6 items-center justify-center rounded bg-white/5 text-slate-300">−</button>
                    <span className="w-4 text-center text-sm text-white">{item.quantity}</span>
                    <button onClick={() => add(item)} className="flex h-6 w-6 items-center justify-center rounded bg-white/5 text-slate-300">+</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-[220px] flex-col items-center justify-center text-center">
                <ShoppingCart size={28} className="text-slate-700" />
                <p className="mt-3 text-sm text-slate-500">Your tab is empty</p>
                <p className="mt-1 text-xs text-slate-600">Choose products from the menu</p>
              </div>
            )}
          </div>
          <div className="space-y-3 border-t border-white/5 pt-5 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span>{money.format(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>VAT <span className="text-xs text-slate-600">7.5%</span></span>
              <span>{money.format(vat)}</span>
            </div>
            <div className="flex justify-between pt-2 text-lg font-semibold text-white">
              <span>Total</span>
              <span>{money.format(total)}</span>
            </div>

            {/* Optional Customer Contact & Marketing Consent */}
            <div className="space-y-3 rounded-xl border border-white/5 bg-white/[0.01] p-3 my-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Customer Info (Optional)</p>

              <div className="grid gap-2 grid-cols-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-medium block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="customer@mail.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/60"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-medium block mb-1">WhatsApp / Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. 08012345678"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/60"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1.5 border-t border-white/5">
                <div className="flex items-center gap-2 text-slate-400">
                  <input
                    type="checkbox"
                    id="consentEmail"
                    checked={marketingConsentEmail}
                    onChange={(e) => setMarketingConsentEmail(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-white/10 bg-white/5 text-emerald-500 accent-emerald-400 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="consentEmail" className="text-[11px] cursor-pointer hover:text-white">
                    Opt-in to Email marketing
                  </label>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <input
                    type="checkbox"
                    id="consentWhatsApp"
                    checked={marketingConsentWhatsApp}
                    onChange={(e) => setMarketingConsentWhatsApp(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-white/10 bg-white/5 text-emerald-500 accent-emerald-400 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="consentWhatsApp" className="text-[11px] cursor-pointer hover:text-white">
                    Opt-in to WhatsApp marketing
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1 pb-1 text-slate-400">
              <input
                type="checkbox"
                id="printReceipt"
                checked={printReceiptOnCheckout}
                onChange={(e) => setPrintReceiptOnCheckout(e.target.checked)}
                className="h-4 w-4 rounded border-white/10 bg-white/5 text-emerald-500 accent-emerald-400 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="printReceipt" className="text-xs font-medium cursor-pointer">
                Print receipt on checkout
              </label>
            </div>

            <button onClick={checkout} disabled={!cart.length} className="button-primary mt-1 w-full">
              Charge {money.format(total)} <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>

      {message && <div className="fixed bottom-6 right-6 rounded-xl border border-emerald-400/30 bg-[#11372b] px-5 py-4 text-sm text-emerald-200 shadow-xl">{message}</div>}

      {/* On-Screen High-Fidelity Receipt Modal */}
      {receiptToPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0c1a17] p-6 shadow-2xl relative overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Order Receipt</h3>
                <p className="text-xs text-slate-400">Checkout completed successfully.</p>
              </div>
              <button
                type="button"
                onClick={() => setReceiptToPrint(null)}
                className="text-slate-500 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Simulated Thermal Receipt */}
            <div className="bg-white text-slate-900 p-5 rounded-lg shadow-inner font-mono text-xs leading-relaxed max-h-[350px] overflow-y-auto relative">
              {isSimulatingPrint && (
                <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center text-emerald-600 font-sans font-semibold text-center z-10">
                  <span className="animate-bounce text-xl">🖨️</span>
                  <p className="mt-2 text-sm text-slate-800">Printing receipt...</p>
                  <div className="w-24 h-1 bg-slate-200 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-emerald-500 animate-[pulse_1s_infinite] w-full" />
                  </div>
                </div>
              )}

              <div className="text-center font-bold text-sm">MALT & LIME BAR</div>
              <div className="text-center">NIGERIA OPERATIONS</div>
              <div className="text-center text-[10px]">12 Admiralty Way, Lekki Phase 1</div>
              <div className="text-center text-[10px]">Lagos, Nigeria</div>
              <div className="border-b border-dashed border-slate-300 my-3" />
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(receiptToPrint.createdAt).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Lagos' })}</span>
              </div>
              <div className="flex justify-between">
                <span>Tab:</span>
                <span>{receiptToPrint.tabName}</span>
              </div>
              <div className="flex justify-between">
                <span>Ref:</span>
                <span className="truncate max-w-[120px]">{receiptToPrint.id}</span>
              </div>
              <div className="border-b border-dashed border-slate-300 my-3" />
              <div className="font-bold mb-1">ITEMS:</div>
              {receiptToPrint.items.map((item: any, idx: number) => (
                <div key={idx} className="mb-1">
                  <div className="flex justify-between">
                    <span>{item.name}</span>
                    <span>{item.quantity}x</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 pl-2">
                    <span>@{money.format(item.unitPrice)}</span>
                    <span>{money.format(item.unitPrice * item.quantity)}</span>
                  </div>
                </div>
              ))}
              <div className="border-b border-dashed border-slate-300 my-3" />
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>{money.format(receiptToPrint.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT (7.5%):</span>
                <span>{money.format(receiptToPrint.vat)}</span>
              </div>
              {receiptToPrint.discount > 0 && (
                <div className="flex justify-between">
                  <span>DISCOUNT:</span>
                  <span>-{money.format(receiptToPrint.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm border-t border-dashed border-slate-300 pt-1.5 mt-1.5">
                <span>TOTAL:</span>
                <span>{money.format(receiptToPrint.total)}</span>
              </div>
              {(receiptToPrint.customerEmail || receiptToPrint.customerPhone) && (
                <>
                  <div className="border-b border-dashed border-slate-300 my-3" />
                  <div className="font-bold mb-1">CUSTOMER INFO:</div>
                  {receiptToPrint.customerEmail && (
                    <div className="flex justify-between text-[10px]">
                      <span>Email:</span>
                      <span className="truncate max-w-[160px]">{receiptToPrint.customerEmail}</span>
                    </div>
                  )}
                  {receiptToPrint.customerPhone && (
                    <div className="flex justify-between text-[10px]">
                      <span>Phone:</span>
                      <span>{receiptToPrint.customerPhone}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
                    <span>Opt-in:</span>
                    <span>
                      {[
                        receiptToPrint.marketingConsentEmail ? 'Email' : null,
                        receiptToPrint.marketingConsentWhatsApp ? 'WhatsApp' : null
                      ].filter(Boolean).join(', ') || 'None'}
                    </span>
                  </div>
                </>
              )}
              <div className="border-b border-dashed border-slate-300 my-3" />
              <div className="text-center font-semibold text-[10px]">PAID VIA CASH</div>
              <div className="text-center mt-3 text-[10px]">Thank you for your patronage!</div>
            </div>

            {/* Actions */}
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="w-full button-primary flex items-center justify-center gap-2"
              >
                🖨️ Print Receipt (System Dialog)
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSimulatingPrint(true);
                  setTimeout(() => {
                    setIsSimulatingPrint(false);
                    alert("🔔 Receipt print command simulated and completed successfully!");
                  }, 1500);
                }}
                className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 text-sm font-semibold text-white transition hover:bg-purple-500"
              >
                ⚡ Simulate Thermal Printer
              </button>
              <button
                type="button"
                onClick={() => setReceiptToPrint(null)}
                className="w-full inline-flex h-11 items-center justify-center rounded-xl bg-white/[0.04] px-4 text-sm font-semibold text-slate-300 hover:bg-white/[0.08] hover:text-white transition"
              >
                Close & Next Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden print-only container rendered into the DOM */}
      {receiptToPrint && (
        <div className="hidden print:block bg-white text-black p-6 font-mono text-xs w-[72mm] mx-auto leading-relaxed">
          <div className="text-center font-bold text-sm">MALT & LIME BAR</div>
          <div className="text-center">NIGERIA OPERATIONS</div>
          <div className="text-center text-[10px]">12 Admiralty Way, Lekki Phase 1</div>
          <div className="text-center text-[10px]">Lagos, Nigeria</div>
          <div className="border-b border-dashed border-black my-3" />
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{new Date(receiptToPrint.createdAt).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Lagos' })}</span>
          </div>
          <div className="flex justify-between">
            <span>Tab:</span>
            <span>{receiptToPrint.tabName}</span>
          </div>
          <div className="flex justify-between">
            <span>Ref:</span>
            <span className="truncate max-w-[120px]">{receiptToPrint.id}</span>
          </div>
          <div className="border-b border-dashed border-black my-3" />
          <div className="font-bold mb-1">ITEMS:</div>
          {receiptToPrint.items.map((item: any, idx: number) => (
            <div key={idx} className="mb-1">
              <div className="flex justify-between">
                <span>{item.name}</span>
                <span>{item.quantity}x</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 pl-2">
                <span>@{money.format(item.unitPrice)}</span>
                <span>{money.format(item.unitPrice * item.quantity)}</span>
              </div>
            </div>
          ))}
          <div className="border-b border-dashed border-black my-3" />
          <div className="flex justify-between text-[11px]">
            <span>SUBTOTAL:</span>
            <span>{money.format(receiptToPrint.subtotal)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span>VAT (7.5%):</span>
            <span>{money.format(receiptToPrint.vat)}</span>
          </div>
          {receiptToPrint.discount > 0 && (
            <div className="flex justify-between text-[11px]">
              <span>DISCOUNT:</span>
              <span>-{money.format(receiptToPrint.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm border-t border-dashed border-black pt-1.5 mt-1.5">
            <span>TOTAL:</span>
            <span>{money.format(receiptToPrint.total)}</span>
          </div>
          <div className="border-b border-dashed border-black my-3" />
          <div className="text-center font-semibold">PAID VIA CASH</div>
          <div className="text-center mt-3 text-[10px]">Thank you for your patronage!</div>
          <div className="text-center text-[9px] text-gray-500">Malt & Lime - Nigerian hospitality rhythm</div>
        </div>
      )}
    </div>
  );
}

function Placeholder({ title, text, icon: Icon }: { title: string; text: string; icon: typeof BarChart3 }) { return <div className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300"><Icon size={24} /></div><h1 className="mt-5 text-2xl font-semibold text-white">{title}</h1><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{text}</p></div>; }

export default function Home() {
  const [user, setUser] = useState<Profile | null>(null);
  const [view, setView] = useState<View>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ml_view');
      if (saved) return saved as View;
    }
    return 'dashboard';
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [mobile, setMobile] = useState(false);
  const [loading, setLoading] = useState(true);

  const changeView = (newView: View) => {
    setView(newView);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ml_view', newView);
    }
  };

  async function load() {
    try {
      const [{ products: nextProducts }, { orders: nextOrders }] = await Promise.all([
        api.products.list(),
        api.orders.list({ status: 'paid' })
      ]);
      setProducts(nextProducts);
      setOrders(nextOrders);
    } catch {
      setProducts([]);
      setOrders([]);
    }
  }

  useEffect(() => {
    api.auth.me().then(({ user: nextUser }) => {
      setUser(nextUser);
      return load();
    }).catch(() => clearTokens()).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) {
      const isAllowed = (v: View) => {
        if (v === 'dashboard' || v === 'pos' || v === 'inventory' || v === 'shifts' || v === 'settings') return true;
        if (v === 'reports' || v === 'staff') return user.role === 'owner' || user.role === 'manager';
        if (v === 'audit-logs') return user.role === 'owner';
        return false;
      };
      if (!isAllowed(view)) {
        changeView('dashboard');
      }
    }
  }, [user, view]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#07110f] text-sm text-slate-400">Loading workspace…</div>;
  if (!user) return <AuthScreen onAuth={(nextUser, token, refreshToken) => { saveTokens(token, refreshToken); setUser(nextUser); load(); }} />;

  const refresh = () => load();

  const content = view === 'dashboard' ? <Dashboard products={products} orders={orders} profile={user} />
    : view === 'inventory' ? <Inventory products={products} refresh={refresh} />
    : view === 'pos' ? <Pos products={products} refresh={refresh} />
    : view === 'shifts' ? <Shifts profile={user} />
    : view === 'reports' ? <Reports />
    : view === 'staff' ? <Team currentUser={user} />
    : view === 'audit-logs' ? <AuditLogs />
    : view === 'settings' ? <SettingsView currentUser={user} onProfileUpdated={(nextUser) => setUser(nextUser)} />
    : <Placeholder title="Team management" text="Manage active staff, roles, and access from one place." icon={Users} />;

  return (
    <div className="min-h-screen bg-[#07110f] text-white">
      <aside className={`print:hidden fixed inset-y-0 left-0 z-40 w-64 border-r border-white/5 bg-[#0a1714] p-5 transition-transform lg:translate-x-0 ${mobile ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between">
          <Logo />
          <button onClick={() => setMobile(false)} className="text-slate-500 lg:hidden"><X size={19} /></button>
        </div>
        <div className="mt-12">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">Workspace</p>
          <nav className="space-y-1">
            {nav.filter(item => {
              if (item.id === 'audit-logs') return user.role === 'owner';
              return user.role === 'owner' || user.role === 'manager' || !['reports', 'staff'].includes(item.id);
            }).map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => { changeView(item.id); setMobile(false); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${view === item.id ? 'bg-emerald-400 text-slate-950' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        <div className="absolute bottom-5 left-5 right-5 border-t border-white/5 pt-5">
          <button
            onClick={() => { changeView('settings'); setMobile(false); }}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${view === 'settings' ? 'bg-emerald-400 text-slate-950' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Settings size={18} /> Settings
          </button>
          <button onClick={() => { clearTokens(); setUser(null); changeView('dashboard'); }} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-red-400/10 hover:text-red-300">
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64 print:pl-0">
        <header className="print:hidden flex h-20 items-center justify-between border-b border-white/5 px-5 sm:px-8">
          <button onClick={() => setMobile(true)} className="text-slate-400 lg:hidden"><Menu size={21} /></button>
          <div className="hidden text-sm text-slate-500 sm:block">
            Malt & Lime <span className="mx-2 text-slate-700">/</span> {view === 'settings' ? 'Settings' : nav.find(n => n.id === view)?.label}
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-200">{user.name}</p>
              <p className="text-xs capitalize text-slate-500">{user.role}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/15 text-sm font-semibold text-emerald-300">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] p-5 sm:p-8 print:p-0">{content}</main>
      </div>
    </div>
  );
}
