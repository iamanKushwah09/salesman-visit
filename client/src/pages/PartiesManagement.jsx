import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { Building2, Plus, Edit2, Trash2, Search, MapPin, Phone, X } from 'lucide-react';

const PartiesManagement = () => {
  const [parties, setParties] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState(null);

  // Form
  const [name, setName] = useState('');
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Indore');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [assignedSalesman, setAssignedSalesman] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [partiesRes, salesmenRes] = await Promise.all([
        api.get(`/parties?search=${encodeURIComponent(search)}`),
        api.get('/salesmen'),
      ]);

      if (partiesRes.success) setParties(partiesRes.parties || []);
      if (salesmenRes.success) setSalesmen(salesmenRes.salesmen || []);
    } catch (err) {
      console.error('Fetch parties error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const openCreateModal = () => {
    setEditingParty(null);
    setName('');
    setShopName('');
    setOwnerName('');
    setPhone('');
    setAddress('');
    setCity('Indore');
    setLatitude('22.7196');
    setLongitude('75.8577');
    setOutstandingBalance(0);
    setAssignedSalesman(salesmen[0]?._id || '');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingParty(p);
    setName(p.name);
    setShopName(p.shopName || '');
    setOwnerName(p.ownerName || '');
    setPhone(p.phone);
    setAddress(p.address);
    setCity(p.city || '');
    setLatitude(p.latitude ? String(p.latitude) : '');
    setLongitude(p.longitude ? String(p.longitude) : '');
    setOutstandingBalance(p.outstandingBalance || 0);
    setAssignedSalesman(p.assignedSalesman?._id || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const payload = {
        name,
        shopName,
        ownerName,
        phone,
        address,
        city,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        outstandingBalance: Number(outstandingBalance),
        assignedSalesman: assignedSalesman || null,
      };

      if (editingParty) {
        await api.put(`/parties/${editingParty._id}`, payload);
      } else {
        await api.post('/parties', payload);
      }

      setModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.message || 'Failed to save party');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete customer '${p.name}'?`)) return;
    try {
      await api.delete(`/parties/${p._id}`);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete party');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Navbar
        title="Parties & Customers"
        subtitle="Manage customer stores, addresses, GPS locations, and outstanding balances"
      />

      <main className="flex-1 p-6 overflow-y-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by party, shop, city, phone..."
              className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded-xl pl-9 pr-3.5 py-2.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
            />
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition self-end sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="p-4">Party Code & Name</th>
                  <th className="p-4">Shop & Owner</th>
                  <th className="p-4">Address & City</th>
                  <th className="p-4">Coordinates (GPS)</th>
                  <th className="p-4">Assigned Salesman</th>
                  <th className="p-4">Outstanding</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      Loading party records...
                    </td>
                  </tr>
                ) : parties.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      No customer parties found. Click 'Add New Customer' to register one.
                    </td>
                  </tr>
                ) : (
                  parties.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                      <td className="p-4">
                        <span className="font-mono text-[10px] text-brand-600 font-bold block">{p.partyCode}</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm block">{p.name}</span>
                        <span className="text-[11px] text-slate-500">{p.phone}</span>
                      </td>

                      <td className="p-4">
                        <p className="font-bold text-slate-700 dark:text-slate-200">{p.shopName || '-'}</p>
                        <p className="text-[11px] text-slate-400">Prop: {p.ownerName || 'Self'}</p>
                      </td>

                      <td className="p-4 max-w-xs">
                        <p className="text-slate-800 dark:text-slate-200 truncate">{p.address}</p>
                        <span className="text-[10.5px] text-brand-600 font-bold">{p.city}</span>
                      </td>

                      <td className="p-4 font-mono text-[11px] text-slate-500">
                        {p.latitude && p.longitude ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                            {Number(p.latitude).toFixed(4)}, {Number(p.longitude).toFixed(4)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No GPS</span>
                        )}
                      </td>

                      <td className="p-4 font-semibold text-slate-700 dark:text-slate-200">
                        {p.assignedSalesman?.name || 'General Fleet'}
                      </td>

                      <td className="p-4 font-bold text-purple-700 dark:text-purple-300">
                        ₹ {Number(p.outstandingBalance || 0).toLocaleString()}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            title="Edit"
                            className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            title="Delete"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
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
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {editingParty ? `Edit Customer: ${editingParty.name}` : 'Register New Customer Party'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Party / Business Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Janta Footwear"
                  required
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Shop / Outlet Name</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Shop #14"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 94250 00000"
                    required
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Shop Address *</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Main Market, Near Clock Tower"
                  required
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Indore"
                    className="w-full border border-slate-300 rounded-xl px-2.5 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">GPS Lat</label>
                  <input
                    type="text"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="22.7196"
                    className="w-full border border-slate-300 rounded-xl px-2.5 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">GPS Lng</label>
                  <input
                    type="text"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="75.8577"
                    className="w-full border border-slate-300 rounded-xl px-2.5 py-2 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Outstanding Balance (₹)</label>
                  <input
                    type="number"
                    value={outstandingBalance}
                    onChange={(e) => setOutstandingBalance(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Salesman</label>
                  <select
                    value={assignedSalesman}
                    onChange={(e) => setAssignedSalesman(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="">-- General Fleet --</option>
                    {salesmen.map((sm) => (
                      <option key={sm._id} value={sm._id}>
                        {sm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-bold bg-brand-600 text-white rounded-xl shadow-md"
                >
                  {submitting ? 'Saving...' : editingParty ? 'Update Customer' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartiesManagement;

