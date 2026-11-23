import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { MapPinned, Plus, Calendar, User, CheckCircle2, Clock, Trash2, X } from 'lucide-react';

const RoutesManagement = () => {
  const [routes, setRoutes] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [salesmanId, setSalesmanId] = useState('');
  const [routeDate, setRouteDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedParties, setSelectedParties] = useState([]);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [routesRes, salesmenRes, partiesRes] = await Promise.all([
        api.get('/routes'),
        api.get('/salesmen'),
        api.get('/parties'),
      ]);

      if (routesRes.success) setRoutes(routesRes.routes || []);
      if (salesmenRes.success) setSalesmen(salesmenRes.salesmen || []);
      if (partiesRes.success) setParties(partiesRes.parties || []);
    } catch (err) {
      console.error('Fetch routes error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setSalesmanId(salesmen.length > 0 ? salesmen[0]._id : '');
    setRouteDate(new Date().toISOString().slice(0, 10));
    setSelectedParties([]);
    setNotes('');
    setFormError('');
    setModalOpen(true);
  };

  const toggleParty = (partyId) => {
    if (selectedParties.includes(partyId)) {
      setSelectedParties(selectedParties.filter((id) => id !== partyId));
    } else {
      setSelectedParties([...selectedParties, partyId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!salesmanId) return setFormError('Select a salesman for this route');
    if (selectedParties.length === 0) return setFormError('Select at least one customer stop');

    try {
      setSubmitting(true);
      const partiesPayload = selectedParties.map((pId, idx) => ({
        party: pId,
        sequence: idx + 1,
      }));

      await api.post('/routes', {
        salesmanId,
        routeDate,
        parties: partiesPayload,
        notes,
      });

      setModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.message || 'Failed to create route');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
      <Navbar
        title="Routes & Route Planning"
        subtitle="Organize sequenced customer visits and daily field routes"
      />

      <main className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <MapPinned className="w-5 h-5 text-brand-600" />
              <span>Daily Beat Routes</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Salesmen follow sequenced customer stops to ensure complete market coverage.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer self-end sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Field Route</span>
          </button>
        </div>

        {/* Route Cards */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Loading routes...
            </div>
          ) : routes.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200/90 p-8">
              No routes scheduled yet. Click 'Create Field Route' to plan one.
            </div>
          ) : (
            routes.map((rt) => (
              <div
                key={rt._id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4 hover:shadow-md transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-black text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-lg">
                      {rt.routeCode}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{rt.salesman?.name || rt.salesmanName}</span>
                      </h3>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(rt.routeDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                        rt.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : rt.status === 'In Progress'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {rt.status}
                    </span>
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-full">
                      Collected: ₹ {Number(rt.totalCollection || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Sequenced Stops Badges */}
                <div className="space-y-1.5">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
                    Customer Stop Sequence ({rt.parties?.length || 0} stops):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(rt.parties || []).map((p, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                          p.status === 'Completed'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                            p.status === 'Completed' ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                          }`}
                        >
                          {p.status === 'Completed' ? '✓' : idx + 1}
                        </span>
                        <span>{p.party?.name || p.partyName}</span>
                        {p.collectionAmount > 0 && (
                          <span className="font-bold text-purple-700 ml-1">₹{p.collectionAmount}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Plan & Schedule Field Route</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
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
                  <label className="block font-bold text-slate-700 mb-1">Assign Salesman *</label>
                  <select
                    value={salesmanId}
                    onChange={(e) => setSalesmanId(e.target.value)}
                    required
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  >
                    {salesmen.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.salesmanCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Route Date *</label>
                  <input
                    type="date"
                    value={routeDate}
                    onChange={(e) => setRouteDate(e.target.value)}
                    required
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Select Customer Stops ({selectedParties.length} selected)
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2.5 bg-slate-50/50">
                  {parties.map((pty) => {
                    const isSelected = selectedParties.includes(pty._id);
                    return (
                      <div
                        key={pty._id}
                        onClick={() => toggleParty(pty._id)}
                        className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition ${
                          isSelected ? 'bg-brand-50 border-brand-300 text-brand-900 font-bold' : 'bg-white border-slate-200'
                        }`}
                      >
                        <div>
                          <span>{pty.name}</span>
                          <span className="text-[10px] text-slate-400 block">{pty.address}</span>
                        </div>
                        <input type="checkbox" checked={isSelected} readOnly className="rounded text-brand-600" />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Instructions</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Focus on collection from pending retailers"
                  rows="2"
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Scheduling...' : 'Save & Schedule Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutesManagement;
