import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { CheckCircle2, Plus, Calendar, MapPin, Receipt, Clock, Search, X } from 'lucide-react';

const VisitsManagement = () => {
  const [visits, setVisits] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Form
  const [salesmanId, setSalesmanId] = useState('');
  const [partyId, setPartyId] = useState('');
  const [purpose, setPurpose] = useState('Sales Order');
  const [collectionAmount, setCollectionAmount] = useState(0);
  const [orderAmount, setOrderAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [visitsRes, salesmenRes, partiesRes] = await Promise.all([
        api.get('/visits'),
        api.get('/salesmen'),
        api.get('/parties'),
      ]);

      if (visitsRes.success) setVisits(visitsRes.visits || []);
      if (salesmenRes.success) setSalesmen(salesmenRes.salesmen || []);
      if (partiesRes.success) setParties(partiesRes.parties || []);
    } catch (err) {
      console.error('Fetch visits error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setSalesmanId(salesmen[0]?._id || '');
    setPartyId(parties[0]?._id || '');
    setPurpose('Sales Order');
    setCollectionAmount(0);
    setOrderAmount(0);
    setNotes('');
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      await api.post('/visits', {
        salesmanId,
        partyId,
        purpose,
        collectionAmount,
        orderAmount,
        notes,
        checkIn: { timestamp: new Date() },
        checkOut: { timestamp: new Date() },
      });

      setModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.message || 'Failed to record visit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Navbar
        title="Visits"
        subtitle="Track and record salesman visits to customers"
      />

      <main className="flex-1 p-6 overflow-y-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Customer Visits</span>
            </h2>
            <p className="text-xs text-slate-500">
              Record visit details, check-in time, purpose, and collected payments.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition self-end sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Record Visit</span>
          </button>
        </div>

        {/* Visits Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="p-4">Visit ID & Date</th>
                  <th className="p-4">Customer / Party</th>
                  <th className="p-4">Field Salesman</th>
                  <th className="p-4">Purpose</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Collection</th>
                  <th className="p-4">Order Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      Loading visit records...
                    </td>
                  </tr>
                ) : visits.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      No customer visits recorded yet.
                    </td>
                  </tr>
                ) : (
                  visits.map((v) => (
                    <tr key={v._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                      <td className="p-4">
                        <span className="font-mono font-bold text-brand-600 block">{v.visitCode}</span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(v.visitDate).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="p-4">
                        <p className="font-bold text-slate-900 dark:text-slate-100">{v.party?.name || v.partyName}</p>
                        <p className="text-[10.5px] text-slate-400 truncate max-w-xs">
                          {v.party?.address || 'Market'}
                        </p>
                      </td>

                      <td className="p-4 font-semibold text-slate-700 dark:text-slate-200">
                        {v.salesman?.name || v.salesmanName}
                      </td>

                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                          {v.purpose}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                          {v.status}
                        </span>
                      </td>

                      <td className="p-4 font-bold text-purple-600">
                        {v.collectionAmount > 0 ? `₹ ${Number(v.collectionAmount).toLocaleString()}` : '-'}
                      </td>

                      <td className="p-4 font-bold text-blue-600">
                        {v.orderAmount > 0 ? `₹ ${Number(v.orderAmount).toLocaleString()}` : '-'}
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
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Record Field Customer Visit</h3>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Salesman *</label>
                  <select
                    value={salesmanId}
                    onChange={(e) => setSalesmanId(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  >
                    {salesmen.map((sm) => (
                      <option key={sm._id} value={sm._id}>
                        {sm.name} ({sm.territory})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Customer / Party *</label>
                  <select
                    value={partyId}
                    onChange={(e) => setPartyId(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  >
                    {parties.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Visit Purpose</label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                >
                  <option value="Sales Order">Sales Order</option>
                  <option value="Payment Collection">Payment Collection</option>
                  <option value="Stock Check">Stock Check</option>
                  <option value="Client Follow-up">Client Follow-up</option>
                  <option value="General Visit">General Visit</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Collection Amount (₹)</label>
                  <input
                    type="number"
                    value={collectionAmount}
                    onChange={(e) => setCollectionAmount(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">New Order Value (₹)</label>
                  <input
                    type="number"
                    value={orderAmount}
                    onChange={(e) => setOrderAmount(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Visit Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Discussed new catalogue, took payment receipt..."
                  rows="2"
                  className="w-full border border-slate-300 rounded-xl p-2.5"
                />
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
                  {submitting ? 'Recording...' : 'Save Visit Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitsManagement;

