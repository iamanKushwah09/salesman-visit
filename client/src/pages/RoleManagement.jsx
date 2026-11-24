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
        await api.post('/roles', { name, description, permissions: selectedPermissions });
      }

      setModalOpen(false);
      fetchRolesAndPermissions();
    } catch (err) {
      setFormError(err.message || 'Failed to save role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (!window.confirm(`Are you sure you want to delete role "${role.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/roles/${role._id}`);
      fetchRolesAndPermissions();
    } catch (err) {
      alert(err.message || 'Failed to delete role');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
      <Navbar
        title="Roles & Screen Permissions"
        subtitle="Create roles and configure screen access permissions for each role"
      />

      <main className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-3 rounded-2xl bg-brand-50 text-brand-700 border border-brand-200 shrink-0">
              <ShieldCheck className="w-6 h-6 text-brand-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-800">
                Enterprise Role Hierarchy
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Users assigned to a role will only see the features checked below in their sidebar and dashboard.
              </p>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Role</span>
          </button>
        </div>

        {/* Roles Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200/90 text-xs">
                  <th className="p-4 min-w-[200px]">Role Name & Identifier</th>
                  <th className="p-4 text-center whitespace-nowrap min-w-[130px]">Assigned Users</th>
                  <th className="p-4 min-w-[280px]">UI Modules Allowed</th>
                  <th className="p-4 text-center whitespace-nowrap min-w-[130px]">Role Type</th>
                  <th className="p-4 text-right whitespace-nowrap min-w-[90px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
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
                    const isSystemRole = Boolean(r.isSystem || r.isDefault || r.slug === 'super_admin' || r.slug === 'field_salesman' || r.slug === 'admin');

                    return (
                      <tr key={r._id} className="hover:bg-slate-50/80 transition">
                        <td className="p-4">
                          <p className="font-bold text-slate-900 text-sm">{r.name}</p>
                          <span className="font-mono text-[10px] font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200 inline-block mt-0.5">
                            slug: {r.slug}
                          </span>
                          {r.description && (
                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{r.description}</p>
                          )}
                        </td>

                        <td className="p-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/90 text-slate-700 font-bold text-xs border border-slate-200 shadow-xs whitespace-nowrap">
                            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{r.userCount || 0} Users</span>
                          </span>
                        </td>

                        <td className="p-4 max-w-md">
                          {isAll ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px] shadow-xs">
                              <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>Full Unrestricted Access (All Screens)</span>
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
                                    className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold whitespace-nowrap shadow-xs"
                                  >
                                    {found ? found.label.split('(')[0].trim() : pKey}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>

                        <td className="p-4 text-center whitespace-nowrap">
                          {isSystemRole ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200 whitespace-nowrap shadow-xs">
                              <ShieldCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>System Role</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[11px] border border-indigo-200 whitespace-nowrap shadow-xs">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span>Custom Role</span>
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(r)}
                              title="Edit Role & Permissions"
                              className="p-1.5 text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {!isSystemRole && (
                              <button
                                onClick={() => handleDeleteRole(r)}
                                title="Delete Custom Role"
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingRole ? `Edit Role: ${editingRole.name}` : 'Create New System Role'}
                </h3>
                <p className="text-xs text-slate-500">
                  Select which modules will appear on the sidebar for this role.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Role Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Regional Field Officer"
                      required
                      className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Role Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Conducts retailer visits & collections"
                      className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Permissions Selector Checkboxes */}
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-brand-600" />
                      Select UI Modules & Screen Access ({selectedPermissions.length} of {availablePermissions.length} selected)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllPermissions}
                        className="text-[11px] font-bold text-brand-600 hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={clearAllPermissions}
                        className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
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
                          className={`p-3 rounded-2xl border text-xs cursor-pointer flex items-start gap-2.5 transition ${
                            isChecked
                              ? 'bg-brand-50/70 border-brand-300 text-brand-950 font-semibold shadow-xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0 text-brand-600">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 fill-brand-600 text-white" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs">{perm.label}</p>
                            <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                              {perm.description || `Grants access to ${perm.key} module`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
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
