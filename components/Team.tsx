'use client';

import { useEffect, useState } from 'react';
import { api, type Profile } from '@/lib/api';
import { Users, UserPlus, Shield, Phone, Mail, Trash2, Edit2, X, Key, AlertCircle } from 'lucide-react';

export default function Team({ currentUser }: { currentUser: Profile }) {
  const [team, setTeam] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add User State
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'owner' | 'manager' | 'staff'>('staff');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  // Edit User State
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<'owner' | 'manager' | 'staff'>('staff');
  const [editPin, setEditPin] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  async function loadTeam() {
    setLoading(true);
    setError('');
    try {
      const res = await api.users.list();
      setTeam(res.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve team members');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeam();
  }, []);

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.users.create({
        name,
        email,
        password,
        phone,
        role,
        pin: pin || undefined,
      });
      setShowAddModal(false);
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setRole('staff');
      setPin('');
      loadTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register team member');
    } finally {
      setBusy(false);
    }
  }

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setBusy(true);
    setError('');
    try {
      await api.users.update(editingUser.id, {
        name: editName,
        phone: editPhone,
        role: editRole,
        isActive: editIsActive,
        pin: editPin || undefined,
      });
      setEditingUser(null);
      loadTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update team member');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteUser(id: string) {
    if (id === currentUser.id) {
      alert('You cannot delete your own active account.');
      return;
    }
    if (!confirm('Are you absolutely sure you want to remove this staff member from your workspace?')) {
      return;
    }
    setError('');
    try {
      await api.users.remove(id);
      loadTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove team member');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-emerald-300">Staff operations</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Team Directory</h1>
          <p className="mt-2 text-sm text-slate-400">Add, configure, and manage staff credentials, roles, and shift authorization.</p>
        </div>

        {currentUser.role === 'owner' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="button-primary"
          >
            <UserPlus size={17} /> Invite Staff
          </button>
        )}
      </div>

      {error && (
        <div className="flex gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
          <AlertCircle size={18} className="shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex h-96 items-center justify-center text-slate-400">Loading directory…</div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-medium">Name & Contact</th>
                  <th className="px-5 py-4 font-medium">Role</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  {currentUser.role === 'owner' && <th className="px-5 py-4 text-right font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {team.map((user) => {
                  const isCurrentUser = user.id === currentUser.id;
                  return (
                    <tr key={user.id} className="border-t border-white/5 transition hover:bg-white/[0.01]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/10 text-sm font-semibold text-emerald-300">
                            {user.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-200">
                              {user.name} {isCurrentUser && <span className="text-xs text-emerald-300 ml-1">(You)</span>}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <Mail size={12} /> {user.email}
                              {user.phone && (
                                <>
                                  <span className="text-slate-700">|</span>
                                  <Phone size={12} /> {user.phone}
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                          user.role === 'owner'
                            ? 'bg-purple-400/10 text-purple-300'
                            : user.role === 'manager'
                            ? 'bg-sky-400/10 text-sky-300'
                            : 'bg-emerald-400/10 text-emerald-300'
                        }`}>
                          <Shield size={12} />
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-block h-2 w-2 rounded-full mr-2 ${
                          user.isActive ?? true ? 'bg-emerald-400' : 'bg-slate-600'
                        }`} />
                        <span className="text-xs text-slate-300">
                          {user.isActive ?? true ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {currentUser.role === 'owner' && (
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setEditName(user.name);
                                setEditPhone(user.phone || '');
                                setEditRole(user.role);
                                setEditIsActive(user.isActive ?? true);
                                setEditPin('');
                              }}
                              className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition"
                              title="Edit credentials"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              disabled={isCurrentUser}
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-1.5 hover:bg-red-400/10 rounded-lg text-slate-400 hover:text-red-300 transition disabled:opacity-30 disabled:hover:bg-transparent"
                              title="Delete account"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <form onSubmit={handleAddUser} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c1a17] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-white/5 pb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Add Staff Member</h2>
                <p className="text-xs text-slate-400 mt-0.5">Authorise a new operator for the Nigerian operations workspace.</p>
              </div>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block text-sm text-slate-300">
                Full Name
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="field mt-2"
                  placeholder="e.g. John Doe"
                />
              </label>

              <label className="block text-sm text-slate-300">
                Email Address
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="field mt-2"
                  placeholder="name@maltlime.ng"
                />
              </label>

              <label className="block text-sm text-slate-300">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="field mt-2"
                  placeholder="Minimum 6 characters"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm text-slate-300">
                  Phone (Optional)
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="field mt-2"
                    placeholder="08012345678"
                  />
                </label>

                <label className="block text-sm text-slate-300">
                  4-Digit POS PIN (Optional)
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="field mt-2"
                    placeholder="e.g. 1234"
                  />
                </label>
              </div>

              <label className="block text-sm text-slate-300">
                Workspace Role
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="field mt-2"
                >
                  <option value="staff">Staff (POS & Inventory check)</option>
                  <option value="manager">Manager (Voids, Shifts, Reports)</option>
                  <option value="owner">Owner (Full Admin, Staffing, Ledger)</option>
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button type="button" onClick={() => setShowAddModal(false)} className="button-quiet">
                Cancel
              </button>
              <button disabled={busy} className="button-primary">
                {busy ? 'Registering...' : 'Add Team Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <form onSubmit={handleEditUser} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c1a17] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-white/5 pb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Update Staff Member</h2>
                <p className="text-xs text-slate-400 mt-0.5">Edit credentials or status for {editingUser.name}.</p>
              </div>
              <button type="button" onClick={() => setEditingUser(null)} className="text-slate-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block text-sm text-slate-300">
                Full Name
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="field mt-2"
                  placeholder="Full name"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm text-slate-300">
                  Phone
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="field mt-2"
                    placeholder="Phone"
                  />
                </label>

                <label className="block text-sm text-slate-300">
                  4-Digit POS PIN (Optional)
                  <input
                    type="password"
                    maxLength={4}
                    value={editPin}
                    onChange={(e) => setEditPin(e.target.value)}
                    className="field mt-2"
                    placeholder="Set new 4-digit PIN"
                  />
                </label>
              </div>

              <label className="block text-sm text-slate-300">
                Workspace Role
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="field mt-2"
                >
                  <option value="staff">Staff (POS & Inventory check)</option>
                  <option value="manager">Manager (Voids, Shifts, Reports)</option>
                  <option value="owner">Owner (Full Admin, Staffing, Ledger)</option>
                </select>
              </label>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-white/10 bg-white/5 text-emerald-500 accent-emerald-400 focus:ring-0"
                />
                <label htmlFor="editIsActive" className="text-sm font-medium text-slate-200 cursor-pointer">
                  Account is Active
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button type="button" onClick={() => setEditingUser(null)} className="button-quiet">
                Cancel
              </button>
              <button disabled={busy} className="button-primary">
                {busy ? 'Saving...' : 'Update Member'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
