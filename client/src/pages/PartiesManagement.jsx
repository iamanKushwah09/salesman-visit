import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';
import Navbar from '../components/Navbar';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Search,
  MapPin,
  IndianRupee,
  Phone,
  User,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Map,
  Compass,
} from 'lucide-react';

const MiniMapPicker = ({ lat, lng, onSelectLocation }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = Number(lat) || 20.5937;
    const initialLng = Number(lng) || 78.9629;
    const zoomLevel = lat && lng ? 15 : 5;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: zoomLevel,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '&copy; Google Maps',
    }).addTo(map);

    const pinIcon = L.divIcon({
      className: 'custom-pin-icon',
      html: `
        <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%); pointer-events:auto;">
          <div style="background:#2563eb; color:white; font-size:10px; font-weight:700; padding:2px 8px; border-radius:9999px; white-space:nowrap; margin-bottom:2px; box-shadow:0 3px 8px rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.5);">
            Customer Location
          </div>
          <div style="width:24px; height:24px; border-radius:50%; background:#2563eb; border:3px solid #ffffff; box-shadow:0 3px 8px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center;">
            <div style="width:6px; height:6px; border-radius:50%; background:white;"></div>
          </div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
    });

    let marker = null;
    if (lat && lng) {
      marker = L.marker([initialLat, initialLng], { icon: pinIcon, draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onSelectLocation(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
      });
    }

    map.on('click', (e) => {
      const clickLat = Number(e.latlng.lat.toFixed(6));
      const clickLng = Number(e.latlng.lng.toFixed(6));
      if (!markerRef.current) {
        markerRef.current = L.marker([clickLat, clickLng], { icon: pinIcon, draggable: true }).addTo(map);
        markerRef.current.on('dragend', () => {
          const pos = markerRef.current.getLatLng();
          onSelectLocation(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
        });
      } else {
        markerRef.current.setLatLng([clickLat, clickLng]);
      }
      onSelectLocation(clickLat, clickLng);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && lat && lng) {
      const target = [Number(lat), Number(lng)];
      mapInstanceRef.current.setView(target, 15);
      if (markerRef.current) {
        markerRef.current.setLatLng(target);
      }
    }
  }, [lat, lng]);

  return (
    <div className="relative mt-2 rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
      <div ref={mapContainerRef} style={{ height: '200px', width: '100%' }} />
      <div className="absolute bottom-2 left-2 right-2 bg-slate-900/80 backdrop-blur-xs text-[10px] text-white font-medium px-2.5 py-1.5 rounded-lg border border-white/20 shadow-xs pointer-events-none z-[1000] flex items-center justify-between">
        <span>📍 Click or drag anywhere on map to set exact shop location</span>
        {lat && lng && <span className="font-mono text-amber-300 font-bold">{lat}, {lng}</span>}
      </div>
    </div>
  );
};

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
  const [city, setCity] = useState('');
  const [territory, setTerritory] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [assignedSalesmanId, setAssignedSalesmanId] = useState('');
  const [creditLimit, setCreditLimit] = useState(50000);
  const [outstandingBalance, setOutstandingBalance] = useState(0);

  // GPS Geocoding & Map Picker States
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [geocodingSuccess, setGeocodingSuccess] = useState('');
  const [geocodingError, setGeocodingError] = useState('');
  const [showMapPicker, setShowMapPicker] = useState(false);

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
    setCity('');
    setTerritory('');
    setLatitude('');
    setLongitude('');
    setAssignedSalesmanId(salesmen.length > 0 ? salesmen[0]._id : '');
    setCreditLimit(50000);
    setOutstandingBalance(0);
    setGeocodingSuccess('');
    setGeocodingError('');
    setShowMapPicker(false);
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
    setCity(p.city || '');
    setTerritory(p.territory || '');
    setLatitude(p.latitude ? String(p.latitude) : '');
    setLongitude(p.longitude ? String(p.longitude) : '');
    setAssignedSalesmanId(p.assignedSalesman?._id || p.assignedSalesman || '');
    setCreditLimit(p.creditLimit || 50000);
    setOutstandingBalance(p.outstandingBalance || 0);
    setGeocodingSuccess('');
    setGeocodingError('');
    setShowMapPicker(false);
    setFormError('');
    setModalOpen(true);
  };

  // Auto-Detect GPS Coordinates from Address using Google Maps / Geocoding
  const handleAutoDetectGPS = async () => {
    setGeocodingError('');
    setGeocodingSuccess('');

    if (!address?.trim() && !city?.trim()) {
      setGeocodingError('Please enter Street Address or City above to detect coordinates');
      return;
    }

    try {
      setGeocodingLoading(true);
      const res = await api.get('/tracking/geocode-address', {
        params: {
          address: address.trim(),
          city: city.trim(),
        },
      });

      if (res?.success && res.latitude != null && res.longitude != null) {
        setLatitude(String(res.latitude));
        setLongitude(String(res.longitude));
        const providerLabel = res.provider === 'google' ? 'Google Maps' : 'Satellite Geocoder';
        setGeocodingSuccess(`✓ Location detected via ${providerLabel}: [${res.latitude}, ${res.longitude}]`);
        setShowMapPicker(true);
      } else {
        throw new Error(res.message || 'Could not find coordinates for this address');
      }
    } catch (err) {
      setGeocodingError(err.message || 'Failed to detect GPS coordinates. You can type them manually or use My Current Location.');
    } finally {
      setGeocodingLoading(false);
    }
  };

  // Capture Current Device GPS Location
  const handleUseCurrentLocation = () => {
    setGeocodingError('');
    setGeocodingSuccess('');

    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGeocodingError('Geolocation is not supported by your browser');
      return;
    }

    setGeocodingLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeocodingLoading(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLatitude(String(lat));
        setLongitude(String(lng));
        setGeocodingSuccess(`✓ Device GPS captured: [${lat}, ${lng}] (~${Math.round(pos.coords.accuracy)}m accuracy)`);
        setShowMapPicker(true);
      },
      (err) => {
        setGeocodingLoading(false);
        setGeocodingError(`Device GPS error: ${err.message}. Please allow location permission.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h3 className="font-bold text-sm text-slate-900">
                {editingParty ? `Edit Customer: ${editingParty.name}` : 'Register New Customer Party'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-6 overflow-y-auto space-y-3.5 text-xs flex-1">
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
                    placeholder="e.g. Mumbai"
                    className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Territory</label>
                  <input
                    type="text"
                    value={territory}
                    onChange={(e) => setTerritory(e.target.value)}
                    placeholder="e.g. North Zone"
                    className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              {/* GPS Coordinates Header & Smart Auto-Detect Toolbar */}
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-slate-700 font-bold text-xs">
                    GPS Coordinates (Map Pinpoint)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleAutoDetectGPS}
                      disabled={geocodingLoading || (!address && !city)}
                      title="Fetch GPS Coordinates using Google Maps / Address Geocoding"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition disabled:opacity-40 cursor-pointer shadow-xs active:scale-95"
                    >
                      {geocodingLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                      <span>Detect from Address</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={geocodingLoading}
                      title="Capture your device / phone current location"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer shadow-xs active:scale-95"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>My Location</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowMapPicker(!showMapPicker)}
                      title="Show / Hide interactive map to pick exact location"
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer shadow-xs active:scale-95 ${
                        showMapPicker
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                      }`}
                    >
                      <Map className="w-3.5 h-3.5" />
                      <span>{showMapPicker ? 'Hide Map' : 'Pick on Map'}</span>
                    </button>
                  </div>
                </div>

                {/* Status alerts */}
                {geocodingSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">{geocodingSuccess}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGeocodingSuccess('')}
                      className="text-emerald-700 hover:text-emerald-950 font-bold px-1"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {geocodingError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold flex items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="truncate">{geocodingError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGeocodingError('')}
                      className="text-rose-700 hover:text-rose-950 font-bold px-1"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Coordinate Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold text-[11px] mb-1">Latitude (GPS)</label>
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="e.g. 27.0276"
                      className="w-full text-xs font-mono font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold text-[11px] mb-1">Longitude (GPS)</label>
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="e.g. 78.2074"
                      className="w-full text-xs font-mono font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Interactive Leaflet Map with Google Maps Roadmap Tiles */}
                {showMapPicker && (
                  <MiniMapPicker
                    lat={latitude}
                    lng={longitude}
                    onSelectLocation={(newLat, newLng) => {
                      setLatitude(String(newLat));
                      setLongitude(String(newLng));
                      setGeocodingSuccess(`✓ Location updated on map: [${newLat}, ${newLng}]`);
                    }}
                  />
                )}
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
            </div>

            {/* Sticky Modal Action Footer */}
              <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/90 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
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
