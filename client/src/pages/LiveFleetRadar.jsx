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
  AlertCircle,
  X,
  Compass,
  ChevronDown,
  ChevronUp,
  Maximize2,
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
  const x = Math.cos(p1) * Math.sin(p2) - Math.cos(p1) * Math.cos(dLng);
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
}

function getShortestAngleDelta(fromAngle, toAngle) {
  let diff = (toAngle - fromAngle) % 360;
  if (diff < -180) diff += 360;
  if (diff > 180) diff -= 360;
  return diff;
}

// Custom Ola/Uber Style Vehicle Marker Icon (100% Real-Data Driven)
const createVehicleMarkerIcon = (salesman) => {
  const isTrulyLive = Boolean(salesman.isOnline && salesman.trackingStatus === 'live');
  const speed = isTrulyLive ? Math.max(0, Number(salesman.speed) || 0) : 0;
  const heading = salesman.heading || 0;
  const name = salesman.name || 'Salesman';
  const isMoving = isTrulyLive && speed > 2;

  let themeColor = '#10b981'; // Emerald for moving
  let ringColor = 'rgba(16, 185, 129, 0.45)';
  let statusText = isMoving ? `${speed} km/h` : 'On-Site';

  if (!isTrulyLive) {
    themeColor = '#64748b';
    ringColor = 'rgba(100, 116, 139, 0.2)';
    statusText = 'Offline';
  } else if (!isMoving) {
    themeColor = '#2563eb';
    ringColor = 'rgba(37, 99, 235, 0.35)';
    statusText = 'Stationary';
  }

  const html = `
    <div class="salesman-marker-container" style="position: relative; display: flex; flex-direction: column; align-items: center; pointer-events: auto; user-select: none;">
      <!-- Floating Ola/Uber Status Pill -->
      <div style="background: rgba(15, 23, 42, 0.94); color: #ffffff; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 9999px; white-space: nowrap; margin-bottom: 6px; box-shadow: 0 4px 14px rgba(0,0,0,0.45); border: 1.5px solid rgba(255,255,255,0.25); display: flex; align-items: center; gap: 5.5px;">
        <span style="width: 7.5px; height: 7.5px; border-radius: 50%; background: ${themeColor}; ${isMoving ? 'box-shadow: 0 0 8px ' + themeColor + ';' : ''}"></span>
        <span style="max-width: 125px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${name}</span>
        <span class="speed-badge" style="background: ${isMoving ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255,255,255,0.18)'}; font-size: 9.5px; padding: 1.5px 6px; border-radius: 6px; font-weight: 800; color: ${isMoving ? '#a7f3d0' : '#e2e8f0'};">
          ${statusText}
        </span>
      </div>

      <!-- Vehicle Rotator Body (Smooth 3D Ola/Uber Car) -->
      <div class="vehicle-rotator" style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; transform: rotate(${heading}deg); transform-origin: center center; will-change: transform;">
        
        <!-- Forward Headlight Beams (Only shown when vehicle is actually moving in real life) -->
        ${isMoving ? `
          <div style="position: absolute; top: -22px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 14px solid transparent; border-right: 14px solid transparent; border-top: 26px solid rgba(254, 240, 138, 0.45); filter: blur(2px); pointer-events: none;"></div>
          <!-- Animated Radar Pulse Ring -->
          <div style="position: absolute; inset: -10px; border-radius: 50%; background: ${ringColor}; pointer-events: none; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>
        ` : ''}

        <!-- Drop Shadow under car -->
        <div style="position: absolute; bottom: 1px; width: 34px; height: 14px; background: rgba(0,0,0,0.38); border-radius: 50%; filter: blur(2.5px);"></div>

        <!-- 3D Sleek Top-Down Car SVG (Uber / Ola Model) -->
        <svg width="42" height="42" viewBox="0 0 100 100" fill="none" style="filter: drop-shadow(0 4px 7px rgba(0,0,0,0.45)); z-index: 2;">
          <!-- Front & Rear Wheels -->
          <rect x="18" y="24" width="7" height="15" rx="3.5" fill="#0f172a" />
          <rect x="75" y="24" width="7" height="15" rx="3.5" fill="#0f172a" />
          <rect x="18" y="65" width="7" height="15" rx="3.5" fill="#0f172a" />
          <rect x="75" y="65" width="7" height="15" rx="3.5" fill="#0f172a" />

          <!-- Main Streamlined Car Chassis -->
          <path d="M26 30 C26 16, 74 16, 74 30 L76 74 C76 86, 24 86, 24 74 Z" fill="${themeColor}" stroke="#ffffff" stroke-width="2.5" />

          <!-- Front Windshield (Curved Dark Glass) -->
          <path d="M30 36 C30 29, 70 29, 70 36 L66 47 C66 49, 34 49, 34 47 Z" fill="#0f172a" stroke="#cbd5e1" stroke-width="1.2" />

          <!-- Roof Section -->
          <rect x="33" y="47" width="34" height="20" rx="3" fill="#1e293b" />

          <!-- Rear Windshield -->
          <path d="M34 69 L66 69 L68 76 C68 78, 32 78, 32 76 Z" fill="#0f172a" stroke="#94a3b8" stroke-width="1" />

          <!-- Dual Front Headlights (Bright Yellow/White) -->
          <ellipse cx="32" cy="19" rx="3.5" ry="2" fill="#fef08a" />
          <ellipse cx="68" cy="19" rx="3.5" ry="2" fill="#fef08a" />

          <!-- Rear Red Brake Lights -->
          <ellipse cx="30" cy="83" rx="4" ry="2" fill="#ef4444" />
          <ellipse cx="70" cy="83" rx="4" ry="2" fill="#ef4444" />
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'salesman-vehicle-leaflet-icon',
    html,
    iconSize: [48, 80],
    iconAnchor: [24, 56],
    popupAnchor: [0, -58],
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
        ${isCurrent ? '<div style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(37, 99, 235, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>' : ''}
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
  const liveBreadcrumbsLayerRef = useRef(null);
  const routeCasingRef = useRef(null);
  const routeCoreRef = useRef(null);
  const stopMarkersRef = useRef([]);

  const [salesmen, setSalesmen] = useState([]);
  const [selectedSalesman, setSelectedSalesman] = useState(null);
  const [followSalesmanId, setFollowSalesmanId] = useState(null);
  const followSalesmanIdRef = useRef(null);
  followSalesmanIdRef.current = followSalesmanId;

  // Sleek UI: card state (expanded / minimized / dismissed)
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(true);
  const [isTelemetryCollapsed, setIsTelemetryCollapsed] = useState(false);

  const [search, setSearch] = useState('');
  const [activeRouteMeta, setActiveRouteMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);

  // Initialize Map dynamically
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [27.0276, 78.2074],
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

    // Live Breadcrumbs Polyline Layer (shows real traveled path)
    const liveBreadcrumbGroup = L.layerGroup().addTo(map);
    liveBreadcrumbsLayerRef.current = liveBreadcrumbGroup;

    map.on('dragstart', () => {
      // Manual drag gently disables auto-follow so user can inspect map freely
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

  // Update Live Trail Breadcrumbs Polyline on Map
  const addBreadcrumbPoint = useCallback((salesmanId, lat, lng) => {
    if (!mapRef.current || !liveBreadcrumbsLayerRef.current) return;

    if (!markersRef.current[`trail_${salesmanId}`]) {
      const trail = L.polyline([[lat, lng]], {
        color: '#06b6d4', // Cyan glowing line
        weight: 4.5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(liveBreadcrumbsLayerRef.current);
      markersRef.current[`trail_${salesmanId}`] = trail;
    } else {
      const trail = markersRef.current[`trail_${salesmanId}`];
      const pts = trail.getLatLngs();
      if (pts.length > 150) pts.shift();
      pts.push([lat, lng]);
      trail.setLatLngs(pts);
    }
  }, []);

  // 60 FPS LERP Marker Glide Animator (Ola / Uber Smooth Motion for Real GPS Updates)
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
    const duration = 1200; // 1.2s smooth interpolation between real GPS points

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
      const ease = 1 - Math.pow(1 - progress, 3);

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
        if (speedBadge) {
          speedBadge.innerText = speed > 2 ? `${speed} km/h` : 'On-Site';
        }
      }

      // Camera Lock / Follow Mode
      if (followSalesmanIdRef.current === salesmanId && mapRef.current) {
        mapRef.current.panTo([lat, lng], { animate: false });
      }

      if (progress < 1) {
        anim.rafId = requestAnimationFrame(frameStep);
      } else {
        anim.rafId = null;
        if (speed > 2) addBreadcrumbPoint(salesmanId, targetLat, targetLng);
      }
    };

    anim.rafId = requestAnimationFrame(frameStep);
  }, [addBreadcrumbPoint]);

  // Sync Markers to Leaflet Map dynamically
  // 🌟 Strict Rule: ONLY render active/live salesmen on the radar map!
  const syncMarkers = useCallback(
    (salesmenList) => {
      if (!mapRef.current) return;

      const bounds = [];
      const activeIds = new Set();

      salesmenList.forEach((s) => {
        const id = s.salesmanId?.toString();
        const isLive = Boolean(s.isOnline && s.trackingStatus === 'live');
        if (!id || s.latitude == null || s.longitude == null) return;
        const lat = Number(s.latitude);
        const lng = Number(s.longitude);
        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

        // ONLY render live online salesmen on the map
        if (!isLive) {
          if (markersRef.current[id]) {
            mapRef.current.removeLayer(markersRef.current[id]);
            delete markersRef.current[id];
          }
          return;
        }

        activeIds.add(id);
        bounds.push([lat, lng]);
        const icon = createVehicleMarkerIcon(s);

        if (markersRef.current[id]) {
          const m = markersRef.current[id];
          m.setIcon(icon);
          animateMarkerGlide(id, lat, lng, s.heading || 0, s.speed || 0);
        } else {
          const m = L.marker([lat, lng], { icon }).addTo(mapRef.current);
          m.on('click', () => {
            setSelectedSalesman(s);
            setIsTelemetryOpen(true);
            setFollowSalesmanId(id);
          });
          markersRef.current[id] = m;
          markerAnimationsRef.current[id] = { currentLat: lat, currentLng: lng, currentBearing: s.heading || 0 };
        }
      });

      // Remove any lingering markers that are no longer active
      Object.keys(markersRef.current).forEach((k) => {
        if (!k.startsWith('trail_') && !activeIds.has(k)) {
          mapRef.current.removeLayer(markersRef.current[k]);
          delete markersRef.current[k];
        }
      });

      // Fit map bounds strictly to active online coordinates
      if (bounds.length > 0 && mapRef.current && !followSalesmanIdRef.current) {
        if (bounds.length === 1) {
          mapRef.current.setView(bounds[0], 15);
        } else {
          mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
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
        const activeOnline = res.locations.find((s) => s.isOnline && s.trackingStatus === 'live');
        if (activeOnline) {
          setSelectedSalesman(activeOnline);
          setFollowSalesmanId(activeOnline.salesmanId?.toString());
        } else if (res.locations.length > 0 && !selectedSalesman) {
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

  // Socket Live Streaming Gateway (Strict Real Devices Only)
  useEffect(() => {
    if (!socket) return;

    // Real device location update received from mobile phone GPS
    socket.on('admin:location:update', (data) => {
      const { salesmanId, latitude, longitude, speed = 0, heading = 0, battery, address, trackingStatus, salesmanName } = data;
      const id = salesmanId?.toString();
      if (!id) return;
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const realSpeed = Math.max(0, Number(speed) || 0);

      setSalesmen((prev) => {
        let exists = false;
        const updated = prev.map((s) => {
          if (s.salesmanId?.toString() === id) {
            exists = true;
            return {
              ...s,
              latitude: lat,
              longitude: lng,
              speed: realSpeed,
              heading: Number(heading) || 0,
              battery: battery != null ? Number(battery) : s.battery,
              address: address || s.address,
              trackingStatus: trackingStatus || 'live',
              isOnline: true,
            };
          }
          return s;
        });

        if (!exists) {
          updated.push({
            salesmanId,
            name: salesmanName || 'Salesman',
            latitude: lat,
            longitude: lng,
            speed: realSpeed,
            heading: Number(heading) || 0,
            battery,
            address,
            trackingStatus: trackingStatus || 'live',
            isOnline: true,
          });
        }
        return updated;
      });

      setSelectedSalesman((prev) => {
        if (prev?.salesmanId?.toString() === id) {
          return {
            ...prev,
            latitude: lat,
            longitude: lng,
            speed: realSpeed,
            heading: Number(heading) || 0,
            battery: battery != null ? Number(battery) : prev.battery,
            address: address || prev.address,
            trackingStatus: trackingStatus || 'live',
            isOnline: true,
          };
        }
        return prev;
      });

      // Animate marker live on map
      const icon = createVehicleMarkerIcon({
        name: salesmanName || 'Salesman',
        isOnline: true,
        trackingStatus: 'live',
        speed: realSpeed,
        heading: Number(heading) || 0,
      });

      if (!markersRef.current[id] && mapRef.current) {
        const m = L.marker([lat, lng], { icon }).addTo(mapRef.current);
        m.on('click', () => {
          setSelectedSalesman({ salesmanId: id, name: salesmanName, latitude: lat, longitude: lng });
          setIsTelemetryOpen(true);
          setFollowSalesmanId(id);
        });
        markersRef.current[id] = m;
      } else if (markersRef.current[id]) {
        markersRef.current[id].setIcon(icon);
      }

      animateMarkerGlide(id, lat, lng, heading || 0, realSpeed);

      if (realSpeed > 2) {
        addBreadcrumbPoint(id, lat, lng);
      }
    });

    // Real device status change (connected / disconnected)
    socket.on('admin:salesman:status', (data) => {
      const { salesmanId, salesmanName, salesmanCode, territory, isOnline, trackingStatus, lastSeenAt, battery, latitude, longitude, speed = 0 } = data;
      const id = salesmanId?.toString();
      if (!id) return;

      const isTrulyLive = Boolean(isOnline === true && trackingStatus === 'live');
      const realSpeed = isTrulyLive ? Math.max(0, Number(speed) || 0) : 0;

      // If salesman went offline, remove their car marker from live map
      if (!isTrulyLive && markersRef.current[id] && mapRef.current) {
        mapRef.current.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }

      setSalesmen((prev) => {
        let exists = false;
        const updated = prev.map((s) => {
          if (s.salesmanId?.toString() === id) {
            exists = true;
            return {
              ...s,
              name: salesmanName || s.name,
              salesmanCode: salesmanCode || s.salesmanCode,
              territory: territory || s.territory,
              isOnline: isTrulyLive,
              trackingStatus: trackingStatus || (isTrulyLive ? 'live' : 'offline'),
              lastSeenAt: lastSeenAt || s.lastSeenAt,
              battery: battery != null ? battery : s.battery,
              latitude: latitude != null ? Number(latitude) : s.latitude,
              longitude: longitude != null ? Number(longitude) : s.longitude,
              speed: realSpeed,
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
            isOnline: isTrulyLive,
            trackingStatus: trackingStatus || 'offline',
            lastSeenAt: lastSeenAt || new Date(),
            battery: battery != null ? battery : null,
            latitude: latitude != null ? Number(latitude) : null,
            longitude: longitude != null ? Number(longitude) : null,
            speed: realSpeed,
          });
        }
        return updated;
      });

      setSelectedSalesman((prev) => {
        if (prev?.salesmanId?.toString() === id) {
          return {
            ...prev,
            isOnline: isTrulyLive,
            trackingStatus: trackingStatus || (isTrulyLive ? 'live' : 'offline'),
            lastSeenAt: lastSeenAt || prev.lastSeenAt,
            battery: battery != null ? battery : prev.battery,
            latitude: latitude != null ? Number(latitude) : prev.latitude,
            longitude: longitude != null ? Number(longitude) : prev.longitude,
            speed: realSpeed,
          };
        }
        return prev;
      });

      if (isTrulyLive && latitude != null && longitude != null && !isNaN(latitude) && !isNaN(longitude)) {
        animateMarkerGlide(id, parseFloat(latitude), parseFloat(longitude), 0, realSpeed);
      }
    });

    return () => {
      socket.off('admin:location:update');
      socket.off('admin:salesman:status');
    };
  }, [socket, animateMarkerGlide, addBreadcrumbPoint]);

  // Toggle Camera Lock / Follow Mode (Ola / Uber Style)
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

  // Draw Dynamic Beat Route from GPS History and Customer Stops
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
      stopMarkersRef.current.forEach((m) => mapRef.current?.removeLayer(m.marker || m));
      stopMarkersRef.current = [];

      const breadcrumbs = (histRes.history || [])
        .filter((h) => h.latitude && h.longitude && !isNaN(h.latitude) && !isNaN(h.longitude))
        .map((h) => [Number(h.latitude), Number(h.longitude)]);

      if (salesman.latitude && salesman.longitude && !isNaN(salesman.latitude) && !isNaN(salesman.longitude)) {
        breadcrumbs.push([Number(salesman.latitude), Number(salesman.longitude)]);
      }

      const activeRoute = routesRes?.routes?.[0] || null;
      const stops = activeRoute?.parties || [];

      const validStopsWithCoords = stops.filter(
        (st) => st.party?.latitude && st.party?.longitude
      );

      if (breadcrumbs.length < 2 && validStopsWithCoords.length === 0) {
        alert(
          `No recorded GPS beat history found today for ${salesman.name}. As salesman travels on field with device, live track will appear dynamically.`
        );
        setRouteLoading(false);
        return;
      }

      let roadPolyline = breadcrumbs;
      let distKm = 0;
      let durationMins = 0;
      let provider = 'direct';

      if (breadcrumbs.length >= 2) {
        try {
          const pointsStr = breadcrumbs.slice(-15).map((c) => `${c[0]},${c[1]}`).join(';');
          const dirRes = await api.get(`/tracking/directions?points=${encodeURIComponent(pointsStr)}`);
          if (dirRes.polyline && dirRes.polyline.length > 0) {
            roadPolyline = dirRes.polyline;
            distKm = dirRes.distanceKm || 0;
            durationMins = dirRes.durationMins || 0;
            provider = dirRes.provider || 'osrm';
          }
        } catch (e) {}
      }

      if (roadPolyline.length >= 2) {
        const casing = L.polyline(roadPolyline, {
          color: '#1e1b4b',
          weight: 7,
          opacity: 0.6,
          lineCap: 'round',
        }).addTo(mapRef.current);
        routeCasingRef.current = casing;

        const core = L.polyline(roadPolyline, {
          color: '#0ea5e9',
          weight: 4,
          opacity: 0.95,
          lineCap: 'round',
        }).addTo(mapRef.current);
        routeCoreRef.current = core;
      }

      const completedCount = stops.filter((s) => s.status === 'Completed').length;
      const markerList = [];

      stops.forEach((st, idx) => {
        const pty = st.party;
        if (pty?.latitude && pty?.longitude && !isNaN(pty.latitude) && !isNaN(pty.longitude)) {
          const lat = Number(pty.latitude);
          const lng = Number(pty.longitude);
          const isComp = st.status === 'Completed';
          const isCur = !isComp && idx === completedCount;
          const statusStr = isComp ? 'Completed' : isCur ? 'Current' : 'Pending';

          const stopIcon = createStopMarkerIcon(idx + 1, pty.name || 'Store', statusStr);
          const stopM = L.marker([lat, lng], { icon: stopIcon }).addTo(mapRef.current);
          stopM.bindPopup(`
            <div style="font-family: inherit; font-size: 12px; min-width: 190px; padding: 4px;">
              <strong style="color: #0f172a; font-size: 13px;">Stop ${idx + 1}: ${pty.name || 'Store'}</strong>
              <p style="margin: 3px 0; color: #475569;">Status: <strong style="color: ${isComp ? '#059669' : '#d97706'}">${statusStr}</strong></p>
              ${pty.address ? `<p style="margin: 2px 0; font-size: 11px; color: #64748b;">📍 ${pty.address}</p>` : ''}
              ${st.collectionAmount ? `<p style="margin-top: 4px; color: #7e22ce; font-weight: 800;">₹ ${Number(st.collectionAmount).toLocaleString()} Collected</p>` : ''}
            </div>
          `);
          markerList.push({ marker: stopM, stopIndex: idx + 1 });
        }
      });

      stopMarkersRef.current = markerList;

      if (routeCasingRef.current && mapRef.current) {
        mapRef.current.fitBounds(routeCasingRef.current.getBounds(), { padding: [60, 60] });
      }

      setActiveRouteMeta({
        salesmanName: salesman.name,
        distanceKm: distKm > 0 ? distKm : null,
        durationMins: durationMins > 0 ? durationMins : null,
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
    stopMarkersRef.current.forEach((m) => mapRef.current?.removeLayer(m.marker || m));
    stopMarkersRef.current = [];
    setActiveRouteMeta(null);
  };

  const liveCount = salesmen.filter((s) => s.isOnline && s.trackingStatus === 'live').length;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
      <Navbar
        title="Live Fleet Radar"
        subtitle="Real-time physical GPS tracking, verified field presence, and customer stops audit"
      />

      <main className="flex-1 p-3 sm:p-4 flex flex-col lg:flex-row gap-3 overflow-hidden relative">
        {/* Left Map Area - 100% UNRESTRICTED FULL VIEW */}
        <div className="flex-1 rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm relative flex flex-col bg-slate-100">
          
          {/* Floating Re-Open Pill Button (If user closed the dock, they can click here to re-open) */}
          {!isTelemetryOpen && selectedSalesman && (
            <button
              onClick={() => setIsTelemetryOpen(true)}
              className="absolute top-4 left-4 z-[400] bg-white/95 hover:bg-white text-slate-800 px-3.5 py-2 rounded-2xl shadow-lg border border-slate-200 text-xs font-bold flex items-center gap-2 cursor-pointer transition active:scale-95"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{selectedSalesman.name}</span>
              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono text-[10px]">
                {selectedSalesman.speed > 2 ? `${selectedSalesman.speed} km/h` : 'On-Site'}
              </span>
            </button>
          )}

          {/* 🌟 SLEEK, NON-INTRUSIVE BOTTOM FLOATING TELEMETRY DOCK (UBER/GOOGLE MAPS STYLE) */}
          {/* Sits cleanly at the bottom without blocking the center map view */}
          {isTelemetryOpen && selectedSalesman && (
            <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:w-[420px] z-[400] bg-white/95 backdrop-blur-md text-slate-800 rounded-2xl shadow-2xl border border-slate-200/95 text-xs transition-all duration-200">
              
              {/* Header Bar */}
              <div className="p-3 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                    {selectedSalesman.name ? selectedSalesman.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-xs text-slate-900 truncate">{selectedSalesman.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-[10px] font-bold text-brand-700 bg-brand-50 px-1.5 py-0.2 rounded border border-brand-200">
                        {selectedSalesman.salesmanCode || 'N/A'}
                      </span>
                      <span
                        className={`text-[10px] font-bold flex items-center gap-1 ${
                          selectedSalesman.isOnline && selectedSalesman.trackingStatus === 'live'
                            ? 'text-emerald-700'
                            : 'text-slate-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            selectedSalesman.isOnline && selectedSalesman.trackingStatus === 'live'
                              ? 'bg-emerald-500 animate-pulse'
                              : 'bg-slate-300'
                          }`}
                        />
                        {selectedSalesman.isOnline && selectedSalesman.trackingStatus === 'live' ? 'LIVE ONLINE' : 'OFFLINE'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Camera Lock / Follow Button */}
                  <button
                    onClick={toggleFollow}
                    title="Camera Lock (Ola/Uber Follow)"
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      followSalesmanId === selectedSalesman.salesmanId?.toString()
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span className="text-[10px]">
                      {followSalesmanId === selectedSalesman.salesmanId?.toString() ? 'LOCKED' : 'LOCK'}
                    </span>
                  </button>

                  {/* Collapse / Expand Toggle */}
                  <button
                    onClick={() => setIsTelemetryCollapsed(!isTelemetryCollapsed)}
                    title={isTelemetryCollapsed ? 'Expand Details' : 'Collapse Details'}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
                  >
                    {isTelemetryCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {/* Dismiss Button (Gives 100% full map view) */}
                  <button
                    onClick={() => setIsTelemetryOpen(false)}
                    title="Close Card (View Full Map)"
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Collapsible Content */}
              {!isTelemetryCollapsed && (
                <div className="p-3 pt-2 space-y-2.5">
                  {/* Real Live Gauges */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 rounded-xl p-1.5 border border-slate-100">
                      <span className="text-[9px] uppercase text-slate-400 font-bold block">Live Speed</span>
                      <span
                        className={`text-sm font-extrabold ${
                          selectedSalesman.isOnline && selectedSalesman.speed > 2
                            ? 'text-emerald-600'
                            : 'text-slate-800'
                        }`}
                      >
                        {selectedSalesman.isOnline && selectedSalesman.speed > 2 ? `${selectedSalesman.speed}` : '0'}
                      </span>
                      <span className="text-[8.5px] text-slate-400 block -mt-0.5 truncate">
                        {selectedSalesman.isOnline
                          ? selectedSalesman.speed > 2
                            ? 'km/h (Driving)'
                            : 'Stationary'
                          : 'Offline'}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-1.5 border border-slate-100">
                      <span className="text-[9px] uppercase text-slate-400 font-bold block">Battery</span>
                      <span className="text-sm font-extrabold text-emerald-700 flex items-center justify-center gap-0.5">
                        <Battery className="w-3 h-3 text-emerald-600" />
                        {selectedSalesman.battery != null ? `${selectedSalesman.battery}%` : 'N/A'}
                      </span>
                      <span className="text-[8.5px] text-slate-400 block -mt-0.5">Phone Battery</span>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-1.5 border border-slate-100">
                      <span className="text-[9px] uppercase text-slate-400 font-bold block">GPS Accuracy</span>
                      <span className="text-sm font-extrabold text-sky-700 truncate">
                        {selectedSalesman.accuracy ? `±${selectedSalesman.accuracy}m` : selectedSalesman.isOnline ? 'Active' : 'N/A'}
                      </span>
                      <span className="text-[8.5px] text-slate-400 block -mt-0.5">Real GPS</span>
                    </div>
                  </div>

                  {/* Real Location String */}
                  <p className="text-[10.5px] text-slate-600 truncate font-medium">
                    {selectedSalesman.address
                      ? `📍 ${selectedSalesman.address}`
                      : selectedSalesman.latitude && selectedSalesman.longitude
                      ? `📍 GPS [${Number(selectedSalesman.latitude).toFixed(4)}, ${Number(selectedSalesman.longitude).toFixed(4)}]`
                      : '📍 Awaiting live GPS broadcast from device'}
                  </p>

                  {/* Action Button: View Real Beat Route */}
                  <button
                    onClick={() => handleDrawRoute(selectedSalesman)}
                    disabled={routeLoading}
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs py-2 px-3 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${routeLoading ? 'animate-spin' : ''}`} />
                    <span>{routeLoading ? 'Loading Beat Route...' : 'View Route & Verified Stops'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Active Route Meta Pill */}
          {activeRouteMeta && (
            <div className="absolute top-4 right-4 z-[400] bg-white/95 backdrop-blur-md text-slate-800 p-3.5 rounded-2xl shadow-xl border border-slate-200/90 text-xs space-y-1.5 max-w-[280px]">
              <div className="flex items-center justify-between font-bold border-b border-slate-100 pb-1.5">
                <span className="text-brand-700 flex items-center gap-1 font-extrabold">
                  <Navigation className="w-3.5 h-3.5" /> Beat Route Trace
                </span>
                <button
                  onClick={handleClearRoute}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {activeRouteMeta.distanceKm && (
                <div className="text-[11px] text-slate-600">
                  Total Travel: <strong className="text-slate-900">{activeRouteMeta.distanceKm} km</strong>
                </div>
              )}
              {activeRouteMeta.durationMins && (
                <div className="text-[11px] text-slate-600">
                  Est. Travel Time: <strong className="text-slate-900">~{activeRouteMeta.durationMins} mins</strong>
                </div>
              )}
              <div className="text-[11px] text-slate-600">
                Customer Stops:{' '}
                <strong className="text-emerald-700">
                  {activeRouteMeta.completedStops} / {activeRouteMeta.totalStops} Completed
                </strong>
              </div>
            </div>
          )}

          <div ref={mapContainerRef} className="w-full h-full z-0" />
        </div>

        {/* Right Sidebar Salesmen List (Clean Light Theme - 100% Real Live Status) */}
        <div className="w-full lg:w-80 flex flex-col gap-3 shrink-0">
          <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs flex flex-col h-full max-h-[640px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>Field Salesmen Fleet</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {liveCount} Active Online
              </span>
            </div>

            <div className="my-3 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search salesman by name, territory..."
                className="w-full text-xs border border-slate-200 rounded-xl pl-8 pr-3 py-2 bg-slate-50 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {salesmen.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No salesmen registered in fleet.
                </div>
              ) : (
                salesmen
                  .filter((s) => {
                    if (!search.trim()) return true;
                    const query = search.toLowerCase();
                    return (
                      (s.name || '').toLowerCase().includes(query) ||
                      (s.salesmanCode || '').toLowerCase().includes(query) ||
                      (s.territory || '').toLowerCase().includes(query)
                    );
                  })
                  .map((s) => {
                    const isSelected = selectedSalesman?.salesmanId === s.salesmanId;
                    const isLive = Boolean(s.isOnline && s.trackingStatus === 'live');
                    const realSpeed = isLive ? Math.max(0, Number(s.speed) || 0) : 0;
                    const isMoving = isLive && realSpeed > 2;
                    const hasGps = s.latitude && s.longitude;

                    return (
                      <div
                        key={s.salesmanId}
                        onClick={() => {
                          setSelectedSalesman(s);
                          setIsTelemetryOpen(true);
                          setIsTelemetryCollapsed(false);
                          setFollowSalesmanId(s.salesmanId?.toString());
                          if (hasGps && mapRef.current) {
                            mapRef.current.flyTo([Number(s.latitude), Number(s.longitude)], 15);
                          }
                        }}
                        className={`p-3 rounded-2xl border text-xs cursor-pointer transition ${
                          isSelected
                            ? 'bg-brand-50 border-brand-300 shadow-xs'
                            : 'bg-white border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                isMoving
                                  ? 'bg-emerald-500 animate-ping'
                                  : isLive
                                  ? 'bg-emerald-500'
                                  : 'bg-slate-300'
                              }`}
                            />
                            <span className="font-bold text-slate-900 truncate">{s.name}</span>
                          </div>

                          <span className="shrink-0 text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                            {s.salesmanCode || 'N/A'}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="truncate">{s.territory || 'Assigned Territory'}</span>
                          {isMoving ? (
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded shrink-0">
                              {realSpeed} km/h
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              {isLive ? 'Stationary (On-Site)' : 'Offline'}
                            </span>
                          )}
                        </div>

                        <p className="text-[10.5px] text-slate-400 truncate mt-1">
                          {s.address
                            ? `📍 ${s.address}`
                            : hasGps
                            ? `📍 GPS [${Number(s.latitude).toFixed(3)}, ${Number(s.longitude).toFixed(3)}]`
                            : 'Awaiting device GPS broadcast'}
                        </p>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LiveFleetRadar;
