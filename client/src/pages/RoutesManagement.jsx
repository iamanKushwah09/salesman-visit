import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { MapPinned, Plus, Calendar, CheckCircle2, User, Clock, X } from 'lucide-react';

const RoutesManagement = () => {
  const [routes, setRoutes] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form
  const [salesmanId, setSalesmanId] = useState('');
  const [routeDate, setRouteDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedParties, setSelectedParties] = useState([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

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
    setSalesmanId(salesmen[0]?._id || '');
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
    setSubmitting(true);

    try {
      if (selectedParties.length === 0) {
        throw new Error('Please select at least 1 customer stop for the route');
      }

      await api.post('/routes', {
        salesmanId,
        routeDate,
        parties: selectedParties,
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
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Navbar
        title="Routes"
        subtitle="Plan and manage daily routes and customer stops for salesmen"
      />

      <main className="flex-1 p-6 overflow-y-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <MapPinned className="w-5 h-5 text-brand-600" />
              <span>Daily Routes</span>
            </h2>
            <p className="text-xs text-slate-500">
              Each route contains an assigned salesman and sequenced customer party stops.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Route</span>
          </button>
        </div>

        {/* Route Cards */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading routes...</div>
          ) : routes.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No routes scheduled yet. Click 'Create Field Route' to plan one.
            </div>
          ) : (
            routes.map((rt) => (
              <div
                key={rt._id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-black text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg">
                      {rt.routeCode}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
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
                          ? 'bg-emerald-100 text-emerald-800'
                          : rt.status === 'In Progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {rt.status}
                    </span>
                    <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Schedule New Field Route</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assign Salesman *</label>
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
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Route Date *</label>
                  <input
                    type="date"
                    value={routeDate}
                    onChange={(e) => setRouteDate(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Customer Stops ({selectedParties.length} selected)
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2.5">
                  {parties.map((pty) => {
                    const isSelected = selectedParties.includes(pty._id);
                    return (
                      <div
                        key={pty._id}
                        onClick={() => toggleParty(pty._id)}
                        className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between ${
                          isSelected ? 'bg-brand-50 border-brand-300 text-brand-900 font-bold' : 'bg-white'
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
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Notes / Instructions</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Focus on collection from pending retailers"
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

