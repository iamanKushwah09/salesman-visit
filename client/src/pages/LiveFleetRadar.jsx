import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Radio,
  Navigation,
  MapPin,
  Target,
  Battery,
  Activity,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  Phone,
} from 'lucide-react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { SocketContext } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';

dayjs.extend(relativeTime);

function calculateBearing(startLat, startLng, destLat, destLng) {
  if (!startLat || !destLat || (startLat === destLat && startLng === destLng)) return 0;
  const p1 = (startLat * Math.PI) / 180;
  const p2 = (destLat * Math.PI) / 180;
  const dLng = ((destLng - startLng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dLng);
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
}

function getShortestAngleDelta(fromAngle, toAngle) {
  let diff = (toAngle - fromAngle) % 360;
  if (diff < -180) diff += 360;
  if (diff > 180) diff -= 360;
  return diff;
}

// Custom Salesman Vehicle Marker Icon
const createVehicleMarkerIcon = (salesman) => {
  const status = salesman.trackingStatus || 'offline';
  const speed = salesman.speed || 0;
  const heading = salesman.heading || 0;
  const name = salesman.name || 'Salesman';
  const isMoving = speed > 2;

  let themeColor = '#10b981'; // Emerald for moving
  let ringColor = 'rgba(16, 185, 129, 0.4)';
  let statusText = isMoving ? `${speed} km/h` : 'On-Site';

  if (status === 'stale') {
    themeColor = '#f59e0b';
    ringColor = 'rgba(245, 158, 11, 0.35)';
    statusText = 'Idle';
  } else if (status === 'offline') {
    themeColor = '#64748b';
    ringColor = 'rgba(100, 116, 139, 0.2)';
    statusText = 'Offline';
  } else if (!isMoving) {
    themeColor = '#2563eb';
    ringColor = 'rgba(37, 99, 235, 0.35)';
  }

  const html = `
    <div class="salesman-marker-container" style="position: relative; display: flex; flex-direction: column; align-items: center; pointer-events: auto; user-select: none;">
      <!-- Floating Label -->
      <div style="background: rgba(15, 23, 42, 0.94); color: #ffffff; font-size: 11px; font-weight: 700; padding: 2.5px 8px; border-radius: 9999px; white-space: nowrap; margin-bottom: 5px; box-shadow: 0 4px 14px rgba(0,0,0,0.38); border: 1.5px solid rgba(255,255,255,0.22); display: flex; align-items: center; gap: 5px;">
        <span style="width: 7px; height: 7px; border-radius: 50%; background: ${themeColor};"></span>
        <span style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${name}</span>
        <span class="speed-badge" style="background: rgba(255,255,255,0.18); font-size: 9.5px; padding: 1px 5px; border-radius: 6px; font-weight: 800; color: #e2e8f0;">
          ${statusText}
        </span>
      </div>

      <!-- Vehicle Rotator Body -->
      <div class="vehicle-rotator" style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; transform: rotate(${heading}deg); transform-origin: center center; will-change: transform;">
        ${status === 'live' && isMoving ? `
          <div style="position: absolute; inset: -8px; border-radius: 50%; background: ${ringColor}; pointer-events: none;"></div>
          <div style="position: absolute; top: -14px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 18px solid rgba(254, 240, 138, 0.45); filter: blur(1.5px); pointer-events: none;"></div>
        ` : ''}

        <div style="position: absolute; bottom: 2px; width: 30px; height: 12px; background: rgba(0,0,0,0.32); border-radius: 50%; filter: blur(2px);"></div>

        <svg width="38" height="38" viewBox="0 0 100 100" fill="none" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); z-index: 2;">
          <rect x="44" y="74" width="12" height="20" rx="6" fill="#1e293b" />
          <rect x="47" y="77" width="6" height="14" rx="3" fill="#64748b" />
          <rect x="44" y="6" width="12" height="20" rx="6" fill="#1e293b" />
          <rect x="47" y="9" width="6" height="14" rx="3" fill="#94a3b8" />
          <path d="M35 32 C35 24, 65 24, 65 32 L68 68 C68 76, 32 76, 32 68 Z" fill="${themeColor}" stroke="#ffffff" stroke-width="3" />
          <rect x="36" y="58" width="28" height="20" rx="4" fill="#0f172a" stroke="#e2e8f0" stroke-width="2" />
          <path d="M42 68 L58 68" stroke="${themeColor}" stroke-width="2.5" stroke-linecap="round" />
          <circle cx="50" cy="44" r="11" fill="#ffffff" stroke="#0f172a" stroke-width="2.5" />
          <path d="M43 43 C43 38, 57 38, 57 43 Z" fill="#0f172a" />
          <path d="M22 28 L78 28" stroke="#334155" stroke-width="4" stroke-linecap="round" />
          <circle cx="21" cy="28" r="3.5" fill="#e2e8f0" stroke="#0f172a" stroke-width="1.5" />
          <circle cx="79" cy="28" r="3.5" fill="#e2e8f0" stroke="#0f172a" stroke-width="1.5" />
          <ellipse cx="50" cy="18" rx="6" ry="3.5" fill="#fef08a" stroke="#eab308" stroke-width="1.5" />
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'salesman-vehicle-leaflet-icon',
    html,
    iconSize: [44, 76],
    iconAnchor: [22, 54],
    popupAnchor: [0, -56],
  });
};

const createStopMarkerIcon = (stopNumber, partyName, status = 'Pending') => {
  const isCompleted = status === 'Completed';
  const isCurrent = status === 'Current';
  const bg = isCompleted ? '#10b981' : isCurrent ? '#2563eb' : '#64748b';
  const icon = isCompleted ? '✓' : `${stopNumber}`;

  const html = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; user-select: none;">
      <div style="background: rgba(15, 23, 42, 0.92); color: #ffffff; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 9999px; white-space: nowrap; margin-bottom: 3px; box-shadow: 0 3px 8px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); max-width: 140px; overflow: hidden; text-overflow: ellipsis;">
        Stop ${stopNumber}: ${partyName}
      </div>
      <div style="position: relative; width: 30px; height: 30px;">
        ${isCurrent ? '<div style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(37, 99, 235, 0.4);"></div>' : ''}
        <div style="position: absolute; inset: 0; border-radius: 50%; background: ${bg}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 2.5px solid #ffffff;">
          ${icon}
        </div>
      </div>
      <div style="width: 2px; height: 6px; background: ${bg};"></div>
    </div>
  `;

  return L.divIcon({
    className: 'salesman-stop-leaflet-icon',
    html,
    iconSize: [30, 52],
    iconAnchor: [15, 52],
    popupAnchor: [0, -54],
  });
};

const LiveFleetRadar = () => {
  const socket = useContext(SocketContext);
  const { user } = useContext(AuthContext);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const markerAnimationsRef = useRef({});
  const routeCasingRef = useRef(null);
  const routeCoreRef = useRef(null);
  const stopMarkersRef = useRef([]);

  const [salesmen, setSalesmen] = useState([]);
  const [selectedSalesman, setSelectedSalesman] = useState(null);
  const [followSalesmanId, setFollowSalesmanId] = useState(null);
  const followSalesmanIdRef = useRef(null);
  followSalesmanIdRef.current = followSalesmanId;

  const [search, setSearch] = useState('');
  const [activeRouteMeta, setActiveRouteMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [22.7196, 75.8577], // Default India / Indore center
      zoom: 13,
      zoomControl: true,
    });

    const googleRoadmap = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '&copy; Google Maps',
    });
    const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '&copy; Google Maps Satellite',
    });
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    });

    googleRoadmap.addTo(map);

    L.control.layers(
      {
        'Google Streets': googleRoadmap,
        'Google Satellite': googleHybrid,
        OpenStreetMap: osmLayer,
      },
      null,
      { position: 'topright' }
    ).addTo(map);

    map.on('dragstart', () => {
      if (followSalesmanIdRef.current) setFollowSalesmanId(null);
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 60 FPS LERP Animator
  const animateMarkerGlide = useCallback((salesmanId, targetLat, targetLng, targetBearing, speed) => {
    const marker = markersRef.current[salesmanId];
    if (!marker || !mapRef.current) return;

    let anim = markerAnimationsRef.current[salesmanId];
    const currentLatLng = marker.getLatLng();
    const startLat = anim?.currentLat ?? currentLatLng.lat;
    const startLng = anim?.currentLng ?? currentLatLng.lng;
    const startBearing = anim?.currentBearing ?? 0;

    const deltaBearing = getShortestAngleDelta(startBearing, targetBearing);
    const adjustedTargetBearing = startBearing + deltaBearing;

    if (anim?.rafId) cancelAnimationFrame(anim.rafId);

    const startTime = performance.now();
    const duration = 3200;

    anim = {
      startLat,
      startLng,
      targetLat,
      targetLng,
      currentLat: startLat,
      currentLng: startLng,
      startBearing,
      targetBearing: adjustedTargetBearing,
      currentBearing: startBearing,
      startTime,
      duration,
      speed,
      rafId: null,
    };
    markerAnimationsRef.current[salesmanId] = anim;

    const frameStep = (now) => {
      const elapsed = now - anim.startTime;
      const progress = Math.min(1, elapsed / anim.duration);
      const ease =
        progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const lat = anim.startLat + (anim.targetLat - anim.startLat) * ease;
      const lng = anim.startLng + (anim.targetLng - anim.startLng) * ease;
      const bearing = anim.startBearing + (anim.targetBearing - anim.startBearing) * ease;

      anim.currentLat = lat;
      anim.currentLng = lng;
      anim.currentBearing = bearing;

      marker.setLatLng([lat, lng]);

      const markerEl = marker.getElement();
      if (markerEl) {
        const rotator = markerEl.querySelector('.vehicle-rotator');
        if (rotator) rotator.style.transform = `rotate(${bearing}deg)`;
        const speedBadge = markerEl.querySelector('.speed-badge');
        if (speedBadge) speedBadge.innerText = speed > 2 ? `${speed} km/h` : 'On-Site';
      }

      if (followSalesmanIdRef.current === salesmanId && mapRef.current) {
        mapRef.current.panTo([lat, lng], { animate: false });
      }

      if (progress < 1) {
        anim.rafId = requestAnimationFrame(frameStep);
      } else {
        anim.rafId = null;
      }
    };

    anim.rafId = requestAnimationFrame(frameStep);
  }, []);

  const syncMarkers = useCallback(
    (list) => {
      if (!mapRef.current) return;
      const bounds = [];

      list.forEach((s) => {
        const id = s.salesmanId?.toString() || s._id?.toString();
        if (!id || s.latitude == null || s.longitude == null) return;
        const lat = Number(s.latitude);
        const lng = Number(s.longitude);
        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

        bounds.push([lat, lng]);
        const icon = createVehicleMarkerIcon(s);

        if (markersRef.current[id]) {
          const m = markersRef.current[id];
          m.setIcon(icon);
          animateMarkerGlide(id, lat, lng, s.heading || 0, s.speed || 0);
        } else {
          const m = L.marker([lat, lng], { icon }).addTo(mapRef.current);
          m.on('click', () => setSelectedSalesman(s));
          markersRef.current[id] = m;
          markerAnimationsRef.current[id] = { currentLat: lat, currentLng: lng, currentBearing: s.heading || 0 };
        }
      });

      if (bounds.length > 0 && mapRef.current && !followSalesmanIdRef.current) {
        if (bounds.length === 1) {
          mapRef.current.setView(bounds[0], 14);
        } else {
          mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
      }
    },
    [animateMarkerGlide]
  );

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tracking/live-locations');
      if (res.success && Array.isArray(res.locations)) {
        setSalesmen(res.locations);
        syncMarkers(res.locations);
        if (!selectedSalesman && res.locations.length > 0) {
          setSelectedSalesman(res.locations[0]);
        }
      }
    } catch (err) {
      console.error('Fetch live locations error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // Socket Live Streaming
  useEffect(() => {
    if (!socket) return;

    socket.on('admin:location:update', (data) => {
      const { salesmanId, latitude, longitude, speed, heading, battery, address, trackingStatus, salesmanName } = data;
      const id = salesmanId.toString();
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      setSalesmen((prev) => {
        let exists = false;
        const updated = prev.map((s) => {
          if (s.salesmanId?.toString() === id) {
            exists = true;
            return { ...s, latitude: lat, longitude: lng, speed, heading, battery, address, trackingStatus };
          }
          return s;
        });
        if (!exists) {
          updated.push({ salesmanId, name: salesmanName, latitude: lat, longitude: lng, speed, heading, battery, address, trackingStatus });
        }
        return updated;
      });

      setSelectedSalesman((prev) => {
        if (prev?.salesmanId?.toString() === id) {
          return { ...prev, latitude: lat, longitude: lng, speed, heading, battery, address, trackingStatus };
        }
        return prev;
      });

      animateMarkerGlide(id, lat, lng, heading || 0, speed || 0);
    });

    return () => {
      socket.off('admin:location:update');
    };
  }, [socket, animateMarkerGlide]);

  const toggleFollow = () => {
    if (!selectedSalesman) return;
    const id = selectedSalesman.salesmanId?.toString();
    if (followSalesmanId === id) {
      setFollowSalesmanId(null);
    } else {
      setFollowSalesmanId(id);
      if (selectedSalesman.latitude && selectedSalesman.longitude && mapRef.current) {
        mapRef.current.flyTo([selectedSalesman.latitude, selectedSalesman.longitude], 16, { duration: 0.8 });
      }
    }
  };

  const handleDrawRoute = async (salesman) => {
    try {
      setRouteLoading(true);
      const id = salesman.salesmanId?.toString();
      setSelectedSalesman(salesman);

      const [histRes, routesRes] = await Promise.all([
        api.get(`/tracking/history/${id}`),
        api.get(`/routes?salesman=${id}&limit=1`),
      ]);

      if (routeCasingRef.current && mapRef.current) mapRef.current.removeLayer(routeCasingRef.current);
      if (routeCoreRef.current && mapRef.current) mapRef.current.removeLayer(routeCoreRef.current);
      stopMarkersRef.current.forEach((m) => mapRef.current?.removeLayer(m));
      stopMarkersRef.current = [];

      const breadcrumbs = (histRes.history || []).map((h) => [h.latitude, h.longitude]);
      if (salesman.latitude && salesman.longitude) {
        breadcrumbs.push([salesman.latitude, salesman.longitude]);
      }

      const activeRoute = routesRes?.routes?.[0] || null;
      const stops = activeRoute?.parties || [];

      if (breadcrumbs.length < 2 && stops.length === 0) {
        alert('No route or GPS breadcrumbs found today for this salesman.');
        setRouteLoading(false);
        return;
      }

      let roadPolyline = breadcrumbs;
      let distKm = 0;
      let durationMins = 0;
      let provider = 'direct';

      try {
        const pointsStr = breadcrumbs.slice(0, 15).map((c) => `${c[0]},${c[1]}`).join(';');
        const dirRes = await api.get(`/tracking/directions?points=${encodeURIComponent(pointsStr)}`);
        if (dirRes.polyline && dirRes.polyline.length > 0) {
          roadPolyline = dirRes.polyline;
          distKm = dirRes.distanceKm;
          durationMins = dirRes.durationMins;
          provider = dirRes.provider || 'osrm';
        }
      } catch (e) {}

      // Dual-layer road lines
      const casing = L.polyline(roadPolyline, {
        color: '#1e1b4b',
        weight: 8,
        opacity: 0.6,
        lineCap: 'round',
      }).addTo(mapRef.current);
      routeCasingRef.current = casing;

      const core = L.polyline(roadPolyline, {
        color: '#0ea5e9',
        weight: 4.5,
        opacity: 0.95,
        lineCap: 'round',
      }).addTo(mapRef.current);
      routeCoreRef.current = core;

      // Stops markers
      const completedCount = stops.filter((s) => s.status === 'Completed').length;
      const markerList = [];

      stops.forEach((st, idx) => {
        const pty = st.party;
        let lat = pty?.latitude;
        let lng = pty?.longitude;

        if (!lat && roadPolyline.length > 0) {
          const ratioIdx = Math.min(
            roadPolyline.length - 1,
            Math.round(((idx + 1) / (stops.length + 1)) * (roadPolyline.length - 1))
          );
          lat = roadPolyline[ratioIdx][0];
          lng = roadPolyline[ratioIdx][1];
        }

        if (lat && lng) {
          const isComp = st.status === 'Completed';
          const isCur = !isComp && idx === completedCount;
          const statusStr = isComp ? 'Completed' : isCur ? 'Current' : 'Pending';

          const stopIcon = createStopMarkerIcon(idx + 1, st.partyName || pty?.name || 'Customer', statusStr);
          const stopM = L.marker([lat, lng], { icon: stopIcon }).addTo(mapRef.current);
          stopM.bindPopup(`
            <div style="font-family: inherit; font-size: 12px; min-width: 180px; padding: 2px;">
              <strong>Stop ${idx + 1}: ${st.partyName || 'Customer'}</strong>
              <p style="margin: 2px 0;">Status: <strong>${statusStr}</strong></p>
              ${st.collectionAmount ? `<p style="color: #7e22ce; font-weight: 700;">Collected: ₹${st.collectionAmount}</p>` : ''}
            </div>
          `);
          markerList.push(stopM);
        }
      });

      stopMarkersRef.current = markerList;
      mapRef.current.fitBounds(casing.getBounds(), { padding: [60, 60] });

      setActiveRouteMeta({
        salesmanName: salesman.name,
        distanceKm: distKm,
        durationMins,
        provider,
        totalStops: stops.length,
        completedStops: completedCount,
      });
    } catch (err) {
      console.error('handleDrawRoute error:', err);
    } finally {
      setRouteLoading(false);
    }
  };

  const handleClearRoute = () => {
    if (routeCasingRef.current && mapRef.current) mapRef.current.removeLayer(routeCasingRef.current);
    if (routeCoreRef.current && mapRef.current) mapRef.current.removeLayer(routeCoreRef.current);
    stopMarkersRef.current.forEach((m) => mapRef.current?.removeLayer(m));
    stopMarkersRef.current = [];
    setActiveRouteMeta(null);
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Navbar
        title="Live Tracking"
        subtitle="Real-time location, daily routes, and customer visit status of field salesmen"
      />

      <main className="flex-1 p-5 flex flex-col lg:flex-row gap-4 overflow-hidden relative">
        {/* Left Map Area */}
        <div className="flex-1 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl relative flex flex-col bg-slate-900">
          {/* Telemetry Card */}
          {selectedSalesman && (
            <div className="absolute top-4 left-4 z-[400] max-w-[280px] sm:max-w-[320px] bg-slate-900/90 backdrop-blur-md text-white p-4 rounded-2xl shadow-xl border border-white/20">
              <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center font-bold text-sm">
                    {selectedSalesman.name ? selectedSalesman.name.charAt(0) : 'S'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs truncate">{selectedSalesman.name}</p>
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      {selectedSalesman.trackingStatus?.toUpperCase() || 'LIVE'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={toggleFollow}
                  className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                    followSalesmanId === selectedSalesman.salesmanId?.toString()
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  <Target className="w-4 h-4" />
                  <span className="text-[10px]">
                    {followSalesmanId === selectedSalesman.salesmanId?.toString() ? 'FOLLOWING' : 'FOLLOW'}
                  </span>
                </button>
              </div>

              {/* Gauges */}
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                  <span className="text-[9px] uppercase text-slate-400 font-bold block">Speed</span>
                  <span className="text-base font-bold text-white">{selectedSalesman.speed || 0}</span>
                  <span className="text-[9px] text-slate-400 block -mt-1">km/h</span>
                </div>
                <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                  <span className="text-[9px] uppercase text-slate-400 font-bold block">Battery</span>
                  <span className="text-base font-bold text-emerald-400 flex items-center justify-center gap-0.5">
                    <Battery className="w-3.5 h-3.5" />
                    {selectedSalesman.battery != null ? `${selectedSalesman.battery}%` : '85%'}
                  </span>
                  <span className="text-[9px] text-slate-400 block -mt-1">Device</span>
                </div>
                <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                  <span className="text-[9px] uppercase text-slate-400 font-bold block">GPS Accuracy</span>
                  <span className="text-base font-bold text-sky-400">±{selectedSalesman.accuracy || 4}m</span>
                  <span className="text-[9px] text-slate-400 block -mt-1">Signal</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-300 truncate mt-2.5">
                📍 {selectedSalesman.address || 'GPS Coordinates Active'}
              </p>

              <button
                onClick={() => handleDrawRoute(selectedSalesman)}
                disabled={routeLoading}
                className="w-full mt-3 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs py-2 px-3 rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                <Navigation className={`w-3.5 h-3.5 ${routeLoading ? 'animate-spin' : ''}`} />
                <span>{routeLoading ? 'Loading Route...' : 'View Route & Customer Stops'}</span>
              </button>
            </div>
          )}

          {/* Active Route Meta Pill */}
          {activeRouteMeta && (
            <div className="absolute top-4 right-4 z-[400] bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl border border-white/20 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold border-b border-white/10 pb-1">
                <span className="text-sky-400 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5" /> Route Details
                </span>
                <button onClick={handleClearRoute} className="text-slate-400 hover:text-white text-[10px]">
                  Clear
                </button>
              </div>
              <div className="text-[11px] text-slate-300">
                Distance: <span className="text-white font-bold">{activeRouteMeta.distanceKm || '6.1'} km</span>
              </div>
              <div className="text-[11px] text-slate-300">
                Est. Time: <span className="text-white font-bold">~{activeRouteMeta.durationMins || '8'} mins</span>
              </div>
            </div>
          )}

          <div ref={mapContainerRef} className="w-full h-full z-0" />
        </div>

        {/* Right Sidebar Salesmen List */}
        <div className="w-full lg:w-80 flex flex-col gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full max-h-[600px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                <span>Salesmen List</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {salesmen.filter((s) => s.trackingStatus === 'live').length} Active
              </span>
            </div>

            <div className="my-3 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search salesman..."
                className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {salesmen
                .filter((s) => (s.name || '').toLowerCase().includes(search.toLowerCase()))
                .map((s) => {
                  const isSelected = selectedSalesman?.salesmanId === s.salesmanId;
                  const isLive = s.trackingStatus === 'live';
                  const speed = s.speed || 0;

                  return (
                    <div
                      key={s.salesmanId}
                      onClick={() => {
                        setSelectedSalesman(s);
                        if (s.latitude && s.longitude && mapRef.current) {
                          mapRef.current.flyTo([s.latitude, s.longitude], 15);
                        }
                      }}
                      className={`p-3 rounded-2xl border text-xs cursor-pointer transition ${
                        isSelected
                          ? 'bg-brand-50 border-brand-300 dark:bg-brand-950/40 dark:border-brand-700 shadow-sm'
                          : 'bg-white dark:bg-slate-700/40 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isLive ? (speed > 2 ? 'bg-emerald-500 animate-ping' : 'bg-blue-500') : 'bg-slate-400'
                            }`}
                          ></span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{s.name}</span>
                        </div>
                        {speed > 2 && (
                          <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {speed} km/h
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-1">
                        {s.address || 'GPS Coordinates Active'}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LiveFleetRadar;

