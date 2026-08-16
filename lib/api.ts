const API_BASE = '/api';

type Token = string | null;

let accessToken: Token = null;
let refreshToken: Token = null;

const STORAGE_KEY = 'ml_auth';
const OFFLINE_CUSTOMERS_KEY = 'ml_offline_customers';

const OFFLINE_PRODUCTS: Product[] = [
  { id: 'offline-star', name: 'Star Lager', category: 'Beer', unit: 'bottle', costPrice: 650, sellingPrice: 1500, stockQuantity: 84, reorderThreshold: 24, isActive: true },
  { id: 'offline-gulder', name: 'Gulder Lager', category: 'Beer', unit: 'bottle', costPrice: 700, sellingPrice: 1600, stockQuantity: 42, reorderThreshold: 18, isActive: true },
  { id: 'offline-guinness', name: 'Guinness Foreign Extra', category: 'Beer', unit: 'bottle', costPrice: 900, sellingPrice: 2200, stockQuantity: 29, reorderThreshold: 12, isActive: true },
  { id: 'offline-hennessy', name: 'Hennessy VS', category: 'Spirits', unit: 'bottle', costPrice: 32000, sellingPrice: 65000, stockQuantity: 8, reorderThreshold: 3, isActive: true },
  { id: 'offline-coke', name: 'Coca-Cola', category: 'Soft Drinks', unit: 'bottle', costPrice: 350, sellingPrice: 1000, stockQuantity: 46, reorderThreshold: 18, isActive: true },
  { id: 'offline-chapman', name: 'Chapman', category: 'Cocktails', unit: 'glass', costPrice: 500, sellingPrice: 3500, stockQuantity: 24, reorderThreshold: 10, isActive: true },
  { id: 'offline-wings', name: 'Chicken Wings', category: 'Food', unit: 'plate', costPrice: 2200, sellingPrice: 6500, stockQuantity: 9, reorderThreshold: 5, isActive: true },
  { id: 'offline-water', name: 'Bottle Water', category: 'Soft Drinks', unit: 'bottle', costPrice: 200, sellingPrice: 700, stockQuantity: 72, reorderThreshold: 24, isActive: true },
];
const OFFLINE_ORDERS: Order[] = [];
const OFFLINE_USERS: Record<string, Profile> = {
  'owner@maltlime.ng': { id: 'offline-owner', name: 'Owner', email: 'owner@maltlime.ng', role: 'owner' },
  'manager@maltlime.ng': { id: 'offline-manager', name: 'Manager', email: 'manager@maltlime.ng', role: 'manager' },
  'staff@maltlime.ng': { id: 'offline-staff', name: 'Staff', email: 'staff@maltlime.ng', role: 'staff' },
};
const OFFLINE_AUDIT_LOGS: AuditLog[] = [
  { id: 'off-log-1', action: 'user_create', entityType: 'User', entityId: 'offline-staff', userId: { id: 'offline-owner', name: 'Owner', role: 'owner' }, details: { email: 'staff@maltlime.ng', role: 'staff' }, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'off-log-2', action: 'shift_open', entityType: 'Shift', entityId: 'offline-shift-1', userId: { id: 'offline-manager', name: 'Manager', role: 'manager' }, details: { openingFloat: 10000 }, createdAt: new Date(Date.now() - 7200000).toISOString() }
];
let OFFLINE_SHIFTS: Shift[] = [];
let OFFLINE_CURRENT_SHIFT: Shift | null = null;
let offlineMode = false;
let offlineUser: Profile | null = null;

function getOfflineCustomers(): Customer[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_CUSTOMERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const initial: Customer[] = [
    { id: 'off-cust-1', name: 'John Okafor', email: 'john@maltlime.ng', phone: '08012345678', marketingConsentEmail: true, marketingConsentWhatsApp: true, notes: 'Lekki Regular Customer', orderCount: 3, totalSpent: 18500, lastOrderDate: new Date(Date.now() - 3600000 * 4).toISOString() },
    { id: 'off-cust-2', name: 'Chinwe Adebayo', email: 'chinwe@lounge.ng', phone: '08169998888', marketingConsentEmail: true, marketingConsentWhatsApp: false, notes: 'Prefers Champagne & VIP Lounge', orderCount: 1, totalSpent: 65000, lastOrderDate: new Date(Date.now() - 3600000 * 24).toISOString() },
    { id: 'off-cust-3', name: 'Femi Balogun', email: '', phone: '09077776666', marketingConsentEmail: false, marketingConsentWhatsApp: true, notes: 'Weekend Bar Patron', orderCount: 5, totalSpent: 42000, lastOrderDate: new Date(Date.now() - 3600000 * 48).toISOString() }
  ];
  saveOfflineCustomers(initial);
  return initial;
}

