import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import {
  CheckCircle2,
  Plus,
  Calendar,
  MapPin,
  Receipt,
  Clock,
  Search,
  X,
  Camera,
  LogIn,
  LogOut,
  Image as ImageIcon,
  Eye,
  RotateCw,
  ExternalLink,
  IndianRupee,
  AlertCircle,
  Trash2,
  ArrowRight,
} from 'lucide-react';

// Helper function to compress images before uploading
const compressImage = (file, maxWidth = 1024, quality = 0.75) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const elem = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        elem.width = width;
        elem.height = height;
        const ctx = elem.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(elem.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const VisitsManagement = () => {
  const [visits, setVisits] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Modals state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Schedule Form State
  const [salesmanId, setSalesmanId] = useState('');
  const [partyId, setPartyId] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));
  const [purpose, setPurpose] = useState('Sales Order');
  const [scheduleNotes, setScheduleNotes] = useState('');

  // Check-In Form State
  const [checkInLat, setCheckInLat] = useState(null);
  const [checkInLng, setCheckInLng] = useState(null);
  const [checkInAccuracy, setCheckInAccuracy] = useState(null);
  const [checkInAddress, setCheckInAddress] = useState('');
  const [checkInPhoto, setCheckInPhoto] = useState('');
  const [checkInNotes, setCheckInNotes] = useState('');
  const [fetchingGps, setFetchingGps] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // Check-Out Form State
  const [checkOutLat, setCheckOutLat] = useState(null);
  const [checkOutLng, setCheckOutLng] = useState(null);
  const [checkOutAccuracy, setCheckOutAccuracy] = useState(null);
  const [checkOutPhoto, setCheckOutPhoto] = useState('');
  const [orderAmount, setOrderAmount] = useState(0);
  const [collectionAmount, setCollectionAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [checkOutNotes, setCheckOutNotes] = useState('');

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch Visits, Salesmen, Parties
  const fetchData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('purpose', search);
      if (statusFilter && statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (dateFilter) queryParams.append('date', dateFilter);

      const [visitsRes, salesmenRes, partiesRes] = await Promise.all([
        api.get(`/visits?${queryParams.toString()}`),
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
  }, [statusFilter, dateFilter]);

  // GPS Location fetcher helper
  const captureCurrentLocation = (isCheckIn = true) => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setFetchingGps(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (isCheckIn) {
          setCheckInLat(latitude);
          setCheckInLng(longitude);
          setCheckInAccuracy(accuracy);
        } else {
          setCheckOutLat(latitude);
          setCheckOutLng(longitude);
          setCheckOutAccuracy(accuracy);
        }
        setFetchingGps(false);
      },
      (err) => {
        console.warn('Geolocation capture failed:', err.message);
        setGpsError('Location permission denied or unavailable. Please enable GPS.');
        setFetchingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Open Schedule Modal
  const openScheduleModal = () => {
    setSalesmanId(salesmen[0]?._id || '');
    setPartyId(parties[0]?._id || '');
    setVisitDate(new Date().toISOString().slice(0, 10));
    setPurpose('Sales Order');
    setScheduleNotes('');
    setFormError('');
    setScheduleModalOpen(true);
  };

  // Handle Schedule Submit
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (!salesmanId) throw new Error('Please select a salesman');
      if (!partyId) throw new Error('Please select a customer/party');

      await api.post('/visits', {
        salesmanId,
        partyId,
        visitDate,
        purpose,
        notes: scheduleNotes,
        status: 'Scheduled',
      });

      setScheduleModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.message || 'Failed to schedule visit');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Check-In Modal
  const openCheckInModal = (v) => {
    setSelectedVisit(v);
    setCheckInLat(null);
    setCheckInLng(null);
    setCheckInAccuracy(null);
    setCheckInAddress(v.party?.address || '');
    setCheckInPhoto('');
    setCheckInNotes('');
    setFormError('');
    setCheckInModalOpen(true);
    captureCurrentLocation(true);
  };

  // Handle Photo selection with compression
  const handlePhotoUpload = async (e, isCheckIn = true) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedBase64 = await compressImage(file, 1024, 0.75);
      if (isCheckIn) {
        setCheckInPhoto(compressedBase64);
      } else {
        setCheckOutPhoto(compressedBase64);
      }
    } catch (err) {
      alert('Failed to process image: ' + err.message);
    }
  };

  // Submit Check-In
  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVisit) return;
    setFormError('');
    setSubmitting(true);

    try {
      await api.put(`/visits/${selectedVisit._id}/check-in`, {
        latitude: checkInLat,
        longitude: checkInLng,
        accuracy: checkInAccuracy,
        address: checkInAddress,
        photoUrl: checkInPhoto,
        notes: checkInNotes,
      });

      setCheckInModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.message || 'Failed to record check-in');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Check-Out Modal
  const openCheckOutModal = (v) => {
    setSelectedVisit(v);
    setCheckOutLat(null);
    setCheckOutLng(null);
    setCheckOutAccuracy(null);
    setCheckOutPhoto('');
    setOrderAmount(0);
    setCollectionAmount(0);
    setPaymentMode('Cash');
    setReferenceNo('');
    setCheckOutNotes('');
    setFormError('');
    setCheckOutModalOpen(true);
    captureCurrentLocation(false);
  };

  // Submit Check-Out
  const handleCheckOutSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVisit) return;
    setFormError('');
    setSubmitting(true);

    try {
      await api.put(`/visits/${selectedVisit._id}/check-out`, {
        latitude: checkOutLat,
        longitude: checkOutLng,
        accuracy: checkOutAccuracy,
        photoUrl: checkOutPhoto,
        orderAmount: Number(orderAmount) || 0,
        collectionAmount: Number(collectionAmount) || 0,
        paymentMode,
        referenceNo,
        notes: checkOutNotes,
      });

      setCheckOutModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.message || 'Failed to record check-out');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Audit Details Modal
  const openDetailModal = (v) => {
    setSelectedVisit(v);
    setDetailModalOpen(true);
  };

  // Delete Visit
  const handleDeleteVisit = async (v) => {
    if (!window.confirm(`Delete scheduled visit '${v.visitCode}' for ${v.party?.name || v.partyName}?`)) {
      return;
    }
    try {
      await api.delete(`/visits/${v._id}`);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete visit');
    }
  };

  // Filtered visits by search text
  const filteredVisits = visits.filter((v) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      v.visitCode?.toLowerCase().includes(term) ||
      (v.party?.name || v.partyName)?.toLowerCase().includes(term) ||
      (v.salesman?.name || v.salesmanName)?.toLowerCase().includes(term) ||
      v.purpose?.toLowerCase().includes(term)
    );
  });

  // Status counts
  const totalCount = visits.length;
  const scheduledCount = visits.filter((v) => v.status === 'Scheduled').length;
  const checkedInCount = visits.filter((v) => v.status === 'Checked In').length;
  const completedCount = visits.filter((v) => v.status === 'Completed').length;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Navbar
        title="Field Visits & Verification"
        subtitle="Schedule visits, track live Check-In (IN) / Check-Out (OUT) with GPS and photo proof"
      />

      <main className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-brand-600" />
              <span>Customer Visits Management</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Scheduled visits require physical Check-In (IN) with GPS & photo, followed by Check-Out (OUT).
            </p>
          </div>

          <button
            onClick={openScheduleModal}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-brand-600/30 transition self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule New Visit</span>
          </button>
        </div>

        {/* Filter Bar & Status Badges */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('Scheduled')}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
                statusFilter === 'Scheduled'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Scheduled ({scheduledCount})
            </button>
            <button
              onClick={() => setStatusFilter('Checked In')}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
                statusFilter === 'Checked In'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              In Progress / Checked In ({checkedInCount})
            </button>
            <button
              onClick={() => setStatusFilter('Completed')}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
                statusFilter === 'Completed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>

          {/* Search & Date Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search party, code, purpose..."
                className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded-xl pl-8 pr-3 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-600"
              />
            </div>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="text-xs border border-slate-300 dark:border-slate-600 rounded-xl px-2.5 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                title="Clear date"
                className="text-xs text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
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
                  <th className="p-4">Status & Progress</th>
                  <th className="p-4">IN / OUT Verification</th>
                  <th className="p-4">Collection / Order</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      Loading visit records...
                    </td>
                  </tr>
                ) : filteredVisits.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      No customer visits found matching your filter.
                    </td>
                  </tr>
                ) : (
                  filteredVisits.map((v) => (
                    <tr key={v._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition">
                      {/* Visit Code & Date */}
                      <td className="p-4">
                        <span className="font-mono font-bold text-brand-600 dark:text-brand-400 block">
                          {v.visitCode}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {new Date(v.visitDate).toLocaleDateString()}
                        </span>
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {v.purpose}
                        </span>
                      </td>

                      {/* Party */}
                      <td className="p-4">
                        <p className="font-bold text-slate-900 dark:text-slate-100">
                          {v.party?.name || v.partyName}
                        </p>
                        {v.party?.shopName && (
                          <p className="text-[11px] text-brand-600 font-medium">{v.party.shopName}</p>
                        )}
                        <p className="text-[10.5px] text-slate-400 truncate max-w-xs mt-0.5">
                          {v.party?.address || v.party?.city || 'Market'}
                        </p>
                      </td>

                      {/* Salesman */}
                      <td className="p-4 font-semibold text-slate-700 dark:text-slate-200">
                        <p className="font-bold">{v.salesman?.name || v.salesmanName}</p>
                        <span className="text-[10px] font-mono text-slate-400">
                          {v.salesman?.salesmanCode} ({v.salesman?.territory || 'Field'})
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        {v.status === 'Scheduled' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-3.5 h-3.5" />
                            Scheduled
                          </span>
                        )}
                        {v.status === 'Checked In' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 animate-pulse">
                            <LogIn className="w-3.5 h-3.5" />
                            In Progress (IN)
                          </span>
                        )}
                        {v.status === 'Completed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Completed
                          </span>
                        )}
                        {v.status === 'Cancelled' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200">
                            Cancelled
                          </span>
                        )}
                      </td>

                      {/* IN / OUT Verification Status */}
                      <td className="p-4">
                        <div className="space-y-1.5">
                          {/* Check-In Status */}
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="font-bold text-slate-500">IN:</span>
                            {v.checkIn?.timestamp ? (
                              <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1 font-medium">
                                <MapPin className="w-3 h-3 text-emerald-600" />
                                {new Date(v.checkIn.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                                {v.checkIn.photoUrl && (
                                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.2 rounded font-bold">
                                    📷 Photo
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Pending Check-In</span>
                            )}
                          </div>

                          {/* Check-Out Status */}
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="font-bold text-slate-500">OUT:</span>
                            {v.checkOut?.timestamp ? (
                              <span className="text-purple-700 dark:text-purple-300 flex items-center gap-1 font-medium">
                                <MapPin className="w-3 h-3 text-purple-600" />
                                {new Date(v.checkOut.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                                {v.durationMinutes > 0 && ` (${v.durationMinutes}m)`}
                                {v.checkOut.photoUrl && (
                                  <span className="text-[10px] bg-purple-100 dark:bg-purple-950 px-1.5 py-0.2 rounded font-bold">
                                    📷 Photo
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Not checked out</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Collection & Order */}
                      <td className="p-4">
                        <div className="text-[11px] space-y-0.5">
                          {v.collectionAmount > 0 && (
                            <p className="font-bold text-purple-700 dark:text-purple-300">
                              Coll: ₹ {Number(v.collectionAmount).toLocaleString()}
                            </p>
                          )}
                          {v.orderAmount > 0 && (
                            <p className="font-bold text-blue-700 dark:text-blue-300">
                              Order: ₹ {Number(v.orderAmount).toLocaleString()}
                            </p>
                          )}
                          {!v.collectionAmount && !v.orderAmount && (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Check-In Button for Scheduled Visit */}
                          {v.status === 'Scheduled' && (
                            <button
                              onClick={() => openCheckInModal(v)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                            >
                              <LogIn className="w-3.5 h-3.5" />
                              <span>Check In (IN)</span>
                            </button>
                          )}

                          {/* Check-Out Button for Checked-In Visit */}
                          {v.status === 'Checked In' && (
                            <button
                              onClick={() => openCheckOutModal(v)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Check Out (OUT)</span>
                            </button>
                          )}

                          {/* View Audit / Proof */}
                          <button
                            onClick={() => openDetailModal(v)}
                            title="View Photos & GPS Audit Proof"
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Delete Scheduled Visit */}
                          {v.status === 'Scheduled' && (
                            <button
                              onClick={() => handleDeleteVisit(v)}
                              title="Delete Visit"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

      {/* ================= MODAL 1: Schedule Visit ================= */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Schedule New Field Visit
                </h3>
                <p className="text-[11px] text-slate-400">
                  Visit will be in 'Scheduled' status until the salesman physically checks in.
                </p>
              </div>
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Assign Salesman *
                  </label>
                  <select
                    value={salesmanId}
                    onChange={(e) => setSalesmanId(e.target.value)}
                    required
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    {salesmen.map((sm) => (
                      <option key={sm._id} value={sm._id}>
                        {sm.name} ({sm.territory})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Customer / Party *
                  </label>
                  <select
                    value={partyId}
                    onChange={(e) => setPartyId(e.target.value)}
                    required
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    {parties.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.city || p.shopName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Scheduled Visit Date *
                  </label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    required
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                  >
                  </input>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Visit Purpose *
                  </label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    <option value="Sales Order">Sales Order</option>
                    <option value="Payment Collection">Payment Collection</option>
                    <option value="Stock Check">Stock Check</option>
                    <option value="Client Follow-up">Client Follow-up</option>
                    <option value="Complaint Resolution">Complaint Resolution</option>
                    <option value="General Visit">General Visit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Visit Notes & Instructions
                </label>
                <textarea
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  placeholder="e.g. Present summer catalogue, follow up on pending balance..."
                  rows="3"
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Scheduling...' : 'Schedule Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: Check-In (IN) ================= */}
      {checkInModalOpen && selectedVisit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0 bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                  <LogIn className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    Check In (IN) at Customer
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {selectedVisit.party?.name || selectedVisit.partyName} ({selectedVisit.visitCode})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCheckInModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckInSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                  {formError}
                </div>
              )}

              {/* GPS Location Box */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>Live GPS Location *</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => captureCurrentLocation(true)}
                    disabled={fetchingGps}
                    className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${fetchingGps ? 'animate-spin' : ''}`} />
                    <span>{fetchingGps ? 'Fetching GPS...' : 'Refresh GPS'}</span>
                  </button>
                </div>

                {checkInLat && checkInLng ? (
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <p className="font-bold">
                      📍 Lat: {checkInLat.toFixed(6)}, Lng: {checkInLng.toFixed(6)}
                    </p>
                    {checkInAccuracy && (
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        GPS Accuracy: ±{Math.round(checkInAccuracy)} meters
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-[11px]">
                    {gpsError || 'Capturing live GPS coordinates... Click Refresh GPS if needed.'}
                  </div>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Location / Shop Address
                </label>
                <input
                  type="text"
                  value={checkInAddress}
                  onChange={(e) => setCheckInAddress(e.target.value)}
                  placeholder="e.g. Rajwada Market, Main Road"
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Check-In Photo Upload / Camera */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Shop Photo / Check-In Proof (Camera / Gallery) *
                </label>

                {checkInPhoto ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 bg-slate-900 group">
                    <img
                      src={checkInPhoto}
                      alt="Check-in proof"
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewImage(checkInPhoto)}
                        className="p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg text-xs"
                        title="View Full"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCheckInPhoto('')}
                        className="p-1.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded-lg text-xs"
                        title="Remove Photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-brand-500 bg-slate-50 dark:bg-slate-700/30 transition">
                    <Camera className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      Click to Take Photo or Upload Image
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      Capture shop front, salesman arrival, or store entrance
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handlePhotoUpload(e, true)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Check-In Notes */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Check-In Note (Optional)
                </label>
                <input
                  type="text"
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                  placeholder="e.g. Met owner Mr. Gupta, store open..."
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setCheckInModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Checking In...' : 'Confirm Check In (IN)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: Check-Out (OUT) ================= */}
      {checkOutModalOpen && selectedVisit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0 bg-purple-50/50 dark:bg-purple-950/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-600 text-white rounded-xl shadow-xs">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    Check Out (OUT) & Finalize Visit
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {selectedVisit.party?.name || selectedVisit.partyName} ({selectedVisit.visitCode})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCheckOutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckOutSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                  {formError}
                </div>
              )}

              {/* Check-In info reminder */}
              {selectedVisit.checkIn?.timestamp && (
                <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl text-[11px] flex items-center justify-between border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">
                    Checked In at: {new Date(selectedVisit.checkIn.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="font-bold text-brand-600">
                    Elapsed: ~
                    {Math.max(
                      1,
                      Math.round((new Date() - new Date(selectedVisit.checkIn.timestamp)) / 60000)
                    )}{' '}
                    mins
                  </span>
                </div>
              )}

              {/* GPS Location Box */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-purple-600" />
                    <span>Check-Out GPS Location *</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => captureCurrentLocation(false)}
                    disabled={fetchingGps}
                    className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${fetchingGps ? 'animate-spin' : ''}`} />
                    <span>{fetchingGps ? 'Capturing...' : 'Refresh GPS'}</span>
                  </button>
                </div>

                {checkOutLat && checkOutLng ? (
                  <div className="text-[11px] text-purple-700 dark:text-purple-300 font-mono bg-purple-50 dark:bg-purple-950/40 p-2.5 rounded-xl border border-purple-200 dark:border-purple-800">
                    <p className="font-bold">
                      📍 Lat: {checkOutLat.toFixed(6)}, Lng: {checkOutLng.toFixed(6)}
                    </p>
                    {checkOutAccuracy && (
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        GPS Accuracy: ±{Math.round(checkOutAccuracy)} meters
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-[11px]">
                    {gpsError || 'Fetching current location...'}
                  </div>
                )}
              </div>

              {/* Financials: Order & Collection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    New Order Value (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={orderAmount}
                    onChange={(e) => setOrderAmount(e.target.value)}
                    placeholder="0"
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Collected (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={collectionAmount}
                    onChange={(e) => setCollectionAmount(e.target.value)}
                    placeholder="0"
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-purple-600"
                  />
                </div>
              </div>

              {/* If collection entered, show mode and ref */}
              {Number(collectionAmount) > 0 && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-2xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-purple-900 dark:text-purple-300 mb-1">
                        Payment Mode
                      </label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        className="w-full border border-purple-300 rounded-xl px-3 py-1.5 bg-white text-xs"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI / QR">UPI / QR</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-purple-900 dark:text-purple-300 mb-1">
                        Reference / UTR / Cheque No.
                      </label>
                      <input
                        type="text"
                        value={referenceNo}
                        onChange={(e) => setReferenceNo(e.target.value)}
                        placeholder="e.g. UPI-123456"
                        className="w-full border border-purple-300 rounded-xl px-3 py-1.5 bg-white text-xs"
                      />
                    </div>
                  </div>
                  <p className="text-[10.5px] text-purple-700">
                    ℹ️ A formal Payment Receipt will be generated and deducted from customer outstanding.
                  </p>
                </div>
              )}

              {/* Check-Out Photo Upload / Camera */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Check-Out Photo / Invoice / Store Front Proof *
                </label>

                {checkOutPhoto ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-purple-500 bg-slate-900">
                    <img
                      src={checkOutPhoto}
                      alt="Check-out proof"
                      className="w-full h-44 object-cover"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewImage(checkOutPhoto)}
                        className="p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg text-xs"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCheckOutPhoto('')}
                        className="p-1.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded-lg text-xs"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-500 bg-slate-50 dark:bg-slate-700/30 transition">
                    <Camera className="w-7 h-7 text-slate-400 mb-1" />
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      Click to Take Check-Out Photo
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Signed invoice, payment receipt, or final counter photo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handlePhotoUpload(e, false)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Visit Notes */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Visit Outcome & Notes
                </label>
                <textarea
                  value={checkOutNotes}
                  onChange={(e) => setCheckOutNotes(e.target.value)}
                  placeholder="e.g. Finalized order of 25 boxes, promised payment next Monday..."
                  rows="2"
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setCheckOutModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Completing...' : 'Confirm Check Out & Complete Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: Full Audit & Photo Verification Proof ================= */}
      {detailModalOpen && selectedVisit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-brand-600 text-sm">
                    {selectedVisit.visitCode}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedVisit.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedVisit.status === 'Checked In'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedVisit.status}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5">
                  {selectedVisit.party?.name || selectedVisit.partyName}
                </h3>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Salesman & Purpose */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-400 block text-[10px]">Salesman</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedVisit.salesman?.name || selectedVisit.salesmanName}
                  </span>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {selectedVisit.salesman?.phone || 'No phone'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Visit Purpose</span>
                  <span className="font-bold text-brand-600">{selectedVisit.purpose}</span>
                  <p className="text-[10px] text-slate-500">
                    Date: {new Date(selectedVisit.visitDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Side-by-side IN and OUT Proof */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Check-In Card */}
                <div className="p-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <LogIn className="w-4 h-4 text-emerald-600" />
                      <span>Check-In (IN)</span>
                    </span>
                    {selectedVisit.checkIn?.timestamp && (
                      <span className="text-[10.5px] font-mono text-emerald-700 font-bold">
                        {new Date(selectedVisit.checkIn.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  {selectedVisit.checkIn?.timestamp ? (
                    <>
                      {/* Photo */}
                      {selectedVisit.checkIn.photoUrl ? (
                        <div
                          onClick={() => setPreviewImage(selectedVisit.checkIn.photoUrl)}
                          className="relative rounded-xl overflow-hidden h-36 bg-slate-900 cursor-pointer group"
                        >
                          <img
                            src={selectedVisit.checkIn.photoUrl}
                            alt="Check-in proof"
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <span className="text-[11px] font-bold text-white bg-slate-900/80 px-2 py-1 rounded-md">
                              Click to Enlarge
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-36 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-[11px]">
                          No Photo Uploaded
                        </div>
                      )}

                      {/* GPS */}
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                        {selectedVisit.checkIn.latitude && (
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10.5px]">
                              📍 {selectedVisit.checkIn.latitude.toFixed(5)},{' '}
                              {selectedVisit.checkIn.longitude.toFixed(5)}
                            </span>
                            <a
                              href={`https://www.google.com/maps?q=${selectedVisit.checkIn.latitude},${selectedVisit.checkIn.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-600 hover:underline flex items-center gap-0.5 text-[10px] font-bold"
                            >
                              Maps <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                        {selectedVisit.checkIn.address && (
                          <p className="text-[10.5px] text-slate-500">
                            {selectedVisit.checkIn.address}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-400 text-center py-8 italic">
                      Check-In has not occurred yet.
                    </p>
                  )}
                </div>

                {/* Check-Out Card */}
                <div className="p-4 rounded-2xl border-2 border-purple-500/40 bg-purple-50/20 dark:bg-purple-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                      <LogOut className="w-4 h-4 text-purple-600" />
                      <span>Check-Out (OUT)</span>
                    </span>
                    {selectedVisit.checkOut?.timestamp && (
                      <span className="text-[10.5px] font-mono text-purple-700 font-bold">
                        {new Date(selectedVisit.checkOut.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  {selectedVisit.checkOut?.timestamp ? (
                    <>
                      {/* Photo */}
                      {selectedVisit.checkOut.photoUrl ? (
                        <div
                          onClick={() => setPreviewImage(selectedVisit.checkOut.photoUrl)}
                          className="relative rounded-xl overflow-hidden h-36 bg-slate-900 cursor-pointer group"
                        >
                          <img
                            src={selectedVisit.checkOut.photoUrl}
                            alt="Check-out proof"
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <span className="text-[11px] font-bold text-white bg-slate-900/80 px-2 py-1 rounded-md">
                              Click to Enlarge
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-36 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-[11px]">
                          No Photo Uploaded
                        </div>
                      )}

                      {/* GPS */}
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                        {selectedVisit.checkOut.latitude && (
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10.5px]">
                              📍 {selectedVisit.checkOut.latitude.toFixed(5)},{' '}
                              {selectedVisit.checkOut.longitude.toFixed(5)}
                            </span>
                            <a
                              href={`https://www.google.com/maps?q=${selectedVisit.checkOut.latitude},${selectedVisit.checkOut.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-600 hover:underline flex items-center gap-0.5 text-[10px] font-bold"
                            >
                              Maps <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                        {selectedVisit.durationMinutes > 0 && (
                          <p className="text-[10.5px] font-bold text-purple-700">
                            ⏱️ Total Meeting Duration: {selectedVisit.durationMinutes} mins
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-400 text-center py-8 italic">
                      Check-Out pending.
                    </p>
                  )}
                </div>
              </div>

              {/* Financial & Notes Summary */}
              <div className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Order Value</span>
                    <span className="font-bold text-blue-600 text-sm">
                      ₹ {Number(selectedVisit.orderAmount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Payment Collection</span>
                    <span className="font-bold text-purple-600 text-sm">
                      ₹ {Number(selectedVisit.collectionAmount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                {selectedVisit.notes && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 block text-[10px]">Visit Log & Notes</span>
                    <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap mt-0.5">
                      {selectedVisit.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= FULL SCREEN PHOTO LIGHTBOX ================= */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="Proof Full View"
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 p-2 bg-white text-slate-900 rounded-full shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitsManagement;
