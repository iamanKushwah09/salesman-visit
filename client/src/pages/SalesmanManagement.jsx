import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { UserCheck, Plus, Edit2, Trash2, Search, MapPin, Target, Bike, X } from 'lucide-react';

const SalesmanManagement = () => {
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSalesman, setEditingSalesman] = useState(null);

  // Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [territory, setTerritory] = useState('Indore Central');
  const [vehicleType, setVehicleType] = useState('Bike / Scooter');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [monthlyTarget, setMonthlyTarget] = useState(150000);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSalesmen = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/salesmen?search=${encodeURIComponent(search)}`);
      if (res.success) setSalesmen(res.salesmen || []);
    } catch (err) {
      console.error('Fetch salesmen error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesmen();
  }, [search]);

  const openCreateModal = () => {
    setEditingSalesman(null);
    setName('');
    setPhone('');
    setEmail('');
    setTerritory('Indore Central');
    setVehicleType('Bike / Scooter');
    setVehicleNumber('');
    setMonthlyTarget(150000);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (sm) => {
    setEditingSalesman(sm);
    setName(sm.name);
    setPhone(sm.phone);
    setEmail(sm.email || '');
    setTerritory(sm.territory || '');
    setVehicleType(sm.vehicleType || 'Bike / Scooter');
    setVehicleNumber(sm.vehicleNumber || '');
    setMonthlyTarget(sm.monthlyTarget || 0);
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (editingSalesman) {
        await api.put(`/salesmen/${editingSalesman._id}`, {
          name,
          phone,
          email,
          territory,
          vehicleType,
          vehicleNumber,
          monthlyTarget,
        });
      } else {
        await api.post('/salesmen', {
          name,
          phone,
          email,
          territory,
          vehicleType,
          vehicleNumber,
          monthlyTarget,
        });
      }
      setModalOpen(false);
      fetchSalesmen();
    } catch (err) {
      setFormError(err.message || 'Failed to save salesman');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (sm) => {
    if (!window.confirm(`Delete salesman '${sm.name}' (${sm.salesmanCode})?`)) return;
    try {
      await api.delete(`/salesmen/${sm._id}`);
      fetchSalesmen();
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Navbar
        title="Salesmen"
        subtitle="Manage field salesmen, assigned territories, and contact details"
      />

      <main className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, code, phone, territory..."
              className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded-xl pl-9 pr-3.5 py-2.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-600"
            />
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-brand-600/30 transition self-end sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Salesman</span>
          </button>
        </div>

        {/* Grid of Salesmen Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs">
              Loading salesmen fleet...
            </div>
          ) : salesmen.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs">
              No salesmen registered yet. Click 'Add Salesman' to create one.
            </div>
          ) : (
            salesmen.map((sm) => (
              <div
                key={sm._id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-md">
                      {sm.name ? sm.name.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{sm.name}</h3>
                      <span className="text-[11px] font-mono font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
                        {sm.salesmanCode}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(sm)}
                      className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-100 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(sm)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{sm.territory || 'Unassigned Territory'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bike className="w-3.5 h-3.5 text-slate-400" />
                    <span>{sm.vehicleType} {sm.vehicleNumber ? `(${sm.vehicleNumber})` : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-slate-400" />
                    <span>Target: ₹ {Number(sm.monthlyTarget || 0).toLocaleString()} / month</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-mono">{sm.phone}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      sm.isActive
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {sm.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingSalesman ? `Edit Salesman: ${editingSalesman.name}` : 'Register New Field Salesman'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    required
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sales@company.com"
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Territory / Area</label>
                <input
                  type="text"
                  value={territory}
                  onChange={(e) => setTerritory(e.target.value)}
                  placeholder="e.g. Indore Central, Palasia"
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Vehicle Type</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    <option value="Bike / Scooter">Bike / Scooter</option>
                    <option value="Car">Car</option>
                    <option value="Public Transport">Public Transport</option>
                    <option value="On Foot">On Foot</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Vehicle Plate No</label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="e.g. MP 09 AB 1234"
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Monthly Target (₹)</label>
                <input
                  type="number"
                  value={monthlyTarget}
                  onChange={(e) => setMonthlyTarget(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingSalesman ? 'Update Salesman' : 'Register Salesman'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesmanManagement;

