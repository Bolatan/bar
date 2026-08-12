const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type Token = string | null;

let accessToken: Token = null;
let refreshToken: Token = null;

const STORAGE_KEY = 'ml_auth';
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
let offlineMode = false;
let offlineUser: Profile | null = null;

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
  const data = text ? JSON.parse(text) : null;

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
        if (error instanceof TypeError || (error instanceof ApiError && error.status === 0)) return offlineLogin(email, password);
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
        if (error instanceof TypeError || (error instanceof ApiError && error.status === 0)) {
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
        if (error instanceof TypeError || (error instanceof ApiError && error.status === 0)) {
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
        if (error instanceof TypeError || (error instanceof ApiError && error.status === 0)) {
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
    update: (id: string, data: Partial<Product>) =>
      apiFetch<{ product: Product }>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
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
        if (error instanceof TypeError || (error instanceof ApiError && error.status === 0)) {
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
    checkout: async (id: string, data: { paymentMethod: string; paymentRef?: string; discount?: number }) => {
      if (offlineMode) {
        const order = OFFLINE_ORDERS.find((item) => item.id === id);
        if (!order) throw new ApiError('Order not found', 404);
        const discount = data.discount || 0;
        order.discount = discount;
        order.vat = +((order.subtotal - discount) * 0.075).toFixed(2);
        order.total = order.subtotal - discount + order.vat;
        order.paymentMethod = data.paymentMethod;
        order.status = 'paid';
        order.paidAt = new Date().toISOString();
        return { order };
      }
      return apiFetch<{ order: Order }>(`/orders/${id}/checkout`, { method: 'POST', body: JSON.stringify(data) });
    },
    void: (id: string, data: { reason: string; pin: string }) =>
      apiFetch<{ order: Order }>(`/orders/${id}/void`, { method: 'POST', body: JSON.stringify(data) }),
  },
  shifts: {
    current: () => apiFetch<{ shift: Shift | null }>('/shifts/current'),
    history: () => apiFetch<{ shifts: Shift[] }>('/shifts/history'),
    open: (openingFloat: number) =>
      apiFetch<{ shift: Shift }>('/shifts/open', { method: 'POST', body: JSON.stringify({ openingFloat }) }),
    close: (id: string, closingCount: number) =>
      apiFetch<{ shift: Shift }>(`/shifts/${id}/close`, { method: 'POST', body: JSON.stringify({ closingCount }) }),
  },
  reports: {
    sales: (period: string) => apiFetch<{ [key: string]: unknown }>(`/reports/sales?period=${period}`),
    inventoryValuation: () => apiFetch<{ totalValue: number; items: unknown[] }>('/reports/inventory-valuation'),
    lowStock: () => apiFetch<{ products: Product[] }>('/reports/low-stock'),
  },
};

export type Profile = { id: string; name: string; email: string; role: 'owner' | 'manager' | 'staff'; phone?: string };
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
