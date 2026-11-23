import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { SocketContext } from '../context/SocketContext';
import {
  UserCheck,
  Plus,
  Edit2,
  Trash2,
  Search,
  MapPin,
  Target,
  Bike,
  X,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Radio,
  Battery,
  Navigation,
} from 'lucide-react';

const SalesmanManagement = () => {
  const socket = useContext(SocketContext);
  const [salesmen, setSalesmen] = useState([]);
  const [liveLocationMap, setLiveLocationMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSalesman, setEditingSalesman] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [territory, setTerritory] = useState('Indore Central');
  const [vehicleType, setVehicleType] = useState('Bike / Scooter');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [monthlyTarget, setMonthlyTarget] = useState(150000);
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSalesmen = async () => {
    try {
      setLoading(true);
      const [res, locRes] = await Promise.all([
        api.get(`/salesmen?search=${encodeURIComponent(search)}`),
        api.get('/tracking/live-locations'),
      ]);

      if (res.success) setSalesmen(res.salesmen || []);

      if (locRes.success && Array.isArray(locRes.locations)) {
        const map = {};
        locRes.locations.forEach((l) => {
          map[l.salesmanId?.toString()] = l;
        });
        setLiveLocationMap(map);
      }
    } catch (err) {
      console.error('Fetch salesmen error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesmen();
  }, [search]);

  // Real-time presence updates via Socket
  useEffect(() => {
    if (!socket) return;

    const handleStatus = (data) => {
      const id = data.salesmanId?.toString();
      if (!id) return;
      setLiveLocationMap((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] || {}),
          ...data,
          isOnline: data.isOnline ?? (data.trackingStatus === 'live'),
        },
      }));
    };

    socket.on('admin:salesman:status', handleStatus);
    socket.on('admin:location:update', handleStatus);

    return () => {
      socket.off('admin:salesman:status', handleStatus);
      socket.off('admin:location:update', handleStatus);
    };
  }, [socket]);

  const openCreateModal = () => {
    setEditingSalesman(null);
    setName('');
    setPhone('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setTerritory('Indore Central');
    setVehicleType('Bike / Scooter');
    setVehicleNumber('');
    setMonthlyTarget(150000);
    setIsActive(true);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (sm) => {
    setEditingSalesman(sm);
    setName(sm.name || '');
    setPhone(sm.phone || '');
    setEmail(sm.email || sm.user?.email || '');
    setPassword('');
    setShowPassword(false);
    setTerritory(sm.territory || 'Indore Central');
    setVehicleType(sm.vehicleType || 'Bike / Scooter');
    setVehicleNumber(sm.vehicleNumber || '');
    setMonthlyTarget(sm.monthlyTarget || 150000);
    setIsActive(sm.isActive !== false);
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) return setFormError('Salesman name is required');
    if (!phone.trim()) return setFormError('Phone number is required');
    if (!email.trim()) return setFormError('Login email is required');

    if (!editingSalesman && (!password || password.length < 6)) {
      return setFormError('Password must be at least 6 characters for the new login account');
    }

    try {
      setSubmitting(true);

      if (editingSalesman) {
        await api.put(`/salesmen/${editingSalesman._id}`, {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim() || undefined,
          territory: territory.trim(),
          vehicleType,
          vehicleNumber: vehicleNumber.trim(),
          monthlyTarget: Number(monthlyTarget) || 0,
          isActive,
        });
      } else {
        await api.post('/salesmen', {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          territory: territory.trim(),
          vehicleType,
          vehicleNumber: vehicleNumber.trim(),
          monthlyTarget: Number(monthlyTarget) || 0,
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
    if (
      !window.confirm(
        `Delete salesman '${sm.name}' (${sm.salesmanCode})?\n\nThis will permanently remove both their field profile and their app login credentials.`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/salesmen/${sm._id}`);
      fetchSalesmen();
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
      <Navbar
        title="Salesmen Fleet & Accounts"
        subtitle="Manage field salesmen, territory assignments, and login credentials"
      />

      <main className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, code, phone, territory..."
              className="w-full text-xs border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 bg-slate-50 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
            />
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer self-end sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Salesman & Login</span>
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
              No salesmen registered yet. Click 'Add Salesman & Login' to create one.
            </div>
          ) : (
            salesmen.map((sm) => {
              const liveData = liveLocationMap[sm._id?.toString()];
              const isOnline = liveData?.trackingStatus === 'live' || liveData?.isOnline;
              const speed = liveData?.speed || 0;

              return (
                <div
                  key={sm._id}
                  className={`rounded-2xl border p-5 shadow-xs space-y-4 hover:shadow-md transition ${
                    isOnline
                      ? 'bg-emerald-50/20 border-emerald-200/90'
                      : 'bg-white border-slate-200/90'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div
                          className={`w-11 h-11 rounded-2xl text-white font-black flex items-center justify-center text-sm shadow-md ${
                            isOnline
                              ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/20'
                              : 'bg-gradient-to-tr from-brand-600 to-indigo-600 shadow-brand-500/20'
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

                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm text-slate-900">{sm.name}</h3>
                          {isOnline && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-mono font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.2 rounded-md">
                            {sm.salesmanCode}
                          </span>
                          {isOnline ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                              {speed > 2 ? `${speed} km/h` : 'LIVE ONLINE'}
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-400">
                              Offline
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(sm)}
                        title="Edit Profile & Login"
                        className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sm)}
                        title="Delete Salesman & Account"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-medium">{sm.territory || 'Unassigned Territory'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bike className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {sm.vehicleType} {sm.vehicleNumber ? `(${sm.vehicleNumber})` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Target: ₹ {Number(sm.monthlyTarget || 0).toLocaleString()}</span>
                      </span>
                      {liveData?.battery != null && (
                        <span className="text-[10.5px] font-bold text-emerald-700 flex items-center gap-1">
                          <Battery className="w-3 h-3 text-emerald-600" />
                          {liveData.battery}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Login Credentials & Phone Section */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-mono font-medium">{sm.phone}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sm.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {sm.isActive ? 'ACTIVE FLEET' : 'INACTIVE'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/60">
                      <span className="text-slate-600 flex items-center gap-1.5 font-medium truncate">
                        <KeyRound className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                        <span className="truncate">{sm.email || sm.user?.email || 'No email set'}</span>
                      </span>
                      {sm.user ? (
                        <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          Login Active
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          No Login
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Modal for 1-Step Salesman & Login Creation/Editing */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingSalesman ? `Edit Salesman: ${editingSalesman.name}` : 'Register New Field Salesman'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {editingSalesman
                    ? 'Update profile details or reset login password'
                    : '1-Step setup: Profile and login credentials created together'}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                  {formError}
                </div>
              )}

              {/* Informational Banner */}
              {!editingSalesman && (
                <div className="p-3 bg-brand-50 border border-brand-200 rounded-2xl flex items-start gap-2.5 text-slate-700">
                  <ShieldCheck className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
                  <div className="text-[11px] leading-relaxed">
                    <p className="font-bold text-brand-800">
                      Unified 1-Step Account Creation
                    </p>
                    <p className="text-slate-600">
                      Salesman profile aur login account ek sath banega. Naye salesman ko alag se Users tab mein add karne ki zaroorat nahi hai.
                    </p>
                  </div>
                </div>
              )}

              {/* Personal Details */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Profile Details
                </h4>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    required
                    className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
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
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Assigned Territory *</label>
                    <input
                      type="text"
                      value={territory}
                      onChange={(e) => setTerritory(e.target.value)}
                      placeholder="e.g. Vijay Nagar, Indore"
                      required
                      className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Vehicle Type</label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    >
                      <option value="Bike / Scooter">Bike / Scooter</option>
                      <option value="Car / Van">Car / Van</option>
                      <option value="Commercial Auto / Mini Truck">Commercial Auto / Mini Truck</option>
                      <option value="On Foot / Public Transit">On Foot / Public Transit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Vehicle Reg Number</label>
                    <input
                      type="text"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      placeholder="MP-09-AB-1234"
                      className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Monthly Collection Target (₹)</label>
                  <input
                    type="number"
                    value={monthlyTarget}
                    onChange={(e) => setMonthlyTarget(e.target.value)}
                    placeholder="150000"
                    min="0"
                    className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Login Credentials Section */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-brand-600" />
                    <span>App Login Credentials</span>
                  </h4>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Field Salesman Role
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Login Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="salesman@company.com"
                    required
                    className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <p className="text-[10.5px] text-slate-400 mt-1">
                    Salesman will use this email to sign into the mobile & web app.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {editingSalesman ? 'Change Password (leave blank to keep current)' : 'Login Password *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingSalesman ? '•••••••• (unchanged)' : 'Minimum 6 characters'}
                      required={!editingSalesman}
                      minLength={6}
                      className="w-full text-xs border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {editingSalesman && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="smActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                  />
                  <label htmlFor="smActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Salesman Active on Field (Fleet Tracking Allowed)
                  </label>
                </div>
              )}

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
