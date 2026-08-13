'use client';

import { useState } from 'react';
import { api, type Profile } from '@/lib/api';
import { Settings, User, Lock, Globe, Percent, CheckCircle2, AlertCircle, Key } from 'lucide-react';

export default function SettingsView({
  currentUser,
  onProfileUpdated
}: {
  currentUser: Profile;
  onProfileUpdated: (user: Profile) => void;
}) {
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.users.update(currentUser.id, { name, phone });
      onProfileUpdated(res.user);
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateSecurity(e: React.FormEvent) {
    e.preventDefault();
    if (!pin && !password) {
      setError('Please provide a new PIN or password to update.');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const updateData: any = {};
      if (pin) {
        if (pin.length !== 4 || isNaN(Number(pin))) {
          throw new Error('PIN must be exactly 4 digits.');
        }
        updateData.pin = pin;
      }
      if (password) {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        updateData.password = password;
      }
      await api.users.update(currentUser.id, updateData);
      setPin('');
      setPassword('');
      setSuccess('Security credentials updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update security credentials');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-emerald-300">Workspace configurations</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">System Settings</h1>
        <p className="mt-2 text-sm text-slate-400">Configure personal credentials, view system environment endpoints, and manage tax policies.</p>
      </div>

      {success && (
        <div className="flex gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="flex gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
          <AlertCircle size={18} className="shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <div className="panel p-6 space-y-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
              <User size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">Personal Profile</h2>
              <p className="text-xs text-slate-500">Update your workspace directory name and phone contact.</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <label className="block text-sm text-slate-300">
              Full Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="field mt-2"
                placeholder="Name"
              />
            </label>

            <label className="block text-sm text-slate-300">
              Phone Contact
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="field mt-2"
                placeholder="e.g. +234 80 123 4567"
              />
            </label>

            <button
              disabled={busy}
              type="submit"
              className="button-primary w-full py-2.5"
            >
              {busy ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Security Credentials */}
        <div className="panel p-6 space-y-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-400/10 text-purple-300">
              <Lock size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">Security Credentials</h2>
              <p className="text-xs text-slate-500">Reset your login password or change your 4-digit register PIN.</p>
            </div>
          </div>

          <form onSubmit={handleUpdateSecurity} className="space-y-4">
            <label className="block text-sm text-slate-300">
              New Password (minimum 6 chars)
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field mt-2"
                placeholder="••••••"
                minLength={6}
              />
            </label>

            <label className="block text-sm text-slate-300">
              New 4-Digit POS Register PIN
              <input
                type="password"
                value={pin}
                maxLength={4}
                onChange={(e) => setPin(e.target.value)}
                className="field mt-2"
                placeholder="••••"
              />
            </label>

            <button
              disabled={busy}
              type="submit"
              className="button-primary bg-purple-600 hover:bg-purple-700 border-none text-white w-full py-2.5"
            >
              {busy ? 'Updating...' : 'Update Security Credentials'}
            </button>
          </form>
        </div>

        {/* Workspace info & Lagos Metas */}
        <div className="panel p-6 space-y-6 md:col-span-2">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300">
              <Globe size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">Nigeria Operations Policy</h2>
              <p className="text-xs text-slate-500">Tax compliance settings and base server diagnostics.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3 rounded-xl bg-white/[0.02] p-4 border border-white/5">
              <Percent className="text-emerald-300 mt-0.5 shrink-0" size={18} />
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Nigeria Federal VAT</p>
                <p className="text-xl font-bold text-white mt-1">7.5%</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Applied on checkouts.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-white/[0.02] p-4 border border-white/5">
              <Key className="text-purple-300 mt-0.5 shrink-0" size={18} />
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Operational Currency</p>
                <p className="text-xl font-bold text-white mt-1">NGN (₦)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Nigerian Naira.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-white/[0.02] p-4 border border-white/5">
              <Settings className="text-sky-300 mt-0.5 shrink-0" size={18} />
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">System API Gateway</p>
                <p className="text-sm font-bold text-slate-300 truncate mt-1">Active Connection</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Malt & Lime central Express database.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
