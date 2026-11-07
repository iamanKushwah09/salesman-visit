import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { Receipt, Plus, Search, Calendar, CreditCard, DollarSign, X } from 'lucide-react';

const CollectionsManagement = () => {
  const [collections, setCollections] = useState([]);
  const [report, setReport] = useState(null);
  const [salesmen, setSalesmen] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Form
  const [salesmanId, setSalesmanId] = useState('');
  const [partyId, setPartyId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [collRes, reportRes, smRes, partiesRes] = await Promise.all([
        api.get('/collections'),
        api.get('/collections/report'),
        api.get('/salesmen'),
        api.get('/parties'),
      ]);

      if (collRes.success) setCollections(collRes.collections || []);
      if (reportRes.success) setReport(reportRes.report);
      if (smRes.success) setSalesmen(smRes.salesmen || []);
      if (partiesRes.success) setParties(partiesRes.parties || []);
    } catch (err) {
      console.error('Fetch collections error:', err);
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
    setAmount('');
    setPaymentMode('Cash');
    setReferenceNo('');
    setNotes('');
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (!amount || Number(amount) <= 0) {
        throw new Error('Please enter a valid collection amount');
      }

      await api.post('/collections', {
        salesmanId,
        partyId,
        amount: Number(amount),
        paymentMode,
        referenceNo,
        notes,
      });

      setModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.message || 'Failed to record receipt');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Navbar
        title="Collections"
        subtitle="Track payment receipts and customer ledger collections"
      />

      <main className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* KPI Breakdown Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-purple-200 dark:border-purple-800/60 shadow-sm">
            <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">Total Collected</span>
            <p className="text-2xl font-black text-purple-700 dark:text-purple-300 mt-1">
              ₹ {Number(report?.totalAmount || 0).toLocaleString()}
            </p>
            <span className="text-[10px] text-slate-400 block mt-0.5">{report?.totalReceipts || 0} Receipts Issued</span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Cash In Hand</span>
            <p className="text-xl font-black text-emerald-600 mt-1">
              ₹ {Number(report?.modeBreakdown?.['Cash'] || 0).toLocaleString()}
            </p>
            <span className="text-[10px] text-slate-400 block mt-0.5">Physical currency</span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider block">UPI / QR Digital</span>
            <p className="text-xl font-black text-sky-600 mt-1">
              ₹ {Number(report?.modeBreakdown?.['UPI / QR'] || 0).toLocaleString()}
            </p>
            <span className="text-[10px] text-slate-400 block mt-0.5">Instant online transfers</span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Cheque / Clearing</span>
            <p className="text-xl font-black text-amber-600 mt-1">
              ₹ {Number(report?.modeBreakdown?.['Cheque'] || 0).toLocaleString()}
            </p>
            <span className="text-[10px] text-slate-400 block mt-0.5">Banking clearing</span>
          </div>
        </div>

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-purple-600" />
              <span>Payment Receipts Log</span>
            </h2>
            <p className="text-xs text-slate-500">
              Complete audit trail of all payments collected by field salesmen.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition self-end sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Receipt</span>
          </button>
        </div>

        {/* Collections Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="p-4">Receipt No & Date</th>
                  <th className="p-4">Customer / Party</th>
                  <th className="p-4">Collecting Salesman</th>
                  <th className="p-4">Payment Mode</th>
                  <th className="p-4">Reference No</th>
                  <th className="p-4">Amount Collected</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">Loading collection receipts...</td>
                  </tr>
                ) : collections.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">No payment receipts logged yet.</td>
                  </tr>
                ) : (
                  collections.map((c) => (
                    <tr key={c._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                      <td className="p-4">
                        <span className="font-mono font-bold text-purple-700 block">{c.receiptNo}</span>
                        <span className="text-[11px] text-slate-400">{new Date(c.date).toLocaleDateString()}</span>
                      </td>

                      <td className="p-4 font-bold text-slate-900 dark:text-slate-100">
                        {c.party?.name || c.partyName}
                      </td>

                      <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                        {c.salesman?.name || c.salesmanName}
                      </td>

                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-md text-[10.5px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {c.paymentMode}
                        </span>
                      </td>

                      <td className="p-4 font-mono text-[11px] text-slate-500">
                        {c.referenceNo || '-'}
                      </td>

                      <td className="p-4 font-extrabold text-sm text-purple-700 dark:text-purple-300">
                        ₹ {Number(c.amount).toLocaleString()}
                      </td>

                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {c.status}
                        </span>
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
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Record Payment Collection Receipt</h3>
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
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Collecting Salesman *</label>
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
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Customer / Retailer *</label>
                <select
                  value={partyId}
                  onChange={(e) => setPartyId(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                >
                  {parties.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} (Outstanding: ₹{p.outstandingBalance || 0})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 15000"
                    required
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI / QR">UPI / QR</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reference / UTR / Cheque No</label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="e.g. UPI-983421 or CHQ-002145"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Notes / Remarks</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Advance for Diwali stock booking"
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
                  className="px-5 py-2 font-bold bg-purple-700 text-white rounded-xl shadow-md"
                >
                  {submitting ? 'Recording...' : 'Generate Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionsManagement;

