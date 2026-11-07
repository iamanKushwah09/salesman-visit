import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { Users, Plus, Edit2, Trash2, Shield, UserCheck, Search, X } from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('');
  const [salesmanId, setSalesmanId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes, salesmenRes] = await Promise.all([
        api.get(`/users?search=${encodeURIComponent(search)}`),
        api.get('/roles'),
        api.get('/salesmen'),
      ]);

      if (usersRes.success) setUsers(usersRes.users || []);
      if (rolesRes.success) setRoles(rolesRes.roles || []);
      if (salesmenRes.success) setSalesmen(salesmenRes.salesmen || []);
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const openCreateModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setRoleId(roles.length > 0 ? roles[0]._id : '');
    setSalesmanId('');
    setIsActive(true);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPassword('');
    setPhone(u.phone || '');
    setRoleId(u.role?._id || '');
    setSalesmanId(u.salesmanProfile?._id || '');
    setIsActive(u.isActive);
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (editingUser) {
        await api.put(`/users/${editingUser._id}`, {
          name,
          email,
          password: password || undefined,
          phone,
          roleId,
          salesmanId: salesmanId || null,
          isActive,
        });
      } else {
        if (!password) throw new Error('Password is required for new users');
        await api.post('/users', {
          name,
          email,
          password,
          phone,
          roleId,
          salesmanId: salesmanId || null,
        });
      }

      setModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.message || 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user '${u.name}'?`)) return;
    try {
      await api.delete(`/users/${u._id}`);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Navbar
        title="Users"
        subtitle="Manage user accounts, passwords, and assigned roles"
      />

      <main className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user by name, email, or phone..."
              className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded-xl pl-9 pr-3.5 py-2.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-600"
            />
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-brand-600/30 transition self-end sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="p-4">User Details</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[11px] text-purple-700 dark:text-purple-300">Role Name</th>
                  <th className="p-4">Linked Salesman Profile</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 font-extrabold flex items-center justify-center text-xs shrink-0">
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100">{u.name}</p>
                            <p className="text-slate-500 text-[11px]">{u.email}</p>
                            {u.phone && <p className="text-slate-400 text-[10px]">{u.phone}</p>}
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 font-bold text-xs border border-purple-200 dark:border-purple-800 shadow-xs">
                          <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span>{u.roleName || u.role?.name || 'No Role'}</span>
                        </span>
                      </td>

                      <td className="p-4">
                        {u.salesmanProfile ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold text-xs">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>
                              {u.salesmanProfile.salesmanCode} ({u.salesmanProfile.territory || 'Market'})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Not linked</span>
                        )}
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.isActive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                          }`}
                        >
                          {u.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(u)}
                            title="Edit User"
                            className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            title="Delete User"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/40 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingUser ? `Edit User: ${editingUser.name}` : 'Create New User Account'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  required
                  className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {editingUser ? 'Password (Blank to keep)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required={!editingUser}
                    className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 00000"
                  className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Role Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Role Name (Select from Roles) *
                </label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  required
                  className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold"
                >
                  <option value="">-- Select Role Name --</option>
                  {roles.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} {r.slug === 'super_admin' ? '(Super Admin - All Access)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Link to Salesman Profile */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Link to Salesman Profile (Optional)
                </label>
                <select
                  value={salesmanId}
                  onChange={(e) => setSalesmanId(e.target.value)}
                  className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                >
                  <option value="">-- None (Administrative staff only) --</option>
                  {salesmen.map((sm) => (
                    <option key={sm._id} value={sm._id}>
                      {sm.name} ({sm.salesmanCode} - {sm.territory})
                    </option>
                  ))}
                </select>
              </div>

              {editingUser && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600"
                  />
                  <label htmlFor="isActive" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Account is Active
                  </label>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

