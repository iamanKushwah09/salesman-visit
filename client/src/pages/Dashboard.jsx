import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import {
  CheckCircle2,
  Receipt,
  Users,
  Navigation,
  MapPinned,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  Target,
  Bike,
  Calendar,
  LogIn,
  LogOut,
  Lock,
  Sparkles,
  ShoppingBag,
  Store,
  Camera,
  MapPin,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Radio,
  Activity,
  Battery,
  Phone,
  UserCheck,
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const socket = useContext(SocketContext);

  const [summary, setSummary] = useState(null);
  const [visits, setVisits] = useState([]);
  const [recentCollections, setRecentCollections] = useState([]);
  const [salesmenList, setSalesmenList] = useState([]);
  const [liveSalesmen, setLiveSalesmen] = useState([]);
  const [salesmanRosterTab, setSalesmanRosterTab] = useState('all'); // 'all', 'online', 'offline'
  const [selectedSalesmanFilter, setSelectedSalesmanFilter] = useState('');
  const [visitTab, setVisitTab] = useState('all'); // 'all', 'Scheduled', 'Checked In', 'Completed'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch Dashboard summary, visits, and collections
  const fetchDashboardData = async (salesmanId = '') => {
    try {
      const isSalesmanUser =
        !!user?.salesmanProfile &&
        !user?.isSuperAdmin &&
        user?.roleSlug !== 'super_admin' &&
        user?.roleSlug !== 'area_sales_manager';

      // Build query params
      const visitsQuery = new URLSearchParams();
      visitsQuery.append('limit', '50');
      if (!isSalesmanUser && salesmanId) {
        visitsQuery.append('salesman', salesmanId);
      }

      const collectionsQuery = new URLSearchParams();
      collectionsQuery.append('limit', '6');
      if (!isSalesmanUser && salesmanId) {
        collectionsQuery.append('salesman', salesmanId);
      }

      const promises = [
        api.get('/visits/summary/today'),
        api.get(`/visits?${visitsQuery.toString()}`),
        api.get(`/collections?${collectionsQuery.toString()}`),
      ];

      // If user is Admin, also fetch salesmen list and live tracking status
      if (!isSalesmanUser) {
        promises.push(api.get('/salesmen'));
        promises.push(api.get('/tracking/live-locations'));
      }

      const results = await Promise.all(promises);
      const sumRes = results[0];
      const visitsRes = results[1];
      const collRes = results[2];
      const salesmenRes = results[3];
      const liveLocRes = results[4];

      if (sumRes?.success) setSummary(sumRes.summary);
      if (visitsRes?.success) setVisits(visitsRes.visits || []);
      if (collRes?.success) setRecentCollections(collRes.collections || []);
      if (salesmenRes?.success) setSalesmenList(salesmenRes.salesmen || []);
      if (liveLocRes?.success && Array.isArray(liveLocRes.locations)) {
        setLiveSalesmen(liveLocRes.locations);
      }
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchDashboardData(selectedSalesmanFilter);
  }, [selectedSalesmanFilter]);

  // Real-time socket updates for Admin to see active salesmen live
  const isSalesman =
    summary?.isSalesman ??
    (!!user?.salesmanProfile &&
      !user?.isSuperAdmin &&
      user?.roleSlug !== 'super_admin' &&
      user?.roleSlug !== 'area_sales_manager');

  useEffect(() => {
    if (!socket || isSalesman) return;

    const handleSalesmanStatus = (data) => {
      const {
        salesmanId,
        salesmanName,
        salesmanCode,
        territory,
        isOnline,
        trackingStatus,
        lastSeenAt,
        battery,
        latitude,
        longitude,
        speed,
      } = data;
      const id = salesmanId?.toString();
      if (!id) return;

      setLiveSalesmen((prev) => {
        let exists = false;
        const updated = prev.map((s) => {
          if (s.salesmanId?.toString() === id) {
            exists = true;
            return {
              ...s,
              name: salesmanName || s.name,
              salesmanCode: salesmanCode || s.salesmanCode,
              territory: territory || s.territory,
              isOnline: isOnline === true && trackingStatus === 'live',
              trackingStatus: trackingStatus || (isOnline ? 'live' : 'offline'),
              lastSeenAt: lastSeenAt || s.lastSeenAt,
              battery: battery != null ? battery : s.battery,
              latitude: latitude != null ? latitude : s.latitude,
              longitude: longitude != null ? longitude : s.longitude,
              speed: speed != null ? speed : s.speed,
            };
          }
          return s;
        });

        if (!exists) {
          updated.push({
            salesmanId,
            name: salesmanName || 'Salesman',
            salesmanCode: salesmanCode || 'N/A',
            territory: territory || 'Field',
            isOnline: isOnline === true && trackingStatus === 'live',
            trackingStatus: trackingStatus || 'offline',
            lastSeenAt: lastSeenAt || new Date(),
            battery: battery != null ? battery : null,
            latitude: latitude != null ? latitude : null,
            longitude: longitude != null ? longitude : null,
            speed: speed || 0,
            visitsToday: 0,
            collectionToday: 0,
          });
        }
        return updated;
      });
    };

    const handleLocationUpdate = (data) => {
      const { salesmanId, latitude, longitude, speed, heading, battery, address, trackingStatus, salesmanName } = data;
      const id = salesmanId?.toString();
      if (!id) return;

      setLiveSalesmen((prev) =>
        prev.map((s) => {
          if (s.salesmanId?.toString() === id) {
            return {
              ...s,
              name: salesmanName || s.name,
              latitude: Number(latitude),
              longitude: Number(longitude),
              speed: Number(speed) || 0,
              heading: Number(heading) || 0,
              battery: battery != null ? Number(battery) : s.battery,
              address: address || s.address,
              trackingStatus: trackingStatus || 'live',
              isOnline: true,
              lastSeenAt: new Date(),
            };
          }
          return s;
        })
      );
    };

    socket.on('admin:salesman:status', handleSalesmanStatus);
    socket.on('admin:location:update', handleLocationUpdate);

    return () => {
      socket.off('admin:salesman:status', handleSalesmanStatus);
      socket.off('admin:location:update', handleLocationUpdate);
    };
  }, [socket, isSalesman]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData(selectedSalesmanFilter);
  };

  const salesmanInfo = summary?.salesmanProfile || user?.salesmanProfile;

  // Filter visits by Tab and Search
  const filteredVisits = visits.filter((v) => {
    if (visitTab !== 'all' && v.status !== visitTab) {
      return false;
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const partyName = (v.party?.name || v.partyName || '').toLowerCase();
      const salesmanName = (v.salesman?.name || v.salesmanName || '').toLowerCase();
      const code = (v.visitCode || '').toLowerCase();
      const purpose = (v.purpose || '').toLowerCase();
      const address = (v.party?.address || '').toLowerCase();
      return (
        partyName.includes(query) ||
        salesmanName.includes(query) ||
        code.includes(query) ||
        purpose.includes(query) ||
        address.includes(query)
      );
    }
    return true;
  });

  // Calculate visit counts for tab badges
  const scheduledCount = visits.filter((v) => v.status === 'Scheduled').length;
  const checkedInCount = visits.filter((v) => v.status === 'Checked In').length;
  const completedCount = visits.filter((v) => v.status === 'Completed').length;

  // Live Salesmen counts for Admin view
  const isSalesmanTrulyLive = (s) => Boolean(s.isOnline && s.trackingStatus === 'live');
  const onlineSalesmenCount = liveSalesmen.filter(isSalesmanTrulyLive).length;
  const offlineSalesmenCount = liveSalesmen.length - onlineSalesmenCount;

  const filteredRosterSalesmen = liveSalesmen.filter((s) => {
    if (salesmanRosterTab === 'online') return isSalesmanTrulyLive(s);
    if (salesmanRosterTab === 'offline') return !isSalesmanTrulyLive(s);
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
      <Navbar
        title={isSalesman ? 'My Field Dashboard' : 'Executive Operations Dashboard'}
        subtitle={
          isSalesman
            ? `Private daily visits and targets for ${user?.name || 'Salesman'}`
            : 'Company-wide customer visits, field salesmen tracking, and collections'
        }
      />

      <main className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
        {/* ================= HERO GREETING BANNER (LIGHT THEME) ================= */}
        {isSalesman ? (
          // SALESMAN PRIVATE HERO BANNER - 100% ISOLATED & PRIVATE
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-purple-100/60 via-indigo-50/40 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-black flex items-center justify-center text-xl shadow-md shadow-brand-500/20 shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      Welcome, {user?.name || salesmanInfo?.name || 'Salesman'}!
                    </h2>
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                      {salesmanInfo?.salesmanCode || 'N/A'}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live On Field
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-brand-600" />
                      Territory: <strong>{salesmanInfo?.territory || 'Assigned Market'}</strong>
                    </span>
                    {salesmanInfo?.vehicleType && (
                      <span className="flex items-center gap-1 text-slate-500">
                        • 🛵 <strong>{salesmanInfo.vehicleType}</strong>
                        {salesmanInfo?.vehicleNumber ? ` (${salesmanInfo.vehicleNumber})` : ''}
                      </span>
                    )}
                  </p>

                  <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50/90 px-3 py-1 rounded-full border border-emerald-200/90 inline-flex">
                    <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Private & Isolated Session • Only your assigned customer visits and collections are visible.</span>
                  </div>
                </div>
              </div>

              {/* Quick Action Shortcuts for Salesman */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  onClick={() => navigate('/visits')}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Check In (IN)</span>
                </button>
                <button
                  onClick={() => navigate('/routes')}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  <MapPinned className="w-4 h-4 text-slate-600" />
                  <span>My Route</span>
                </button>
                <button
                  onClick={() => navigate('/collections')}
                  className="flex items-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs px-4 py-2.5 rounded-xl border border-purple-200 transition cursor-pointer"
                >
                  <Receipt className="w-4 h-4 text-purple-600" />
                  <span>Log Receipt</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          // ADMIN COMPANY-WIDE HERO BANNER (LIGHT THEME)
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-100/40 via-purple-50/30 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[11px] font-extrabold tracking-wider uppercase text-emerald-700">
                    Live Operations Command
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    {user?.roleName || user?.role || 'Admin'}
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <Radio className="w-3 h-3 text-emerald-600" />
                    <span>{onlineSalesmenCount} Salesmen Active Now</span>
                  </span>
                </div>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                  Salesman Customer Visits & Fleet Operations
                </h2>
                <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                  Real-time visibility across all field salesmen, scheduled customer visits, on-site Check-In (IN) photo verifications, and daily collection receipts.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  onClick={() => navigate('/live-radar')}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Open Live Radar</span>
                </button>
                <button
                  onClick={() => navigate('/visits')}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-slate-600" />
                  <span>Schedule Visit</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= 4 KPI STATS CARDS (LIGHT THEME) ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Visits Today */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                {isSalesman ? "My Today's Visits" : 'Fleet Visits Today'}
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">
              {summary?.completedVisitsToday ?? 0}
              <span className="text-xs font-semibold text-slate-400 font-normal ml-1.5">
                / {summary?.totalVisitsToday ?? 0} Completed
              </span>
            </p>
            <div className="mt-2.5 flex items-center justify-between text-[11px]">
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                {summary?.totalVisitsToday > 0
                  ? Math.round((summary.completedVisitsToday / summary.totalVisitsToday) * 100)
                  : 100}
                % Done
              </span>
              <span className="text-slate-400 font-medium">
                {scheduledCount} Pending • {checkedInCount} IN
              </span>
            </div>
          </div>

          {/* Card 2: Today's Collections */}
          <div className="bg-white p-5 rounded-2xl border border-purple-200/90 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block truncate">
                {isSalesman ? 'My Collections Today' : 'Today Collections'}
              </span>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-purple-700 mt-2">
              ₹ {Number(summary?.totalCollectionToday ?? 0).toLocaleString()}
            </p>
            <div className="mt-2.5 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium truncate">
                {summary?.totalOrderValueToday > 0
                  ? `+ ₹ ${Number(summary.totalOrderValueToday).toLocaleString()} Orders`
                  : 'Cash & UPI receipts'}
              </span>
              <span className="font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                Verified
              </span>
            </div>
          </div>

          {/* Card 3: Target (Salesman) OR Active Fleet (Admin) */}
          {isSalesman ? (
            <div className="bg-white p-5 rounded-2xl border border-emerald-200/90 shadow-xs hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                    Monthly Target
                  </span>
                  <span className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {summary?.targetProgress ?? 0}%
                  </span>
                </div>
                <p className="text-xl font-black text-slate-900 mt-2">
                  ₹ {Number(summary?.totalMonthCollected ?? 0).toLocaleString()}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">
                    / ₹ {Number(summary?.monthlyTarget ?? salesmanInfo?.monthlyTarget ?? 0).toLocaleString()}
                  </span>
                </p>
              </div>

              {/* Target Progress Bar */}
              <div className="mt-3">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, summary?.targetProgress ?? 0)}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-2xl border border-emerald-200/90 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block truncate">
                  Active Salesmen
                </span>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <Navigation className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-2">
                {onlineSalesmenCount}
                <span className="text-xs font-semibold text-slate-400 font-normal ml-1.5">
                  / {liveSalesmen.length || summary?.totalSalesmenCount || summary?.totalActiveSalesmen || 0} Online
                </span>
              </p>
              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Real-Time Fleet Gateway Active</span>
              </div>
            </div>
          )}

          {/* Card 4: Customers / Stores */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                {isSalesman ? 'My Assigned Stores' : 'Total Customers'}
              </span>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                <Store className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">
              {summary?.totalParties ?? 0}
              <span className="text-xs font-semibold text-slate-400 font-normal ml-1.5">Stores</span>
            </p>
            <span className="text-[11px] text-slate-400 block mt-2.5 truncate">
              {isSalesman
                ? `Stores in ${salesmanInfo?.territory || 'assigned market'}`
                : 'Registered retail customer base'}
            </span>
          </div>
        </div>

        {/* ================= ADMIN ONLY: REAL-TIME FIELD SALESMEN ROSTER & LIVE ACTIVITY ================= */}
        {!isSalesman && (
          <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                      <span>Live Field Salesmen Fleet Roster</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {onlineSalesmenCount} Active Online
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Real-time presence, GPS telemetry, vehicle motion, and daily visit progress across all field staff.
                    </p>
                  </div>
                </div>
              </div>

              {/* Roster Controls: Tab Filters & Radar Shortcut */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-bold text-slate-600">
                  <button
                    onClick={() => setSalesmanRosterTab('all')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      salesmanRosterTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                    }`}
                  >
                    All ({liveSalesmen.length})
                  </button>
                  <button
                    onClick={() => setSalesmanRosterTab('online')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      salesmanRosterTab === 'online' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:text-emerald-700'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Online ({onlineSalesmenCount})
                  </button>
                  <button
                    onClick={() => setSalesmanRosterTab('offline')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      salesmanRosterTab === 'offline' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                    }`}
                  >
                    Offline ({offlineSalesmenCount})
                  </button>
                </div>

                <button
                  onClick={() => navigate('/live-radar')}
                  className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Open Radar Map</span>
                </button>
              </div>
            </div>

            {/* Salesmen Grid */}
            <div className="p-5 sm:p-6">
              {liveSalesmen.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No salesmen found. Click 'Add Salesman' in the Salesmen tab to register staff.
                </div>
              ) : filteredRosterSalesmen.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No salesmen currently matching the '{salesmanRosterTab}' filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRosterSalesmen.map((sm) => {
                    const isOnline = Boolean(sm.isOnline && sm.trackingStatus === 'live');
                    const speed = sm.speed || 0;
                    const isMoving = speed > 2;

                    return (
                      <div
                        key={sm.salesmanId}
                        className={`rounded-2xl p-4 border transition flex flex-col justify-between space-y-3 ${
                          isOnline
                            ? 'bg-emerald-50/20 border-emerald-200/80 shadow-xs hover:border-emerald-300'
                            : 'bg-white border-slate-200/90 shadow-xs hover:border-slate-300'
                        }`}
                      >
                        <div>
                          {/* Salesman Header Row */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative shrink-0">
                                <div
                                  className={`w-10 h-10 rounded-xl text-white font-black flex items-center justify-center text-sm shadow-xs ${
                                    isOnline
                                      ? 'bg-gradient-to-tr from-emerald-600 to-teal-500'
                                      : 'bg-gradient-to-tr from-slate-400 to-slate-500'
                                  }`}
                                >
                                  {sm.name ? sm.name.charAt(0).toUpperCase() : 'S'}
                                </div>
                                <span
                                  className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                    isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                                  }`}
                                />
                              </div>

                              <div className="min-w-0">
                                <h4 className="font-extrabold text-sm text-slate-900 truncate">
                                  {sm.name}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono text-[10px] font-bold text-brand-700 bg-brand-50 px-1.5 py-0.2 rounded border border-brand-200">
                                    {sm.salesmanCode || 'N/A'}
                                  </span>
                                  {sm.territory && (
                                    <span className="text-[10.5px] text-slate-400 truncate">
                                      • {sm.territory}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Live Status Pill */}
                            <div className="shrink-0">
                              {isOnline ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  {isMoving ? `${speed} km/h` : 'LIVE ON-SITE'}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                  OFFLINE
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Telemetry info */}
                          <div className="mt-3 text-[11px] text-slate-500 space-y-1">
                            <p className="flex items-center gap-1.5 truncate">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">
                                {sm.address || (sm.latitude ? `${Number(sm.latitude).toFixed(4)}, ${Number(sm.longitude).toFixed(4)}` : 'Waiting for live GPS')}
                              </span>
                            </p>
                            <div className="flex items-center justify-between text-[10.5px] text-slate-400 pt-1">
                              <span>
                                {sm.vehicleType || 'Bike'} {sm.phone ? `• ${sm.phone}` : ''}
                              </span>
                              {sm.battery != null && (
                                <span className="flex items-center gap-1 font-semibold text-emerald-700">
                                  <Battery className="w-3 h-3 text-emerald-600" />
                                  {sm.battery}% Battery
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Performance metrics & Action Buttons */}
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">
                              Visits: <strong className="text-slate-800">{sm.visitsToday ?? 0} Done</strong>
                            </span>
                            <span className="text-purple-700 font-bold">
                              ₹ {Number(sm.collectionToday || 0).toLocaleString()} Collected
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              onClick={() => navigate('/live-radar')}
                              className="w-full flex items-center justify-center gap-1 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold py-1.5 rounded-xl border border-brand-200 transition cursor-pointer"
                            >
                              <Navigation className="w-3 h-3" />
                              <span>Live Radar</span>
                            </button>
                            <button
                              onClick={() => setSelectedSalesmanFilter(sm.salesmanId)}
                              className="w-full flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-1.5 rounded-xl border border-slate-200 transition cursor-pointer"
                            >
                              <Filter className="w-3 h-3" />
                              <span>Filter Visits</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ================= MAIN FOCUS: TODAY'S CUSTOMER VISITS EXECUTION BOARD ================= */}
        <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Header of the Visit Board */}
          <div className="p-5 sm:p-6 border-b border-slate-100">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-brand-50 text-brand-600 border border-brand-100">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                      <span>{isSalesman ? "My Customer Visits Today" : "Customer Visits Execution Board"}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                        {visits.length} Total
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isSalesman
                        ? "Your scheduled visits. Click 'Check In (IN)' when arriving at the customer store."
                        : "Company-wide visit execution pipeline: Check-In (IN) with GPS/photo, followed by Check-Out (OUT)."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right side controls: Search, Salesman Filter (Admin), and Actions */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Bar */}
                <div className="relative min-w-[200px] sm:min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search shop, code, or area..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-medium text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Salesman Filter Dropdown (ADMIN ONLY) */}
                {!isSalesman && (
                  <select
                    value={selectedSalesmanFilter}
                    onChange={(e) => setSelectedSalesmanFilter(e.target.value)}
                    className="bg-slate-50 text-xs font-semibold text-slate-700 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition cursor-pointer"
                  >
                    <option value="">All Salesmen Fleet</option>
                    {salesmenList.map((sm) => (
                      <option key={sm._id} value={sm._id}>
                        {sm.name} ({sm.salesmanCode})
                      </option>
                    ))}
                  </select>
                )}

                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  title="Refresh Visits"
                  className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-600' : ''}`} />
                </button>

                {/* Go to Visits Management Page */}
                <button
                  onClick={() => navigate('/visits')}
                  className="flex items-center gap-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs px-3.5 py-2 rounded-xl border border-brand-200 transition cursor-pointer"
                >
                  <span>Full Visits Page</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Visit Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={() => setVisitTab('all')}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  visitTab === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                }`}
              >
                <span>All Visits</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${visitTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {visits.length}
                </span>
              </button>

              <button
                onClick={() => setVisitTab('Scheduled')}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  visitTab === 'Scheduled'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pending IN</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${visitTab === 'Scheduled' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'}`}>
                  {scheduledCount}
                </span>
              </button>

              <button
                onClick={() => setVisitTab('Checked In')}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  visitTab === 'Checked In'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200/80'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                <span>At Customer Shop (IN)</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${visitTab === 'Checked In' ? 'bg-white/20 text-white' : 'bg-sky-200 text-sky-900'}`}>
                  {checkedInCount}
                </span>
              </button>

              <button
                onClick={() => setVisitTab('Completed')}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  visitTab === 'Completed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Completed</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${visitTab === 'Completed' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900'}`}>
                  {completedCount}
                </span>
              </button>
            </div>
          </div>

          {/* Visits Cards Grid */}
          <div className="p-5 sm:p-6">
            {loading ? (
              <div className="py-16 text-center text-xs text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
                <span>Loading customer visits queue...</span>
              </div>
            ) : filteredVisits.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">No visits found</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {searchQuery
                      ? 'No visits matched your search query. Try clearing the filter.'
                      : visitTab !== 'all'
                      ? `No customer visits currently in '${visitTab}' status.`
                      : 'No customer visits scheduled for today yet.'}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/visits')}
                  className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Schedule New Visit</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVisits.map((v) => {
                  const partyName = v.party?.name || v.partyName || 'Customer Store';
                  const shopName = v.party?.shopName;
                  const salesmanName = v.salesman?.name || v.salesmanName || 'Salesman';
                  const salesmanCode = v.salesman?.salesmanCode;
                  const isCheckedIn = v.status === 'Checked In';
                  const isCompleted = v.status === 'Completed';
                  const isScheduled = v.status === 'Scheduled';

                  return (
                    <div
                      key={v._id}
                      className="bg-white rounded-2xl border border-slate-200/90 hover:border-brand-300 shadow-xs hover:shadow-md transition p-4 flex flex-col justify-between space-y-3 group"
                    >
                      {/* Top Row: Store Name & Status Badge */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="text-sm font-extrabold text-slate-900 truncate group-hover:text-brand-600 transition">
                              {partyName}
                            </h4>
                            {shopName && (
                              <p className="text-[11px] font-semibold text-slate-500 truncate">
                                {shopName}
                              </p>
                            )}
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0">
                            {isCompleted ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Completed
                              </span>
                            ) : isCheckedIn ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                                Checked IN
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Pending IN
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Store Address & Contact */}
                        <div className="mt-2 text-[11px] text-slate-500 space-y-1">
                          {v.party?.address && (
                            <p className="flex items-center gap-1.5 truncate">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{v.party.address}</span>
                            </p>
                          )}
                          <p className="flex items-center gap-1.5">
                            <ShoppingBag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-700">{v.purpose || 'Sales Order'}</span>
                            <span className="font-mono text-[10px] text-slate-400">• {v.visitCode}</span>
                          </p>
                        </div>

                        {/* Admin View: Show assigned salesman name */}
                        {!isSalesman && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 font-medium">Assigned Salesman:</span>
                            <span className="font-bold text-slate-700 flex items-center gap-1">
                              <span>{salesmanName}</span>
                              {salesmanCode && (
                                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                  {salesmanCode}
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Middle Row: Financials and Verification Details */}
                      <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500 font-medium">Order Value:</span>
                          <span className="font-extrabold text-slate-900">
                            ₹ {Number(v.orderAmount || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500 font-medium">Collection:</span>
                          <span className="font-extrabold text-purple-700">
                            ₹ {Number(v.collectionAmount || 0).toLocaleString()}
                          </span>
                        </div>

                        {/* Proof & Timestamps */}
                        <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between text-[10.5px] text-slate-400">
                          <span>
                            {isCompleted && v.checkOut?.timestamp
                              ? `Out: ${new Date(v.checkOut.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              : isCheckedIn && v.checkIn?.timestamp
                              ? `In: ${new Date(v.checkIn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              : `Date: ${new Date(v.visitDate).toLocaleDateString()}`}
                          </span>
                          {(v.checkIn?.photoProof || v.checkOut?.photoProof) && (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <Camera className="w-3 h-3" />
                              Photo Verified
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Action Button */}
                      <div>
                        {isScheduled ? (
                          <button
                            onClick={() => navigate('/visits')}
                            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                          >
                            <LogIn className="w-4 h-4" />
                            <span>Check In (IN)</span>
                          </button>
                        ) : isCheckedIn ? (
                          <button
                            onClick={() => navigate('/visits')}
                            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Check Out (OUT)</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate('/visits')}
                            className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 rounded-xl border border-slate-200 transition cursor-pointer"
                          >
                            <span>View Visit Audit</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ================= SECONDARY DUAL SECTION ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Payment Receipts */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    {isSalesman ? 'My Payment Receipts' : 'Recent Payment Receipts'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {isSalesman ? 'Collections logged under your account' : 'Collections across all field salesmen'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate('/collections')}
                className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {recentCollections.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No payment collections recorded today yet.
                </div>
              ) : (
                recentCollections.map((c) => (
                  <div
                    key={c._id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-purple-50/40 border border-purple-100/90 text-xs hover:bg-purple-50 transition"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-bold text-slate-900 truncate">
                        {c.party?.name || 'Customer Store'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10.5px] text-purple-700 font-bold">
                          {c.receiptNo}
                        </span>
                        <span className="text-slate-500 text-[10.5px]">
                          • {c.paymentMode} {c.referenceNo ? `(${c.referenceNo})` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold text-purple-700">
                        ₹ {Number(c.amount).toLocaleString()}
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {new Date(c.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Field Compliance & Live Tracking Status */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    Field Visit Compliance & Protocol
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Audit standards and verification benchmarks
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate('/live-radar')}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Live Radar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Physical Check-In (IN) Required</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Visits begin in 'Scheduled' status. When arriving at a customer shop, salesman must Check-In with live GPS location & photo proof.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0 mt-0.5">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Check-Out (OUT) & Receipts Auto-Sync</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Upon checking out, sales orders and collected payment receipts automatically update store ledger and monthly targets.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700 shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Strict Data Privacy & Isolation</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Salesmen can only view their own assigned stops, routes, and targets. Company-wide aggregation is restricted to Admins.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