function saveOfflineCustomers(customers: Customer[]) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(OFFLINE_CUSTOMERS_KEY, JSON.stringify(customers));
    } catch {}
  }
}

export function loadTokens(): { token: string; refreshToken: string; user?: Profile } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    accessToken = parsed.token;
    refreshToken = parsed.refreshToken;
    return parsed;
  } catch {
    return null;
  }
}

export function saveTokens(token: string, refresh: string, user?: Profile) {
  accessToken = token;
  refreshToken = refresh;
  if (typeof window !== 'undefined') {
    let existingUser: Profile | undefined = undefined;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        existingUser = parsed.user;
      }
    } catch {}
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      token,
      refreshToken: refresh,
      user: user || existingUser
    }));
  }
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  offlineMode = false;
  offlineUser = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getAccessToken() {
  if (accessToken) return accessToken;
  loadTokens();
  return accessToken;
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) return false;
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  saveTokens(data.token, data.refreshToken);
  return true;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function isOfflineFallbackError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof ApiError) {
    const s = error.status;
    return s === 0 || s === 404 || s === 508 || (s >= 500 && s < 600);
  }
  return false;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${accessToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    }
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (err) {
    if (!res.ok) {
      throw new ApiError('Request failed with non-JSON response', res.status);
    }
    throw err;
  }

  if (!res.ok) {
    throw new ApiError(data?.error || 'Request failed', res.status, data?.details);
  }
  return data as T;
}

