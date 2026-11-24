import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, SwitchCamera, AlertCircle, RefreshCw, Upload, MapPin, Check } from 'lucide-react';
import { stampGpsWatermark, stampFileWithGps } from '../utils/gpsWatermark';

const LiveGpsCameraModal = ({ isOpen, onClose, onCapture, metadata = {} }) => {
  const [stream, setStream] = useState(null);
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' (back) or 'user' (front)
  const [cameraError, setCameraError] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Live timer for HUD display
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Start Camera Stream
  const startCamera = async (facing) => {
    stopCamera();
    setCameraError('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported on this browser or device.');
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Camera access failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in browser site settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. You can upload a photo from files instead.');
      } else {
        setCameraError(`Camera unavailable: ${err.message || 'Please check device permissions.'}`);
      }
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Start on modal open, stop on close
  useEffect(() => {
    if (isOpen) {
      startCamera(cameraFacing);
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, cameraFacing]);

  // Flip Camera Front <-> Rear
  const toggleFacingMode = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
  };

  // Capture Photo from Live Video Frame
  const handleCapture = async () => {
    if (!videoRef.current || capturing) return;
    setCapturing(true);

    // Trigger visual camera shutter flash
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    try {
      const stampedDataUrl = await stampGpsWatermark(videoRef.current, {
        ...metadata,
        date: currentTime,
      });

      stopCamera();
      onCapture(stampedDataUrl);
      onClose();
    } catch (err) {
      alert('Failed to capture photo: ' + err.message);
    } finally {
      setCapturing(false);
    }
  };

  // Handle fallback file upload with GPS watermark stamp
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCapturing(true);
    try {
      const stampedDataUrl = await stampFileWithGps(file, {
        ...metadata,
        date: currentTime,
      });

      stopCamera();
      onCapture(stampedDataUrl);
      onClose();
    } catch (err) {
      alert('Failed to stamp file: ' + err.message);
    } finally {
      setCapturing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="relative bg-slate-950 rounded-3xl w-full max-w-2xl h-[92vh] max-h-[800px] flex flex-col overflow-hidden border border-slate-800 shadow-2xl">
        {/* Shutter Flash Animation */}
        {flash && <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-200 pointer-events-none" />}

        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span className="font-bold text-sm tracking-wide text-white flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-brand-400" />
              GPS Map Camera
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Live Verified
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFacingMode}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 transition"
              title="Flip Camera (Front/Rear)"
            >
              <SwitchCamera className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px] font-semibold">Flip</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600/80 text-slate-300 hover:text-white transition"
              title="Close Camera"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewfinder Main Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center max-w-md space-y-4">
              <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto text-rose-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h4 className="text-white font-bold text-base">Camera Not Accessible</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{cameraError}</p>
              <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => startCamera(cameraFacing)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Camera
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Choose File & Stamp GPS
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Live Video */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Crosshair Overlay */}
              <div className="absolute inset-8 pointer-events-none border border-white/20 rounded-2xl flex flex-col justify-between p-3">
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-white/60" />
                  <div className="w-4 h-4 border-t-2 border-r-2 border-white/60" />
                </div>
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-white/60" />
                  <div className="w-4 h-4 border-b-2 border-r-2 border-white/60" />
                </div>
              </div>

              {/* Live GPS HUD Overlay Preview (like GPS Map Camera app) */}
              <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
                <div className="bg-slate-950/85 backdrop-blur-md border border-white/20 rounded-2xl p-3 shadow-2xl text-left max-w-lg">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center text-sm shrink-0">
                      📍
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white text-xs truncate">
                          {metadata.partyName || 'Customer Visit'} {metadata.shopName ? `• ${metadata.shopName}` : ''}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 shrink-0">
                          {currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}{' '}
                          {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-300 truncate mt-0.5">
                        {metadata.address || 'Field Location Verified'} {metadata.city ? `• ${metadata.city}` : ''}
                      </p>
                      <div className="flex items-center justify-between mt-1 text-[11px] font-mono font-bold text-emerald-400">
                        <span>
                          Lat: {metadata.lat != null ? Number(metadata.lat).toFixed(6) : '--'}, Lng:{' '}
                          {metadata.lng != null ? Number(metadata.lng).toFixed(6) : '--'}
                        </span>
                        <span className="text-[9.5px] text-sky-400 font-sans font-semibold">
                          ✓ GPS MAP CAMERA
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bottom Shutter & Controls Bar */}
        <div className="p-4 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between z-20 shrink-0">
          {/* File Picker Fallback Button */}
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl flex items-center gap-2 text-xs font-semibold transition"
              title="Upload existing image and stamp GPS"
            >
              <Upload className="w-4 h-4 text-brand-400" />
              <span className="hidden sm:inline">From Gallery</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Shutter Capture Button */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleCapture}
              disabled={capturing || !!cameraError}
              className="group relative w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl transition-transform active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Click to take GPS stamped photo"
            >
              <div className="w-13 h-13 rounded-full border-2 border-slate-900 flex items-center justify-center group-hover:bg-rose-50 transition">
                <div className="w-9 h-9 rounded-full bg-rose-600 group-hover:bg-rose-500 transition shadow-inner" />
              </div>
            </button>
          </div>

          {/* Close Button */}
          <div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveGpsCameraModal;
