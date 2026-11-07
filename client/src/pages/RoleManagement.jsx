import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { ShieldCheck, Plus, Edit2, Trash2, CheckSquare, Square, Users, Sparkles, X } from 'lucide-react';

const RoleManagement = () => {
  const [roles, setRoles] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchRolesAndPermissions = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/roles'),
        api.get('/roles/available-permissions'),
      ]);

      if (rolesRes.success) setRoles(rolesRes.roles || []);
      if (permsRes.success) setAvailablePermissions(permsRes.permissions || []);
    } catch (err) {
      console.error('Fetch roles error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const openCreateModal = () => {
    setEditingRole(null);
    setName('');
    setDescription('');
    setSelectedPermissions(['dashboard', 'visits']);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (role) => {
    setEditingRole(role);
    setName(role.name);
    setDescription(role.description || '');
    setSelectedPermissions(role.permissions || []);
    setFormError('');
    setModalOpen(true);
  };

  const togglePermission = (key) => {
    if (selectedPermissions.includes(key)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== key));
    } else {
      setSelectedPermissions([...selectedPermissions, key]);
    }
  };

  const selectAllPermissions = () => {
    setSelectedPermissions(availablePermissions.map((p) => p.key));
  };

  const clearAllPermissions = () => {
    setSelectedPermissions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (!name.trim()) {
        throw new Error('Role name is required');
      }

      if (editingRole) {
        await api.put(`/roles/${editingRole._id}`, {
          name,
          description,
          permissions: selectedPermissions,
        });
      } else {
        await api.createRole
          ? api.createRole({ name, description, permissions: selectedPermissions })
          : await api.post('/roles', { name, description, permissions: selectedPermissions });
      }

      setModalOpen(false);
      fetchRolesAndPermissions();
    } catch (err) {
      setFormError(err.message || 'Failed to save role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (role) => {
    if (!window.confirm(`Are you sure you want to delete role '${role.name}'?`)) return;

    try {
      await api.delete(`/roles/${role._id}`);
      fetchRolesAndPermissions();
    } catch (err) {
      alert(err.message || 'Failed to delete role');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Navbar
        title="Roles & Permissions"
        subtitle="Create roles and configure screen access permissions for each role"
      />

      <main className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Enterprise Role Hierarchy
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Users assigned to a role will only see the features checked below in their sidebar and dashboard.
              </p>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-brand-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Role</span>
          </button>
        </div>

        {/* Roles Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="p-4">Role Name & Identifier</th>
                  <th className="p-4">Assigned Users</th>
                  <th className="p-4">UI Modules Allowed</th>
                  <th className="p-4">Role Type</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400">
                      Loading system roles...
                    </td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400">
                      No roles created yet. Click 'Create New Role' to add one.
                    </td>
                  </tr>
                ) : (
                  roles.map((r) => {
                    const isAll = r.slug === 'super_admin' || r.permissions?.includes('*');
                    const perms = isAll
                      ? availablePermissions.map((p) => p.label)
                      : r.permissions || [];

                    return (
                      <tr key={r._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                        <td className="p-4">
                          <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{r.name}</p>
                          <span className="font-mono text-[10px] text-brand-600 dark:text-brand-400">
                            slug: {r.slug}
                          </span>
                          {r.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{r.description}</p>
                          )}
                        </td>

                        <td className="p-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {r.userCount || 0} Users
                          </span>
                        </td>

                        <td className="p-4 max-w-md">
                          {isAll ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-extrabold text-[11px]">
                              ★ Full Unrestricted Access (All Screens)
                            </span>
                          ) : perms.length === 0 ? (
                            <span className="text-slate-400 italic">No screens assigned</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {perms.map((pKey) => {
                                const found = availablePermissions.find((ap) => ap.key === pKey);
                                return (
                                  <span
                                    key={pKey}
                                    className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10.5px] font-semibold"
                                  >
                                    {found ? found.label.split('(')[0].trim() : pKey}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>

                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              r.isDefault
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {r.isDefault ? 'SYSTEM DEFAULT' : 'CUSTOM ROLE'}
                          </span>
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(r)}
                              title="Edit Permissions"
                              className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded-lg transition"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {!r.isDefault && (
                              <button
                                onClick={() => handleDelete(r)}
                                title="Delete Role"
                                className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/40 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create / Edit Role Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {editingRole ? `Edit Role: ${editingRole.name}` : 'Create New System Role'}
                </h3>
                <p className="text-xs text-slate-500">
                  Select which modules will appear on the sidebar for this role.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Role Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Regional Field Officer"
                      required
                      className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Role Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Conducts retailer visits & collections"
                      className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-600"
                    />
                  </div>
                </div>

                {/* Permissions Selector Checkboxes */}
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700 mb-3">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-brand-600" />
                      Select UI Modules & Screen Access ({selectedPermissions.length} of {availablePermissions.length} selected)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllPermissions}
                        className="text-[11px] font-bold text-brand-600 hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={clearAllPermissions}
                        className="text-[11px] font-bold text-slate-500 hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {availablePermissions.map((perm) => {
                      const isChecked = selectedPermissions.includes(perm.key);
                      return (
                        <div
                          key={perm.key}
                          onClick={() => togglePermission(perm.key)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition select-none flex items-start gap-3 ${
                            isChecked
                              ? 'bg-brand-50/70 border-brand-300 text-brand-900 dark:bg-brand-950/40 dark:border-brand-700 dark:text-brand-200'
                              : 'bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0 text-brand-600">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 fill-brand-600 text-white" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold">{perm.label}</p>
                            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                              {perm.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-600/30 transition disabled:opacity-50"
                >
                  {submitting ? 'Saving Role...' : editingRole ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;

