import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { Building2, Plus, Edit2, Trash2, Search, MapPin, IndianRupee, Phone, User, X } from 'lucide-react';

const PartiesManagement = () => {
  const [parties, setParties] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Indore');
  const [territory, setTerritory] = useState('Indore Central');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [assignedSalesmanId, setAssignedSalesmanId] = useState('');
  const [creditLimit, setCreditLimit] = useState(50000);
  const [outstandingBalance, setOutstandingBalance] = useState(0);

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
    setEmail('');
    setAddress('');
    setCity('Indore');
    setTerritory('Indore Central');
    setLatitude('');
    setLongitude('');
    setAssignedSalesmanId(salesmen.length > 0 ? salesmen[0]._id : '');
    setCreditLimit(50000);
    setOutstandingBalance(0);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingParty(p);
    setName(p.name || '');
    setShopName(p.shopName || '');
    setOwnerName(p.ownerName || '');
    setPhone(p.phone || '');
    setEmail(p.email || '');
    setAddress(p.address || '');
    setCity(p.city || 'Indore');
    setTerritory(p.territory || 'Indore Central');
    setLatitude(p.latitude ? String(p.latitude) : '');
    setLongitude(p.longitude ? String(p.longitude) : '');
    setAssignedSalesmanId(p.assignedSalesman?._id || p.assignedSalesman || '');
    setCreditLimit(p.creditLimit || 50000);
    setOutstandingBalance(p.outstandingBalance || 0);
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) return setFormError('Customer party name is required');
    if (!phone.trim()) return setFormError('Contact phone number is required');

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        shopName: shopName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        territory: territory.trim(),
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        assignedSalesman: assignedSalesmanId || null,
        creditLimit: Number(creditLimit) || 0,
        outstandingBalance: Number(outstandingBalance) || 0,
      };

      if (editingParty) {
        await api.put(`/parties/${editingParty._id}`, payload);
      } else {
        await api.post('/parties', payload);
      }

      setModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.message || 'Failed to save customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete customer party "${p.name}"?`)) return;
    try {
      await api.delete(`/parties/${p._id}`);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
      <Navbar
        title="Parties & Customer Stores"
        subtitle="Manage customer shop profiles, GPS geofences, and assigned field salesmen"
      />

      <main className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by party, shop, city, phone..."
              className="w-full text-xs border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 bg-slate-50 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
            />
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer self-end sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200/90">
                  <th className="p-4">Party Code & Name</th>
                  <th className="p-4">Shop & Owner</th>
                  <th className="p-4">Address & City</th>
                  <th className="p-4">Coordinates (GPS)</th>
                  <th className="p-4">Assigned Salesman</th>
                  <th className="p-4">Outstanding</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      Loading party records...
                    </td>
                  </tr>
                ) : parties.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      No customer parties found. Click 'Add Customer' to register one.
                    </td>
                  </tr>
                ) : (
                  parties.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0 border border-purple-200">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{p.name}</p>
                            <span className="font-mono text-[10.5px] text-brand-700 font-bold">
                              {p.partyCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <p className="font-semibold text-slate-800">{p.shopName || '-'}</p>
                        <p className="text-slate-500 text-[11px]">{p.ownerName || p.phone}</p>
                      </td>

                      <td className="p-4">
                        <p className="text-slate-700 max-w-xs truncate">{p.address || '-'}</p>
                        <p className="text-slate-400 text-[11px]">{p.city}</p>
                      </td>

                      <td className="p-4 font-mono text-[11px] text-slate-500">
                        {p.latitude && p.longitude ? (
                          <span className="text-emerald-700 font-bold">
                            {Number(p.latitude).toFixed(4)}, {Number(p.longitude).toFixed(4)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No GPS</span>
                        )}
                      </td>

                      <td className="p-4 font-semibold text-slate-700">
                        {p.assignedSalesman?.name || 'General Fleet'}
                      </td>

                      <td className="p-4 font-bold text-purple-700">
                        ₹ {Number(p.outstandingBalance || 0).toLocaleString()}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            title="Edit"
                            className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            title="Delete"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                {editingParty ? `Edit Customer: ${editingParty.name}` : 'Register New Customer Party'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Party / Entity Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Mahalakshmi Kirana"
                    required
                    className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Shop Name</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="Board Name"
                    className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Owner / Contact Person</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Suresh Jain"
                    className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    required
                    className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Street Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Plot 45, Main Market Road"
                  className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Indore"
                    className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Territory</label>
                  <input
                    type="text"
                    value={territory}
                    onChange={(e) => setTerritory(e.target.value)}
                    placeholder="Indore Central"
                    className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Latitude (GPS)</label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="22.7196"
                    className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Longitude (GPS)</label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="75.8577"
                    className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Assigned Salesman</label>
                  <select
                    value={assignedSalesmanId}
                    onChange={(e) => setAssignedSalesmanId(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  >
                    <option value="">None / Open Pool</option>
                    {salesmen.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.salesmanCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingParty ? 'Update Party' : 'Add Party'}
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
