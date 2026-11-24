import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { AuthContext } from '../context/AuthContext';
import LiveGpsCameraModal from '../components/LiveGpsCameraModal';
import { stampFileWithGps } from '../utils/gpsWatermark';
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
  SwitchCamera,
  Navigation,
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
  const { user } = useContext(AuthContext);
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

  // Live GPS Camera Modal & Manual GPS states
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState('checkIn'); // 'checkIn' | 'checkOut'
  const [manualGpsOpen, setManualGpsOpen] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

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

  // GPS Location fetcher helper with layered fallbacks
  const captureCurrentLocation = (isCheckIn = true, targetVisit = selectedVisit) => {
    setFetchingGps(true);
    setGpsError('');

    const applyLocation = (lat, lng, acc, note = '') => {
      if (isCheckIn) {
        setCheckInLat(lat);
        setCheckInLng(lng);
        setCheckInAccuracy(acc);
      } else {
        setCheckOutLat(lat);
        setCheckOutLng(lng);
        setCheckOutAccuracy(acc);
      }
      setFetchingGps(false);
      setGpsError(note);
    };

    if (!navigator.geolocation) {
      const pLat = targetVisit?.party?.latitude;
      const pLng = targetVisit?.party?.longitude;
      if (pLat && pLng) {
        applyLocation(Number(pLat), Number(pLng), 25, 'Auto-filled Customer Shop GPS.');
      } else {
        setGpsError('Geolocation is not supported by your browser.');
        setFetchingGps(false);
      }
      return;
    }

    // Step 1: Attempt High Accuracy GPS
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
      },
      (err) => {
        console.warn('High-accuracy GPS failed, trying fallback:', err.message);
        // Step 2: Attempt standard accuracy with longer timeout & cached position
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            applyLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
          },
          async (fallbackErr) => {
            console.warn('Low-accuracy GPS failed:', fallbackErr.message);

            // Step 3: Fallback to customer party's saved GPS if available
            const partyLat = targetVisit?.party?.latitude;
            const partyLng = targetVisit?.party?.longitude;
            if (partyLat && partyLng) {
              applyLocation(
                Number(partyLat),
                Number(partyLng),
                30,
                '⚠️ Device GPS weak/denied. Auto-filled Customer Shop GPS.'
              );
              return;
            }

            // Step 4: Fallback to IP approximation
            try {
              const ipRes = await fetch('https://ipapi.co/json/');
              const ipData = await ipRes.json();
              if (ipData && ipData.latitude && ipData.longitude) {
                applyLocation(
                  Number(ipData.latitude),
                  Number(ipData.longitude),
                  500,
                  `⚠️ Device GPS denied. Using estimated network location (${ipData.city || 'City'}).`
                );
                if (isCheckIn && !checkInAddress && ipData.city) {
                  setCheckInAddress(`${ipData.city}, ${ipData.region}`);
                }
                return;
              }
            } catch (e) {
              // ignore
            }

            // Step 5: Inform user with actionable fallback guidance
            setFetchingGps(false);
            if (fallbackErr.code === 1) {
              setGpsError('⚠️ Location permission denied by browser. Click "Allow" in site permissions, use "Use Customer GPS", or enter coordinates manually.');
            } else {
              setGpsError('⚠️ Location unavailable. Please check GPS settings or use "Use Customer GPS" / "Enter Manually" below.');
            }
          },
          { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
        );
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    );
  };

  // 1-Click: Use Customer Shop's verified GPS
  const handleUsePartyGps = (isCheckIn = true) => {
    const lat = selectedVisit?.party?.latitude;
    const lng = selectedVisit?.party?.longitude;
    if (lat && lng) {
      if (isCheckIn) {
        setCheckInLat(Number(lat));
        setCheckInLng(Number(lng));
        setCheckInAccuracy(20);
      } else {
        setCheckOutLat(Number(lat));
        setCheckOutLng(Number(lng));
        setCheckOutAccuracy(20);
      }
      setGpsError('');
    } else {
      alert('This customer party does not have saved GPS coordinates.');
    }
  };

  // Apply Manual GPS Coordinates
  const handleApplyManualGps = (isCheckIn = true) => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng)) {
      alert('Please enter valid numeric latitude and longitude.');
      return;
    }
    if (isCheckIn) {
      setCheckInLat(lat);
      setCheckInLng(lng);
      setCheckInAccuracy(15);
    } else {
      setCheckOutLat(lat);
      setCheckOutLng(lng);
      setCheckOutAccuracy(15);
    }
    setManualGpsOpen(false);
    setGpsError('');
  };

  // Open Live Camera Viewfinder Modal
  const openCameraModal = (isCheckIn = true) => {
    setCameraTarget(isCheckIn ? 'checkIn' : 'checkOut');
    setCameraModalOpen(true);
  };

  // Receive Stamped Photo from Live Camera
  const handleCameraCapture = (stampedBase64) => {
    if (cameraTarget === 'checkIn') {
      setCheckInPhoto(stampedBase64);
    } else {
      setCheckOutPhoto(stampedBase64);
    }
  };

  // Handle Photo selection from Gallery/File with GPS Map Camera Stamp
  const handlePhotoUpload = async (e, isCheckIn = true) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const meta = {
        partyName: selectedVisit?.party?.name || selectedVisit?.partyName || 'Customer Store Visit',
        shopName: selectedVisit?.party?.shopName || '',
        address: isCheckIn ? (checkInAddress || selectedVisit?.party?.address) : (selectedVisit?.party?.address || 'Field Location'),
        city: selectedVisit?.party?.city || '',
        lat: isCheckIn ? checkInLat : checkOutLat,
        lng: isCheckIn ? checkInLng : checkOutLng,
        accuracy: isCheckIn ? checkInAccuracy : checkOutAccuracy,
        salesmanName: user?.name || 'Field Salesman',
        visitCode: selectedVisit?.visitCode || '',
      };
      const stampedBase64 = await stampFileWithGps(file, meta, 1280);
      if (isCheckIn) {
        setCheckInPhoto(stampedBase64);
      } else {
        setCheckOutPhoto(stampedBase64);
      }
    } catch (err) {
      alert('Failed to process image: ' + err.message);
    }
  };

  // Open Schedule Modal
  const openScheduleModal = () => {
    const mySid = user?.salesmanProfile?._id || (typeof user?.salesmanProfile === 'string' ? user.salesmanProfile : '');
    const activeSmId = mySid || salesmen[0]?._id || '';
    setSalesmanId(activeSmId);
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
    setManualGpsOpen(false);
    setCheckInModalOpen(true);
    captureCurrentLocation(true, v);
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
    setManualGpsOpen(false);
    setCheckOutModalOpen(true);
    captureCurrentLocation(false, v);
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
                    <option value="">
                      {parties.length === 0 ? '-- No Customers Available --' : '-- Select Customer / Party * --'}
                    </option>
                    {parties.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} {p.shopName ? `(${p.shopName})` : ''} {p.city ? `• ${p.city}` : ''}
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
              <div className="p-3.5 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 space-y-2.5">
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
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                    <div>
                      <p className="font-bold">
                        📍 Lat: {checkInLat.toFixed(6)}, Lng: {checkInLng.toFixed(6)}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-sans">
                        GPS Accuracy: ±{Math.round(checkInAccuracy || 10)}m • Verified
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setManualGpsOpen(!manualGpsOpen)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-sans font-semibold cursor-pointer"
                    >
                      {manualGpsOpen ? 'Hide Entry' : 'Manual GPS'}
                    </button>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-[11px] space-y-1">
                    <p>{gpsError || 'Capturing live GPS coordinates... Click Refresh GPS if needed.'}</p>
                  </div>
                )}

                {/* Quick Fallback GPS Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {selectedVisit?.party?.latitude && selectedVisit?.party?.longitude && (
                    <button
                      type="button"
                      onClick={() => handleUsePartyGps(true)}
                      className="px-2.5 py-1 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition cursor-pointer"
                      title="Set to customer's registered shop GPS"
                    >
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      Use Customer Shop GPS ({Number(selectedVisit.party.latitude).toFixed(4)}, {Number(selectedVisit.party.longitude).toFixed(4)})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setManualLat(checkInLat || selectedVisit?.party?.latitude || '');
                      setManualLng(checkInLng || selectedVisit?.party?.longitude || '');
                      setManualGpsOpen(!manualGpsOpen);
                    }}
                    className="px-2.5 py-1 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-lg text-[10.5px] font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    ✏️ {manualGpsOpen ? 'Hide Manual' : 'Enter Manually'}
                  </button>
                </div>

                {/* Manual Lat/Lng override fields */}
                {manualGpsOpen && (
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-600 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5 font-bold">Latitude</label>
                        <input
                          type="number"
                          step="any"
                          value={manualLat}
                          onChange={(e) => setManualLat(e.target.value)}
                          placeholder="e.g. 22.7196"
                          className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5 font-bold">Longitude</label>
                        <input
                          type="number"
                          step="any"
                          value={manualLng}
                          onChange={(e) => setManualLng(e.target.value)}
                          placeholder="e.g. 75.8577"
                          className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyManualGps(true)}
                      className="w-full py-1 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg text-xs"
                    >
                      Apply Coordinates
                    </button>
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

              {/* Check-In Photo Upload / Live Camera */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Shop Photo / Check-In Proof (GPS Map Camera) *
                  </label>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ Geo-Watermarked
                  </span>
                </div>

                {checkInPhoto ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 bg-slate-900 group shadow-lg">
                    <img
                      src={checkInPhoto}
                      alt="Check-in proof"
                      className="w-full h-52 object-cover"
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
                        onClick={() => openCameraModal(true)}
                        className="p-1.5 bg-brand-600/90 hover:bg-brand-600 text-white rounded-lg text-xs flex items-center gap-1"
                        title="Retake Live Photo"
                      >
                        <Camera className="w-4 h-4" />
                        <span className="text-[10px] font-bold">Retake</span>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Live Camera Button */}
                    <button
                      type="button"
                      onClick={() => openCameraModal(true)}
                      className="p-5 rounded-2xl border-2 border-dashed border-emerald-500/80 hover:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 text-emerald-800 dark:text-emerald-300 flex flex-col items-center justify-center text-center transition group shadow-xs cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-md group-hover:scale-105 transition-transform">
                        <Camera className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-xs">📸 Open Live Camera</span>
                      <span className="text-[10px] text-emerald-600/80 mt-0.5">
                        Real-time GPS Map Camera
                      </span>
                    </button>

                    {/* Gallery/File Picker */}
                    <label className="p-5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-brand-500 bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 flex flex-col items-center justify-center text-center cursor-pointer transition group">
                      <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-xs text-slate-700 dark:text-slate-200">
                        📁 From Gallery / File
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Auto-stamps GPS watermark
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(e, true)}
                        className="hidden"
                      />
                    </label>
                  </div>
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
              <div className="p-3.5 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 space-y-2.5">
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
                  <div className="text-[11px] text-purple-700 dark:text-purple-300 font-mono bg-purple-50 dark:bg-purple-950/40 p-2.5 rounded-xl border border-purple-200 dark:border-purple-800 flex items-center justify-between">
                    <div>
                      <p className="font-bold">
                        📍 Lat: {checkOutLat.toFixed(6)}, Lng: {checkOutLng.toFixed(6)}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-sans">
                        GPS Accuracy: ±{Math.round(checkOutAccuracy || 10)}m • Verified
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setManualGpsOpen(!manualGpsOpen)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 font-sans font-semibold cursor-pointer"
                    >
                      {manualGpsOpen ? 'Hide Entry' : 'Manual GPS'}
                    </button>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-[11px] space-y-1">
                    <p>{gpsError || 'Capturing live GPS coordinates... Click Refresh GPS if needed.'}</p>
                  </div>
                )}

                {/* Quick Fallback GPS Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {selectedVisit?.party?.latitude && selectedVisit?.party?.longitude && (
                    <button
                      type="button"
                      onClick={() => handleUsePartyGps(false)}
                      className="px-2.5 py-1 bg-purple-600/10 hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition cursor-pointer"
                      title="Set to customer's registered shop GPS"
                    >
                      <MapPin className="w-3 h-3 text-purple-600" />
                      Use Customer Shop GPS ({Number(selectedVisit.party.latitude).toFixed(4)}, {Number(selectedVisit.party.longitude).toFixed(4)})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setManualLat(checkOutLat || selectedVisit?.party?.latitude || '');
                      setManualLng(checkOutLng || selectedVisit?.party?.longitude || '');
                      setManualGpsOpen(!manualGpsOpen);
                    }}
                    className="px-2.5 py-1 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-lg text-[10.5px] font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    ✏️ {manualGpsOpen ? 'Hide Manual' : 'Enter Manually'}
                  </button>
                </div>

                {/* Manual Lat/Lng override fields */}
                {manualGpsOpen && (
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-600 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5 font-bold">Latitude</label>
                        <input
                          type="number"
                          step="any"
                          value={manualLat}
                          onChange={(e) => setManualLat(e.target.value)}
                          placeholder="e.g. 22.7196"
                          className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5 font-bold">Longitude</label>
                        <input
                          type="number"
                          step="any"
                          value={manualLng}
                          onChange={(e) => setManualLng(e.target.value)}
                          placeholder="e.g. 75.8577"
                          className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyManualGps(false)}
                      className="w-full py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs"
                    >
                      Apply Coordinates
                    </button>
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

              {/* Check-Out Photo Upload / Live Camera */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Check-Out Photo / Invoice Proof (GPS Map Camera) *
                  </label>
                  <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold">
                    ✓ Geo-Watermarked
                  </span>
                </div>

                {checkOutPhoto ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-purple-500 bg-slate-900 group shadow-lg">
                    <img
                      src={checkOutPhoto}
                      alt="Check-out proof"
                      className="w-full h-52 object-cover"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewImage(checkOutPhoto)}
                        className="p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg text-xs"
                        title="View Full"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openCameraModal(false)}
                        className="p-1.5 bg-brand-600/90 hover:bg-brand-600 text-white rounded-lg text-xs flex items-center gap-1"
                        title="Retake Live Photo"
                      >
                        <Camera className="w-4 h-4" />
                        <span className="text-[10px] font-bold">Retake</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCheckOutPhoto('')}
                        className="p-1.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded-lg text-xs"
                        title="Remove Photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Live Camera Button */}
                    <button
                      type="button"
                      onClick={() => openCameraModal(false)}
                      className="p-5 rounded-2xl border-2 border-dashed border-purple-500/80 hover:border-purple-600 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-50 text-purple-800 dark:text-purple-300 flex flex-col items-center justify-center text-center transition group shadow-xs cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center mb-2 shadow-md group-hover:scale-105 transition-transform">
                        <Camera className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-xs">📸 Open Live Camera</span>
                      <span className="text-[10px] text-purple-600/80 mt-0.5">
                        Real-time GPS Map Camera
                      </span>
                    </button>

                    {/* Gallery/File Picker */}
                    <label className="p-5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-brand-500 bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 flex flex-col items-center justify-center text-center cursor-pointer transition group">
                      <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-xs text-slate-700 dark:text-slate-200">
                        📁 From Gallery / File
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Auto-stamps GPS watermark
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(e, false)}
                        className="hidden"
                      />
                    </label>
                  </div>
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

      {/* ================= LIVE GPS MAP CAMERA MODAL ================= */}
      <LiveGpsCameraModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleCameraCapture}
        metadata={{
          partyName: selectedVisit?.party?.name || selectedVisit?.partyName || 'Customer Store Visit',
          shopName: selectedVisit?.party?.shopName || '',
          address:
            cameraTarget === 'checkIn'
              ? (checkInAddress || selectedVisit?.party?.address || 'Field Verification Location')
              : (selectedVisit?.party?.address || 'Field Verification Location'),
          city: selectedVisit?.party?.city || '',
          lat: cameraTarget === 'checkIn' ? checkInLat : checkOutLat,
          lng: cameraTarget === 'checkIn' ? checkInLng : checkOutLng,
          accuracy: cameraTarget === 'checkIn' ? checkInAccuracy : checkOutAccuracy,
          salesmanName: user?.name || 'Field Salesman',
          visitCode: selectedVisit?.visitCode || '',
        }}
      />

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