function offlineLogin(email: string, password: string) {
  const user = OFFLINE_USERS[email.toLowerCase()];
  if (!user || password !== 'password123') throw new ApiError('Invalid email or password', 401);
  offlineMode = true;
  offlineUser = user;
  return { token: `offline-token-${user.id}`, refreshToken: `offline-refresh-${user.id}`, user };
}

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      try {
        return await apiFetch<{ token: string; refreshToken: string; user: Profile }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
      } catch (error) {
        if (isOfflineFallbackError(error)) return offlineLogin(email, password);
        throw error;
      }
    },
    register: async (name: string, email: string, password: string) => {
      try {
        return await apiFetch<{ token: string; refreshToken: string; user: Profile }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        });
      } catch (error) {
        if (isOfflineFallbackError(error)) {
          const user = { id: `offline-user-${Date.now()}`, name, email, role: 'staff' as const };
          offlineMode = true;
          offlineUser = user;
          return { token: `offline-token-${user.id}`, refreshToken: `offline-refresh-${user.id}`, user };
        }
        throw error;
      }
    },
    me: async () => {
      const token = getAccessToken();
      if (token && token.startsWith('offline-token-')) {
        offlineMode = true;
        const parsed = loadTokens();
        if (parsed && parsed.user) {
          offlineUser = parsed.user;
        } else {
          const userId = token.replace('offline-token-', '');
          const found = Object.values(OFFLINE_USERS).find(u => u.id === userId);
          if (found) {
            offlineUser = found;
          }
        }
        if (offlineUser) {
          return { user: offlineUser };
        }
      }

      if (offlineMode && offlineUser) return { user: offlineUser };

      try {
        return await apiFetch<{ user: Profile }>('/auth/me');
      } catch (error) {
        if (isOfflineFallbackError(error)) {
          const parsed = loadTokens();
          if (parsed && parsed.user) {
            offlineMode = true;
            offlineUser = parsed.user;
            return { user: offlineUser };
          }
        }
        throw error;
      }
    },
  },
  products: {
    list: async (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      try {
        return await apiFetch<{ products: Product[] }>(`/products${qs}`);
      } catch (error) {
        if (isOfflineFallbackError(error)) {
          offlineMode = true;
          return { products: OFFLINE_PRODUCTS };
        }
        throw error;
      }
    },
    create: async (data: Partial<Product>) => {
      if (offlineMode) {
        const product = { ...OFFLINE_PRODUCTS[0], ...data, id: `offline-${Date.now()}` } as Product;
        OFFLINE_PRODUCTS.push(product);
        return { product };
      }
      return apiFetch<{ product: Product }>('/products', { method: 'POST', body: JSON.stringify(data) });
    },
    update: async (id: string, data: Partial<Product>) => {
      if (offlineMode) {
        const index = OFFLINE_PRODUCTS.findIndex((p) => p.id === id);
        if (index !== -1) {
          OFFLINE_PRODUCTS[index] = { ...OFFLINE_PRODUCTS[index], ...data };
          return { product: OFFLINE_PRODUCTS[index] };
        }
        throw new ApiError('Product not found', 404);
      }
      return apiFetch<{ product: Product }>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    remove: (id: string) =>
      apiFetch<{ message: string }>(`/products/${id}`, { method: 'DELETE' }),
  },
  suppliers: {
    list: () => apiFetch<{ suppliers: Supplier[] }>('/suppliers'),
    create: (data: Partial<Supplier>) =>
      apiFetch<{ supplier: Supplier }>('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  },
  stock: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return apiFetch<{ movements: StockMovement[] }>(`/stock-movements${qs}`);
    },
    create: (data: { productId: string; type: string; quantity: number; note?: string }) =>
      apiFetch<{ movement: StockMovement; product: Product }>('/stock-movements', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  orders: {
    list: async (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      try {
        return await apiFetch<{ orders: Order[] }>(`/orders${qs}`);
      } catch (error) {
        if (isOfflineFallbackError(error)) {
          offlineMode = true;
          return { orders: OFFLINE_ORDERS };
        }
        throw error;
      }
    },
    create: async (data: { tabName?: string; items: { productId: string; name: string; quantity: number; unitPrice: number }[] }) => {
      if (offlineMode) {
        const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        const order = { id: `offline-order-${Date.now()}`, tabName: data.tabName || 'Counter', items: data.items, subtotal, vat: 0, discount: 0, total: subtotal, paymentMethod: null, status: 'open', createdAt: new Date().toISOString() } as Order;
        OFFLINE_ORDERS.unshift(order);
        return { order };
      }
      return apiFetch<{ order: Order }>('/orders', { method: 'POST', body: JSON.stringify(data) });
    },
    checkout: async (
      id: string,
      data: {
        paymentMethod: string;
        paymentRef?: string;
        discount?: number;
        customerEmail?: string;
        customerPhone?: string;
        marketingConsentEmail?: boolean;
        marketingConsentWhatsApp?: boolean;
      }
    ) => {
      if (offlineMode) {
        const order = OFFLINE_ORDERS.find((item) => item.id === id);
        if (!order) throw new ApiError('Order not found', 404);
        const discount = data.discount || 0;
        order.discount = discount;
        order.vat = +((order.subtotal - discount) * 0.075).toFixed(2);
        order.total = order.subtotal - discount + order.vat;
        order.paymentMethod = data.paymentMethod;
        order.customerEmail = data.customerEmail || undefined;
        order.customerPhone = data.customerPhone || undefined;
        order.marketingConsentEmail = data.marketingConsentEmail || false;
        order.marketingConsentWhatsApp = data.marketingConsentWhatsApp || false;
        order.status = 'paid';
        order.paidAt = new Date().toISOString();

        if (data.customerEmail || data.customerPhone) {
          const cleanEmail = (data.customerEmail || '').trim().toLowerCase();
          const cleanPhone = (data.customerPhone || '').trim();
          const customers = getOfflineCustomers();
          const existing = customers.find(c => (cleanEmail && c.email === cleanEmail) || (cleanPhone && c.phone === cleanPhone));
          if (existing) {
            existing.orderCount = (existing.orderCount || 0) + 1;
            existing.totalSpent = (existing.totalSpent || 0) + order.total;
            existing.lastOrderDate = order.paidAt;
            if (cleanEmail && !existing.email) existing.email = cleanEmail;
            if (cleanPhone && !existing.phone) existing.phone = cleanPhone;
            if (data.marketingConsentEmail !== undefined) existing.marketingConsentEmail = !!data.marketingConsentEmail;
            if (data.marketingConsentWhatsApp !== undefined) existing.marketingConsentWhatsApp = !!data.marketingConsentWhatsApp;
          } else {
            customers.unshift({
              id: `off-cust-${Date.now()}`,
              name: cleanEmail ? cleanEmail.split('@')[0] : 'Guest',
              email: cleanEmail,
              phone: cleanPhone,
              marketingConsentEmail: !!data.marketingConsentEmail,
              marketingConsentWhatsApp: !!data.marketingConsentWhatsApp,
              orderCount: 1,
              totalSpent: order.total,
              lastOrderDate: order.paidAt
            });
          }
          saveOfflineCustomers(customers);
        }

        return { order };
      }
      return apiFetch<{ order: Order }>(`/orders/${id}/checkout`, { method: 'POST', body: JSON.stringify(data) });
    },
    void: (id: string, data: { reason: string; pin: string }) =>
      apiFetch<{ order: Order }>(`/orders/${id}/void`, { method: 'POST', body: JSON.stringify(data) }),
    sendReceipt: async (
      id: string,
      data: {
        type: 'email' | 'whatsapp' | 'both';
        recipientEmail?: string;
        recipientPhone?: string;
      }
    ): Promise<{
      success: boolean;
      emailSent: boolean;
      emailSimulated: boolean;
      whatsAppSent: boolean;
      waUrl: string | null;
      recipientEmail: string | null;
      recipientPhone: string | null;
      message: string;
    }> => {
      if (offlineMode) {
        const order = OFFLINE_ORDERS.find((item) => item.id === id);
        const emailToUse = (data.recipientEmail || order?.customerEmail || '').trim();
        const phoneToUse = (data.recipientPhone || order?.customerPhone || '').trim();

        if (data.type === 'email' || data.type === 'both') {
          if (!emailToUse) {
            throw new ApiError('Customer email address is required', 400);
          }
        }
        if (data.type === 'whatsapp' || data.type === 'both') {
          if (!phoneToUse) {
            throw new ApiError('Customer phone number is required', 400);
          }
        }

        let cleanPhone = phoneToUse.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) {
          cleanPhone = '234' + cleanPhone.slice(1);
        } else if (!cleanPhone.startsWith('234') && cleanPhone.length === 10) {
          cleanPhone = '234' + cleanPhone;
        }

        const formatNGN = (amt: number) => '₦' + Number(amt || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
        const formattedDate = new Date(order?.paidAt || order?.createdAt || Date.now()).toLocaleString('en-NG', {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: 'Africa/Lagos'
        });
        const itemLines = (order?.items || [])
          .map((i) => `• ${i.name} (${i.quantity}x) @ ${formatNGN(i.unitPrice)} = ${formatNGN(i.quantity * i.unitPrice)}`)
          .join('\n');

        const textMsg = `🧾 *MALT & LIME BAR*
_Nigeria Operations - Thermal Receipt_
12 Admiralty Way, Lekki Phase 1, Lagos

--------------------------------
*Date:* ${formattedDate}
*Tab:* ${order?.tabName || 'Counter'}
*Ref:* ${id}
--------------------------------
*ITEMS:*
${itemLines}
--------------------------------
SUBTOTAL: ${formatNGN(order?.subtotal || 0)}
VAT (7.5%): ${formatNGN(order?.vat || 0)}
${order?.discount && order.discount > 0 ? `DISCOUNT: -${formatNGN(order.discount)}\n` : ''}*TOTAL PAID:* ${formatNGN(order?.total || 0)}
--------------------------------
PAID VIA CASH
Thank you for your patronage! 🥂`;

        const waUrl = (data.type === 'whatsapp' || data.type === 'both') && cleanPhone
          ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMsg)}`
          : null;

        return {
          success: true,
          emailSent: data.type === 'email' || data.type === 'both',
          emailSimulated: true,
          whatsAppSent: data.type === 'whatsapp' || data.type === 'both',
          waUrl,
          recipientEmail: emailToUse || null,
          recipientPhone: phoneToUse || null,
          message: 'Receipt sent (offline simulation)'
        };
      }
      try {
        return await apiFetch<{
          success: boolean;
          emailSent: boolean;
          emailSimulated: boolean;
          whatsAppSent: boolean;
          waUrl: string | null;
          recipientEmail: string | null;
          recipientPhone: string | null;
          message: string;
        }>(`/orders/${id}/send-receipt`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (error) {
        if (isOfflineFallbackError(error)) {
          offlineMode = true;
          return api.orders.sendReceipt(id, data);
        }
        throw error;
      }
    },
  },
  shifts: {
    current: async () => {
      try {
        return await apiFetch<{ shift: Shift | null }>('/shifts/current');
      } catch (error) {
        if (isOfflineFallbackError(error)) {
          offlineMode = true;
          return { shift: OFFLINE_CURRENT_SHIFT };
        }
        throw error;
      }
    },
    history: async () => {
      try {
        return await apiFetch<{ shifts: Shift[] }>('/shifts/history');
      } catch (error) {
        if (isOfflineFallbackError(error)) {
          offlineMode = true;
          return { shifts: OFFLINE_SHIFTS };
        }
        throw error;
      }
    },
    open: async (openingFloat: number) => {
      if (offlineMode) {
        const shift = {
          id: `offline-shift-${Date.now()}`,
          staffId: offlineUser?.id || 'offline-staff',
          openingFloat,
          closingCount: null,
          expectedCash: null,
          variance: null,
          openedAt: new Date().toISOString(),
          closedAt: null
        } as Shift;
        OFFLINE_CURRENT_SHIFT = shift;
        return { shift };
      }
      try {
        return await apiFetch<{ shift: Shift }>('/shifts/open', { method: 'POST', body: JSON.stringify({ openingFloat }) });
      } catch (error) {
        if (isOfflineFallbackError(error)) {
          offlineMode = true;
          const shift = {
            id: `offline-shift-${Date.now()}`,
            staffId: offlineUser?.id || 'offline-staff',
            openingFloat,
            closingCount: null,
            expectedCash: null,
            variance: null,
            openedAt: new Date().toISOString(),
            closedAt: null
          } as Shift;
          OFFLINE_CURRENT_SHIFT = shift;
          return { shift };
        }
        throw error;
      }
    },
    close: async (id: string, closingCount: number) => {
      if (offlineMode) {
        if (!OFFLINE_CURRENT_SHIFT) throw new ApiError('No open shift found', 404);
        const shift = OFFLINE_CURRENT_SHIFT;
        const paidOrders = OFFLINE_ORDERS.filter(o => o.status === 'paid' && o.paidAt && o.paidAt >= shift.openedAt);
        const cashSales = paidOrders
          .filter(o => o.paymentMethod === 'cash')
          .reduce((sum, o) => sum + o.total, 0);
        const expectedCash = shift.openingFloat + cashSales;
        const variance = closingCount - expectedCash;
        shift.closingCount = closingCount;
        shift.expectedCash = expectedCash;
        shift.variance = variance;
        shift.closedAt = new Date().toISOString();
        OFFLINE_SHIFTS.unshift(shift);
        OFFLINE_CURRENT_SHIFT = null;
        return { shift };
      }
      try {
        return await apiFetch<{ shift: Shift }>(`/shifts/${id}/close`, { method: 'POST', body: JSON.stringify({ closingCount }) });
      } catch (error) {
        if (isOfflineFallbackError(error)) {
          offlineMode = true;
          if (!OFFLINE_CURRENT_SHIFT) throw new ApiError('No open shift found', 404);
          const shift = OFFLINE_CURRENT_SHIFT;
          const paidOrders = OFFLINE_ORDERS.filter(o => o.status === 'paid' && o.paidAt && o.paidAt >= shift.openedAt);
          const cashSales = paidOrders
            .filter(o => o.paymentMethod === 'cash')
            .reduce((sum, o) => sum + o.total, 0);
          const expectedCash = shift.openingFloat + cashSales;
          const variance = closingCount - expectedCash;
          shift.closingCount = closingCount;
          shift.expectedCash = expectedCash;
          shift.variance = variance;
          shift.closedAt = new Date().toISOString();
          OFFLINE_SHIFTS.unshift(shift);
          OFFLINE_CURRENT_SHIFT = null;
          return { shift };
        }
        throw error;
      }
    },
  },
  reports: {
    sales: async (period: string) => {
      try {
        return await apiFetch<{ [key: string]: unknown }>(`/reports/sales?period=${period}`);
      } catch (error) {
        if (isOfflineFallbackError(error)) {
          offlineMode = true;
          const getLagosDateParts = (date: Date) => {
            const formatter = new Intl.DateTimeFormat('en-US', {
              timeZone: 'Africa/Lagos',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            });
            const parts = formatter.formatToParts(date);
            const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
            return {
              year: parseInt(getPart('year'), 10),
              month: parseInt(getPart('month'), 10),
              day: parseInt(getPart('day'), 10),
              hour: parseInt(getPart('hour'), 10),
              minute: parseInt(getPart('minute'), 10),
              second: parseInt(getPart('second'), 10)
            };
          };

          const pNow = getLagosDateParts(new Date());
          const now = new Date();
          let from = new Date();
          if (period === 'weekly') {
            const lagosTimeNow = new Date(`${pNow.year}-${String(pNow.month).padStart(2, '0')}-${String(pNow.day).padStart(2, '0')}T${String(pNow.hour).padStart(2, '0')}:${String(pNow.minute).padStart(2, '0')}:${String(pNow.second).padStart(2, '0')}+01:00`);
            from = new Date(lagosTimeNow.getTime());
            from.setDate(from.getDate() - 7);
          } else if (period === 'monthly') {
            const lagosTimeNow = new Date(`${pNow.year}-${String(pNow.month).padStart(2, '0')}-${String(pNow.day).padStart(2, '0')}T${String(pNow.hour).padStart(2, '0')}:${String(pNow.minute).padStart(2, '0')}:${String(pNow.second).padStart(2, '0')}+01:00`);
            from = new Date(lagosTimeNow.getTime());
            from.setMonth(from.getMonth() - 1);
          } else {
            from = new Date(`${pNow.year}-${String(pNow.month).padStart(2, '0')}-${String(pNow.day).padStart(2, '0')}T00:00:00+01:00`);
          }

          const inRange = OFFLINE_ORDERS.filter(o => o.status === 'paid' && o.paidAt && new Date(o.paidAt) >= from && new Date(o.paidAt) <= now);
          const revenue = inRange.reduce((sum, o) => sum + o.total, 0);
          const vat = inRange.reduce((sum, o) => sum + o.vat, 0);

          const byCategory: Record<string, number> = {};
          const byProduct: Record<string, number> = {};
          const byStaff: Record<string, number> = {};

          for (const order of inRange) {
            byStaff[offlineUser?.name || 'Staff'] = (byStaff[offlineUser?.name || 'Staff'] || 0) + order.total;
            for (const item of order.items) {
              const product = OFFLINE_PRODUCTS.find(p => p.id === item.productId);
              const category = product?.category || 'Other';
              byCategory[category] = (byCategory[category] || 0) + item.unitPrice * item.quantity;
              byProduct[item.name] = (byProduct[item.name] || 0) + item.quantity;
            }
          }

          const topProducts = Object.entries(byProduct)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, qty]) => ({ name, quantity: qty }));

          return {
            period,
            orderCount: inRange.length,
            revenue,
            vat,
            byCategory: Object.entries(byCategory).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total),
            topProducts,
            byStaff: Object.entries(byStaff).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total),
          };
        }
        throw error;
      }
    },
    inventoryValuation: async () => {
      try {
        return await apiFetch<{ totalValue: number; items: unknown[] }>('/reports/inventory-valuation');
      } catch (error) {
        if (isOfflineFallbackError(error)) {
          offlineMode = true;
          const items = OFFLINE_PRODUCTS.map(p => ({
            name: p.name,
            category: p.category,
            stockQuantity: p.stockQuantity,
            costPrice: p.costPrice,
            value: p.stockQuantity * p.costPrice,
          }));
          const totalValue = items.reduce((sum, v) => sum + v.value, 0);
          return { totalValue, items };
        }
        throw error;
      }
    },
    lowStock: async () => {
      try {
        return await apiFetch<{ products: Product[] }>('/reports/low-stock');
      } catch (error) {
        if (isOfflineFallbackError(error)) {
          offlineMode = true;
          const products = OFFLINE_PRODUCTS.filter(p => p.stockQuantity <= p.reorderThreshold);
          return { products };
        }
        throw error;
      }
    },
  },
  users: {
    list: async () => {
      try {
        return await apiFetch<{ users: Profile[] }>('/users');
      } catch (error) {
        if (isOfflineFallbackError(error)) {
          offlineMode = true;
          return { users: Object.values(OFFLINE_USERS) };
        }
        throw error;
      }
    },
    create: async (data: Partial<Profile & { password?: string; pin?: string }>) => {
      if (offlineMode) {
        const id = `offline-user-${Date.now()}`;
        const user = { id, name: data.name || '', email: data.email || '', role: data.role || 'staff', phone: data.phone } as Profile;
        OFFLINE_USERS[data.email?.toLowerCase() || ''] = user;
        return { user };
      }
      return apiFetch<{ user: Profile }>('/users', { method: 'POST', body: JSON.stringify(data) });
    },
    update: async (id: string, data: Partial<Profile & { pin?: string; password?: string }>) => {
      if (offlineMode) {
        const email = Object.keys(OFFLINE_USERS).find(key => OFFLINE_USERS[key].id === id);
        if (email) {
          OFFLINE_USERS[email] = { ...OFFLINE_USERS[email], ...data } as Profile;
          return { user: OFFLINE_USERS[email] };
        }
        throw new ApiError('User not found', 404);
      }
      return apiFetch<{ user: Profile }>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    remove: async (id: string) => {
      if (offlineMode) {
        const email = Object.keys(OFFLINE_USERS).find(key => OFFLINE_USERS[key].id === id);
        if (email) {
          delete OFFLINE_USERS[email];
          return { message: 'User deleted' };
        }
        throw new ApiError('User not found', 404);
      }
      return apiFetch<{ message: string }>(`/users/${id}`, { method: 'DELETE' });
    }
  },
  customers: {
    list: async () => {
      try {
        return await apiFetch<{ customers: Customer[] }>('/customers');
      } catch (error) {
        if (isOfflineFallbackError(error)) {
          offlineMode = true;
          return { customers: getOfflineCustomers() };
        }
        throw error;
      }
    },
    create: async (data: Partial<Customer>) => {
      if (offlineMode) {
        const customers = getOfflineCustomers();
        const cleanEmail = (data.email || '').trim().toLowerCase();
        const cleanPhone = (data.phone || '').trim();
        const newCustomer: Customer = {
          id: `off-cust-${Date.now()}`,
          name: (data.name || '').trim() || (cleanEmail ? cleanEmail.split('@')[0] : 'Guest'),
          email: cleanEmail,
          phone: cleanPhone,
          marketingConsentEmail: data.marketingConsentEmail !== false,
          marketingConsentWhatsApp: data.marketingConsentWhatsApp !== false,
          notes: data.notes || '',
          orderCount: data.orderCount || 0,
          totalSpent: data.totalSpent || 0,
          lastOrderDate: data.lastOrderDate || new Date().toISOString()
        };
        customers.unshift(newCustomer);
        saveOfflineCustomers(customers);
        return { customer: newCustomer };
      }
      return apiFetch<{ customer: Customer }>('/customers', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    update: async (id: string, data: Partial<Customer>) => {
      if (offlineMode) {
        const customers = getOfflineCustomers();
        const index = customers.findIndex(c => (c.id || c._id) === id);
        if (index !== -1) {
          customers[index] = { ...customers[index], ...data };
          saveOfflineCustomers(customers);
          return { customer: customers[index] };
        }
        throw new ApiError('Customer not found', 404);
      }
      return apiFetch<{ customer: Customer }>(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    remove: async (id: string) => {
      if (offlineMode) {
        let customers = getOfflineCustomers();
        const initialLen = customers.length;
        customers = customers.filter(c => (c.id || c._id) !== id);
        if (customers.length === initialLen) {
          throw new ApiError('Customer not found', 404);
        }
        saveOfflineCustomers(customers);
        return { message: 'Customer removed' };
      }
      return apiFetch<{ message: string }>(`/customers/${id}`, {
        method: 'DELETE'
      });
    }
  },
  auditLogs: {
    list: async () => {
      try {
        return await apiFetch<{ logs: AuditLog[] }>('/audit-logs');
      } catch (error) {
        if (isOfflineFallbackError(error)) {
          offlineMode = true;
          return { logs: OFFLINE_AUDIT_LOGS };
        }
        throw error;
      }
    }
  },
  campaigns: {
    contacts: async () => {
      try {
        return await apiFetch<{ contacts: Customer[] }>('/campaigns/contacts');
      } catch (error) {
        if (isOfflineFallbackError(error)) {
          offlineMode = true;

          const offlineCusts = getOfflineCustomers();
          const contactsMap = new Map<string, Customer>();

          offlineCusts.forEach(c => {
            const key = (c.email || c.phone || c.id || c._id || '').trim().toLowerCase();
            if (key) {
              contactsMap.set(key, { ...c });
            }
          });

          // Fallback: extract unique contacts from OFFLINE_ORDERS
          OFFLINE_ORDERS.forEach(order => {
            const email = (order.customerEmail || '').trim().toLowerCase();
            const phone = (order.customerPhone || '').trim();

            if (email || phone) {
              const key = email || phone;
              if (!contactsMap.has(key)) {
                contactsMap.set(key, {
                  id: `order-cust-${key}`,
                  name: email ? email.split('@')[0] : 'Guest',
                  email: email || '',
                  phone: phone || '',
                  marketingConsentEmail: order.marketingConsentEmail || false,
                  marketingConsentWhatsApp: order.marketingConsentWhatsApp || false,
                  orderCount: 0,
                  totalSpent: 0,
                  lastOrderDate: order.paidAt || order.createdAt
                });
              }
              const contact = contactsMap.get(key)!;
              contact.orderCount += 1;
              contact.totalSpent += order.total || 0;
              const orderDate = new Date(order.paidAt || order.createdAt);
              if (orderDate > new Date(contact.lastOrderDate || 0)) {
                contact.lastOrderDate = order.paidAt || order.createdAt;
              }
            }
          });

          return { contacts: Array.from(contactsMap.values()) };
        }
        throw error;
      }
    },
    sendEmail: async (data: { recipients: string[]; subject: string; body: string }) => {
      try {
        return await apiFetch<{ success: boolean; simulated: boolean; count: number; message: string }>('/campaigns/send-email', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      } catch (error) {
        if (isOfflineFallbackError(error)) {
          offlineMode = true;
          return {
            success: true,
            simulated: true,
            count: data.recipients.length,
            message: 'Campaign sent successfully in offline simulation mode'
          };
        }
        throw error;
      }
    },
    sendWhatsApp: async (data: { recipients: string[]; message: string }) => {
      try {
        return await apiFetch<{ success: boolean; simulated: boolean; count: number; message: string }>('/campaigns/send-whatsapp', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      } catch (error) {
        if (isOfflineFallbackError(error)) {
          offlineMode = true;
          return {
            success: true,
            simulated: true,
            count: data.recipients.length,
            message: 'WhatsApp campaign completed in offline simulation mode'
          };
        }
        throw error;
      }
    }
  }
};

export type Profile = { id: string; name: string; email: string; role: 'owner' | 'manager' | 'staff'; phone?: string; isActive?: boolean };
export type Product = {
  id: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  reorderThreshold: number;
  supplierId?: string | { id: string; name: string };
  isActive: boolean;
};
export type Supplier = { id: string; name: string; contactPerson?: string; phone?: string; email?: string };
export type StockMovement = { id: string; productId: string; type: string; quantity: number; note?: string; createdAt: string };
export type Order = {
  id: string;
  tabName: string;
  items: { productId: string; name: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  vat: number;
  discount: number;
  total: number;
  paymentMethod: string | null;
  status: string;
  staffId?: string;
  paidAt?: string;
  createdAt: string;
  customerEmail?: string;
  customerPhone?: string;
  marketingConsentEmail?: boolean;
  marketingConsentWhatsApp?: boolean;
};
export type Shift = {
  id: string;
  staffId: string;
  openingFloat: number;
  closingCount: number | null;
  expectedCash: number | null;
  variance: number | null;
  openedAt: string;
  closedAt: string | null;
};
export type AuditLog = {
  id: string;
  userId: { id: string; name: string; role: string } | string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: any;
  createdAt: string;
};
export type Customer = {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  phone: string;
  marketingConsentEmail: boolean;
  marketingConsentWhatsApp: boolean;
  notes?: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate?: string;
};
