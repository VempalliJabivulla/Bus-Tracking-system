import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocationSharing } from '../hooks/useRealtime';
import { SEED_ROUTES } from '../lib/constants';
import MapView from '../components/MapView';
import RouteTimeline from '../components/RouteTimeline';
import { getDirections, decodePolyline } from '../lib/olaMaps';
import { databases, DATABASE_ID, COLLECTIONS, Query } from '../lib/appwrite';

// Simple Error Boundary implementation for DriverDashboard
class DriverDashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center text-error bg-error-container min-h-screen">
          <h1 className="text-2xl font-bold mb-4">Driver Dashboard Error</h1>
          <p className="font-mono text-sm">{this.state.error?.toString()}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function DriverDashboardContent() {
  const { user, logout } = useAuth();
  const location = useLocation();
  
  const isRouteTab = location.pathname === '/driver/route';
  const isDashboardTab = location.pathname === '/driver' || !isRouteTab;
  
  // ─── State ───
  const [selectedRouteId, setSelectedRouteId] = useState(() => {
    return localStorage.getItem('driver_selected_route_id') || '';
  });
  const [dbRoutes, setDbRoutes] = useState([]);
  const [dbRoutesLoading, setDbRoutesLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState(null);

  // States required for initialization, position, route, and sharing
  const [busPosition, setBusPosition] = useState(null);
  const [stops, setStops] = useState([]);
  const [currentStop, setCurrentStop] = useState(0);
  const [tripStarted, setTripStarted] = useState(false);

  const [simulateMode, setSimulateMode] = useState(false);
  const [roadRouting, setRoadRouting] = useState(true);

  // Trip Type and Bus Timings State
  const [tripType, setTripType] = useState('morning');
  const [selectedTiming, setSelectedTiming] = useState('');

  // Calculate available timings for selected route and tripType
  const availableTimings = useMemo(() => {
    if (!selectedRoute) return [];

    const code = selectedRoute.code || '';
    const timingsMap = {
      'ROUTE 33F': {
        morning: ['7:30 AM', '8:30 AM'],
        evening: ['4:30 PM', '5:30 PM']
      },
      'ROUTE 21E': {
        morning: ['7:00 AM', '8:00 AM'],
        evening: ['4:00 PM', '5:00 PM']
      },
      'ROUTE 42A': {
        morning: ['8:15 AM', '9:15 AM'],
        evening: ['5:00 PM', '6:00 PM']
      },
      'ROUTE 12B': {
        morning: ['8:30 AM', '9:30 AM'],
        evening: ['5:00 PM', '6:00 PM']
      },
      'ROUTE 05C': {
        morning: ['7:45 AM', '8:45 AM'],
        evening: ['4:45 PM', '5:45 PM']
      },
      'ROUTE 18D': {
        morning: ['7:30 AM', '8:30 AM'],
        evening: ['5:30 PM', '6:30 PM']
      }
    };

    // Extract base code (e.g. ROUTE 33F_RET -> ROUTE 33F)
    let baseCode = code.split('_')[0];
    const routeTimings = timingsMap[baseCode] || timingsMap['ROUTE 33F']; // fallback
    return routeTimings[tripType] || [];
  }, [selectedRoute, tripType]);

  // Sync selectedTiming with the first available timing whenever availableTimings change
  useEffect(() => {
    if (availableTimings.length > 0) {
      setSelectedTiming(availableTimings[0]);
    } else {
      setSelectedTiming('');
    }
  }, [availableTimings]);

  // Auto-clear selected route if it does not belong to the selected trip type
  useEffect(() => {
    if (selectedRoute && selectedRoute.tripType !== tripType) {
      setSelectedRouteId('');
    }
  }, [tripType, selectedRoute]);

  // Section 6 & Requirement 4: helper functions for resetting state
  const clearWatch = () => {
    stopSharing();
  };

  const removeMarkers = () => {
    setStops([]);
  };

  const removePolyline = () => {
    setStaticPolyline(null);
  };

  const clearCache = () => {
    localStorage.removeItem('driver_selected_route_id');
  };

  // ─── 1. Fetch all routes from DB on mount ───
  useEffect(() => {
    const fetchRoutesList = async () => {
      try {
        setDbRoutesLoading(true);
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.ROUTES || 'routes', [
          Query.limit(100)
        ]);
        const formatted = res.documents.map(doc => ({
          id: doc.$id,
          code: doc.code,
          name: doc.name,
          origin: doc.origin,
          destination: doc.destination,
          departureTime: doc.departureTime,
          period: doc.period,
          shift: doc.shift,
          tripType: doc.shift || (doc.code.includes('RET') ? 'evening' : 'morning'),
          stops: typeof doc.stops === 'string' ? JSON.parse(doc.stops) : doc.stops,
          originCoords: typeof doc.originCoords === 'string' ? JSON.parse(doc.originCoords) : doc.originCoords,
          destinationCoords: typeof doc.destinationCoords === 'string' ? JSON.parse(doc.destinationCoords) : doc.destinationCoords,
          status: doc.status
        }));
        setDbRoutes(formatted);
      } catch (err) {
        console.warn("DB fetch failed, using SEED_ROUTES fallback:", err);
        const formattedSeed = SEED_ROUTES.map(r => ({
          ...r,
          tripType: r.shift || (r.code.includes('RET') ? 'evening' : 'morning')
        }));
        setDbRoutes(formattedSeed);
      } finally {
        setDbRoutesLoading(false);
      }
    };
    fetchRoutesList();
  }, []);

  // ─── 2. When selectedRouteId changes: FULL STATE RESET + fetch route from DB ───
  useEffect(() => {
    // Section 6 & Requirement 4: State Reset
    setBusPosition(null);
    setStops([]);
    setCurrentStop(0);
    setTripStarted(false);
    clearWatch();
    removeMarkers();
    removePolyline();
    clearCache();
    setSelectedRoute(null);
    setStaticPolyline(null);

    if (!selectedRouteId) return;

    const fetchRouteDetail = async () => {
      let route = null;
      try {
        const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.ROUTES || 'routes', selectedRouteId);
        const docStops = typeof doc.stops === 'string' ? JSON.parse(doc.stops) : doc.stops;
        const mappedStops = docStops.map(s => {
          const lat = s.lat !== undefined ? s.lat : s.latitude;
          const lng = s.lng !== undefined ? s.lng : s.longitude;
          return {
            name: s.name,
            lat: lat,
            lng: lng,
            latitude: lat,
            longitude: lng,
            order: s.order
          };
        });
        route = {
          id: doc.$id,
          code: doc.code,
          name: doc.name,
          origin: doc.origin,
          destination: doc.destination,
          departureTime: doc.departureTime,
          period: doc.period,
          shift: doc.shift,
          tripType: doc.shift || (doc.code.includes('RET') ? 'evening' : 'morning'),
          stops: mappedStops,
          status: doc.status
        };
      } catch (err) {
        console.warn("DB detail fetch failed, using SEED_ROUTES fallback:", err);
        const fallback = SEED_ROUTES.find(r => r.id === selectedRouteId) || null;
        if (fallback) {
          const mappedStops = fallback.stops.map(s => {
            const lat = s.lat !== undefined ? s.lat : s.latitude;
            const lng = s.lng !== undefined ? s.lng : s.longitude;
            return {
              name: s.name,
              lat: lat,
              lng: lng,
              latitude: lat,
              longitude: lng,
              order: s.order
            };
          });
          route = {
            id: fallback.id,
            code: fallback.code,
            name: fallback.name,
            origin: fallback.origin,
            destination: fallback.destination,
            departureTime: fallback.departureTime,
            period: fallback.period,
            shift: fallback.shift,
            tripType: fallback.shift || (fallback.code.includes('RET') ? 'evening' : 'morning'),
            stops: mappedStops,
            status: fallback.status
          };
        }
      }

      if (route) {
        // Section 5: Bus Initial Position
        const initialPosition = {
          lat: route.stops[0].latitude,
          lng: route.stops[0].longitude,
          latitude: route.stops[0].latitude,
          longitude: route.stops[0].longitude
        };
        setBusPosition(initialPosition);
        setSelectedRoute(route);
        setStops(route.stops);

        // STEP 2: Add debugging logs immediately after selecting a route
        console.log("Selected Route");
        console.log(route);
        console.log("Stops");
        console.table(route.stops);
        console.log("First Stop");
        console.log(route.stops[0]);
        console.log("Bus Position");
        console.log(initialPosition);
      }
    };

    fetchRouteDetail();
  }, [selectedRouteId]);

  // ─── Fetch route polyline (road routing or straight lines) ───
  // Reused EXACTLY from Student Portal (LiveMapPage.jsx)
  const [staticPolyline, setStaticPolyline] = useState(null);

  useEffect(() => {
    if (!selectedRoute || !selectedRoute.stops || selectedRoute.stops.length < 2) {
      setStaticPolyline(null);
      return;
    }

    const fetchPolyline = async () => {
      try {
        let fullPath = [];
        for (let i = 0; i < selectedRoute.stops.length - 1; i++) {
          const startStop = selectedRoute.stops[i];
          const endStop = selectedRoute.stops[i + 1];
          const startLat = startStop.lat, startLng = startStop.lng;
          const destLat  = endStop.lat,  destLng  = endStop.lng;

          if (roadRouting) {
            try {
              const data = await getDirections(startLat, startLng, destLat, destLng);
              if (data.routes && data.routes.length > 0) {
                const encoded = data.routes[0].overview_polyline;
                if (encoded) {
                  const decoded = decodePolyline(encoded);
                  if (decoded.length > 0) {
                    decoded.unshift([startLng, startLat]);
                    decoded.push([destLng, destLat]);
                    if (fullPath.length > 0) fullPath.pop();
                    fullPath = [...fullPath, ...decoded];
                    continue;
                  }
                }
              }
            } catch (legErr) {
              console.warn(`Leg directions failed from ${startStop.name} to ${endStop.name}:`, legErr);
            }
          }

          // Fallback: straight line
          const fallbackLeg = [[startLng, startLat], [destLng, destLat]];
          if (fullPath.length > 0) fullPath.pop();
          fullPath = [...fullPath, ...fallbackLeg];
        }
        setStaticPolyline(fullPath);

        // Section 3: Stop Integration Validation (within 50 meters)
        selectedRoute.stops.forEach((stop) => {
          let minDistance = Infinity;
          fullPath.forEach(pt => {
            const lat1 = stop.latitude;
            const lng1 = stop.longitude;
            const lat2 = pt[1];
            const lng2 = pt[0];

            const R = 6371000; // meters
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLng = (lng2 - lng1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.sin(dLng/2) * Math.sin(dLng/2) * Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const d = R * c;
            if (d < minDistance) {
              minDistance = d;
            }
          });

          if (minDistance > 50) {
            throw new Error("Stop not aligned with route");
          }
        });

      } catch (err) {
        console.error('Failed to fetch route polyline:', err);
      }
    };

    fetchPolyline();
  }, [selectedRoute, roadRouting]);

  // Dynamically slice and stitch polyline starting from current busPosition (or stops[0] when idle)
  // Reused EXACTLY from Student Portal (LiveMapPage.jsx)
  const polyline = useMemo(() => {
    if (!staticPolyline) return null;
    if (!tripStarted || !busPosition) return staticPolyline;

    const busLng = parseFloat(busPosition.longitude);
    const busLat = parseFloat(busPosition.latitude);

    let minDistance = Infinity;
    let closestIndex = 0;
    for (let i = 0; i < staticPolyline.length; i++) {
      const dx = staticPolyline[i][0] - busLng;
      const dy = staticPolyline[i][1] - busLat;
      const distance = dx * dx + dy * dy;
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    return [
      [busLng, busLat],
      ...staticPolyline.slice(closestIndex)
    ];
  }, [staticPolyline, busPosition, tripStarted]);

  // ─── 3. Sync selectedRouteId to localStorage ───
  useEffect(() => {
    if (selectedRouteId) {
      localStorage.setItem('driver_selected_route_id', selectedRouteId);
    } else {
      localStorage.removeItem('driver_selected_route_id');
    }
  }, [selectedRouteId]);

  // ─── 4. Geolocation sharing hook ───
  const { gpsStatus, dbStatus, dbErrorMsg, startSharing, stopSharing, currentPosition } = useLocationSharing(
    selectedRouteId,
    user?.$id || '',
    simulateMode,
    roadRouting
  );

  const isSharing = gpsStatus === 'online' || gpsStatus === 'connecting';

  // Section 5: Start Sharing Location GPS Updates
  useEffect(() => {
    if (tripStarted && currentPosition?.latitude && currentPosition?.longitude) {
      setBusPosition({
        lat: currentPosition.latitude,
        lng: currentPosition.longitude,
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude
      });
    }
  }, [currentPosition, tripStarted]);

  // ─── 8. Stop sharing on unmount ───
  useEffect(() => {
    return () => {
      stopSharing();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── 9. Handle Start/Stop Trip ───
  const handleToggleSharing = async () => {
    if (isSharing) {
      await stopSharing();
      setTripStarted(false);
    } else {
      if (!selectedRouteId) {
        alert('Please select a route before starting.');
        return;
      }
      setTripStarted(true);
      await startSharing();
    }
  };

  // ─── 10. Stop markers for MapView ───
  const stopMarkers = stops && Array.isArray(stops)
    ? stops.map((stop) => ({
        lat: stop?.lat,
        lng: stop?.lng,
        name: stop?.name,
        isHighlighted: false,
      }))
    : [];

  // ─── 11. Map Center ───
  // When trip is idle: center on first stop of selected route.
  // When trip active + GPS: center on bus position.
  const mapCenter = useMemo(() => {
    if (!busPosition) {
      return [77.5946, 12.9716]; // Bangalore default
    }
    return [busPosition.lng, busPosition.lat];
  }, [busPosition]);



  return (
    <>
      {/* Background overlay */}
      <div className="main-bg-overlay fixed inset-0 pointer-events-none -z-10" />

      <div className="min-h-screen bg-background">
        {/* HEADER SECTION */}
        <section className="relative px-6 md:px-12 lg:px-20 pt-12 pb-6 animate-fadeInUp">
          <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="secondary-gradient text-on-secondary px-4 py-1.5 rounded-xl font-label-bold text-[11px] uppercase tracking-widest shadow-lg shadow-secondary/20">
                  <span className="material-symbols-outlined text-[14px] align-middle mr-1">
                    airline_seat_recline_extra
                  </span>
                  Driver Portal
                </span>
                <span className="font-label-md text-label-md text-on-surface-variant tracking-wide">
                  BUS CONSOLE
                </span>
              </div>
              <h1 className="font-display-lg text-display-lg text-primary mb-3">
                {isDashboardTab ? "Driver Dashboard Console" : "Live Location Broadcaster"}
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-2xl leading-relaxed">
                {isDashboardTab 
                  ? "Welcome to your console. Review active schedules, configure your bus route, and monitor connection metrics." 
                  : "Start sharing your GPS location so students can track your bus in real-time. Keep the screen active and geolocation allowed."}
              </p>
            </div>

            {/* Quick status card */}
            <div className="glass-card rounded-2xl p-4 flex items-center gap-4 border border-outline-variant/20 shrink-0">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isSharing ? 'secondary-gradient text-white animate-ripple' : 'bg-surface-variant/40 text-on-surface-variant'}`}>
                <span className="material-symbols-outlined text-[24px]">
                  {isSharing ? 'sensors' : 'sensors_off'}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-on-surface-variant font-label-bold uppercase tracking-widest">
                  Status
                </p>
                <p className="font-title-md font-bold text-primary">
                  {gpsStatus === 'online' ? 'BROADCASTING' : gpsStatus === 'connecting' ? 'CONNECTING...' : 'OFFLINE'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN DASHBOARD */}
        <section className="px-6 md:px-12 lg:px-20 pb-20 animate-fadeInUp stagger-1">
          <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN: CONTROLS & TIMELINE */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* === DASHBOARD TAB === */}
              {isDashboardTab && (
                <div className="space-y-6">
                  {/* Driver Info Card */}
                  <div className="glass-card rounded-[24px] p-6 space-y-4">
                    <h2 className="font-title-md text-title-md text-primary font-bold">Driver Profile</h2>
                    <div className="flex items-center gap-4 bg-primary/5 rounded-2xl p-4">
                      <div className="w-12 h-12 rounded-xl premium-gradient text-white flex items-center justify-center font-bold text-lg">
                        {user?.name?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <p className="font-label-bold text-primary">{user?.name || "Driver"}</p>
                        <p className="text-xs text-on-surface-variant">{user?.email}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-on-surface-variant">
                      <div className="flex justify-between py-1 border-b border-outline-variant/10">
                        <span>Role</span>
                        <span className="font-label-bold text-primary">Certified Operator</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-outline-variant/10">
                        <span>Bus Assignment</span>
                        <span className="font-label-bold text-primary">{user?.prefs?.busNumber || "Bus #1"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Route Selection Summary */}
                  <div className="glass-card rounded-[24px] p-6 space-y-4">
                    <h2 className="font-title-md text-title-md text-primary font-bold">Selected Route</h2>
                    {selectedRoute ? (
                      <div className="space-y-4">
                        <div className="bg-secondary/5 border border-secondary/15 rounded-2xl p-4">
                          <p className="text-xs font-label-bold text-secondary uppercase tracking-wider">{selectedRoute.code}</p>
                          <p className="font-title-md font-bold text-primary mt-1">{selectedRoute.name}</p>
                          <p className="text-xs text-on-surface-variant mt-1">{selectedRoute.stops.length} stops • Shift: {selectedRoute.shift}</p>
                        </div>
                        <Link
                          to="/driver/route"
                          className="w-full secondary-gradient text-on-secondary py-3.5 rounded-xl font-label-bold text-xs flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-lg shadow-secondary/20 active:scale-95 text-center inline-flex justify-center"
                        >
                          <span className="material-symbols-outlined text-[16px]">share_location</span>
                          GO TO BROADCAST CONSOLE
                        </Link>
                      </div>
                    ) : (
                      <div className="text-center py-6 space-y-3">
                        <span className="material-symbols-outlined text-[36px] text-on-surface-variant/40 block">warning</span>
                        <p className="text-sm font-label-bold text-primary">No Route Selected</p>
                        <p className="text-xs text-on-surface-variant">Please configure your route before sharing your location.</p>
                        <Link
                          to="/driver/route"
                          className="w-full premium-gradient text-on-primary py-3 rounded-xl font-label-bold text-xs hover:shadow-lg transition-all inline-block"
                        >
                          Select Route
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Driver Checklist Card */}
                  <div className="glass-card rounded-[24px] p-6 space-y-4">
                    <h2 className="font-title-md text-title-md text-primary font-bold">Console Checklist</h2>
                    <ul className="space-y-2 text-xs text-on-surface-variant">
                      <li className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-green-600 text-[18px]">check_circle</span>
                        Verify GPS permission is allowed
                      </li>
                      <li className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-green-600 text-[18px]">check_circle</span>
                        Connect to Appwrite server
                      </li>
                      <li className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-green-600 text-[18px]">check_circle</span>
                        Select active route code
                      </li>
                      <li className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-on-surface-variant/40 text-[18px]">radio_button_unchecked</span>
                        Keep screen awake while driving
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* === MY ROUTE CONTROL TAB === */}
              {isRouteTab && (
                <div className="space-y-6">
                  {/* Route Selection Card */}
                  <div className="glass-card rounded-[24px] p-6 space-y-4">
                    <h2 className="font-title-md text-title-md text-primary font-bold">1. Select Your Route</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Pick the route you are driving today. This determines which bus path and stops students see.
                    </p>
                    
                    {/* Trip Type Selector */}
                    <div className="space-y-2">
                      <label className="font-label-bold text-xs text-primary uppercase tracking-wide">Trip Type</label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setTripType('morning')}
                          disabled={isSharing}
                          className={`flex-1 py-3 px-4 rounded-xl font-label-bold text-xs flex items-center justify-center gap-2 border transition-all duration-300 ${
                            tripType === 'morning'
                              ? 'secondary-gradient text-white border-transparent shadow-lg shadow-secondary/20 font-bold'
                              : 'bg-white/50 border-outline-variant/30 text-on-surface-variant hover:bg-white hover:text-primary'
                          } ${isSharing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span>🌅</span> Morning
                        </button>
                        <button
                          type="button"
                          onClick={() => setTripType('evening')}
                          disabled={isSharing}
                          className={`flex-1 py-3 px-4 rounded-xl font-label-bold text-xs flex items-center justify-center gap-2 border transition-all duration-300 ${
                            tripType === 'evening'
                              ? 'secondary-gradient text-white border-transparent shadow-lg shadow-secondary/20 font-bold'
                              : 'bg-white/50 border-outline-variant/30 text-on-surface-variant hover:bg-white hover:text-primary'
                          } ${isSharing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span>🌙</span> Evening
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="font-label-bold text-xs text-primary uppercase tracking-wide">Route</label>
                      <div className="relative">
                        <select
                          value={selectedRouteId}
                          onChange={(e) => setSelectedRouteId(e.target.value)}
                          disabled={isSharing}
                          className="w-full bg-white/70 border border-outline-variant/30 rounded-xl px-4 py-3.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                        >
                          <option value="">Select a route</option>
                          {dbRoutes
                            .filter((r) => r.tripType === tripType)
                            .map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.code} — {r.name}
                              </option>
                            ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                          expand_more
                        </span>
                      </div>
                    </div>

                    {/* Bus Timing Section */}
                    {selectedRoute && (
                      <div className="space-y-2 pt-1 animate-fadeInUp">
                        <label className="font-label-bold text-xs text-primary uppercase tracking-wide">Bus Timing</label>
                        <div className="flex flex-wrap gap-2">
                          {availableTimings.map((time) => (
                            <button
                              key={time}
                              type="button"
                              onClick={() => setSelectedTiming(time)}
                              disabled={isSharing}
                              className={`px-4 py-2.5 rounded-xl font-label-bold text-xs flex items-center gap-1.5 border transition-all duration-300 ${
                                selectedTiming === time
                                  ? 'bg-primary text-white border-primary shadow-md'
                                  : 'bg-white/50 border-outline-variant/30 text-on-surface-variant hover:bg-white hover:text-primary'
                              } ${isSharing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <span className="material-symbols-outlined text-[16px]">schedule</span>
                              {time}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {isSharing && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-800 rounded-xl p-3 flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-[20px] text-yellow-600 shrink-0">warning</span>
                        <span className="text-[12px] leading-relaxed">
                          You cannot change the route while broadcasting. Stop sharing first to modify route selection.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Geolocation Controls Card */}
                  <div className="glass-card rounded-[24px] p-6 space-y-5">
                    <h2 className="font-title-md text-title-md text-primary font-bold">2. Location Broadcast</h2>
                    
                    {gpsStatus === 'permission-denied' && (
                      <div className="bg-error/10 border border-error/20 text-error rounded-xl p-4 flex items-start gap-3">
                        <span className="material-symbols-outlined text-[20px] text-error shrink-0">error</span>
                        <div>
                          <p className="font-label-bold text-sm">Permission Denied</p>
                          <p className="text-[12px] opacity-90 mt-0.5">Please allow location access in your browser settings to broadcast your GPS.</p>
                        </div>
                      </div>
                    )}
                    {gpsStatus === 'timeout' && (
                      <div className="bg-error/10 border border-error/20 text-error rounded-xl p-4 flex items-start gap-3">
                        <span className="material-symbols-outlined text-[20px] text-error shrink-0">error</span>
                        <div>
                          <p className="font-label-bold text-sm">Timeout Expired</p>
                          <p className="text-[12px] opacity-90 mt-0.5">The device took too long to lock onto GPS satellites. Please try again outside.</p>
                        </div>
                      </div>
                    )}
                    {dbStatus === 'failed' && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-800 rounded-xl p-4 flex items-start gap-3">
                        <span className="material-symbols-outlined text-[20px] text-yellow-600 shrink-0">cloud_off</span>
                        <div>
                          <p className="font-label-bold text-sm">Database Sync Failed</p>
                          <p className="text-[12px] opacity-90 mt-0.5">Your location is accurate on your device but failing to sync to the server.</p>
                          {dbErrorMsg && <p className="text-[11px] font-mono mt-1 opacity-75">{dbErrorMsg}</p>}
                        </div>
                      </div>
                    )}

                    {/* Simulation Mode Toggle */}
                    <div className="flex items-center gap-3 bg-primary/5 rounded-2xl p-4 border border-outline-variant/10">
                      <input
                        type="checkbox"
                        id="simulateRoute"
                        checked={simulateMode}
                        onChange={(e) => setSimulateMode(e.target.checked)}
                        disabled={isSharing}
                        className="w-4 h-4 text-secondary border-outline-variant/30 focus:ring-secondary rounded cursor-pointer"
                      />
                      <label htmlFor="simulateRoute" className="font-label-bold text-[13px] text-primary cursor-pointer select-none flex-1">
                        Simulate Bus Movement (Demo Mode)
                      </label>
                    </div>

                    {/* Big Broadcaster Toggle */}
                    <button
                      onClick={handleToggleSharing}
                      className={`w-full py-5 rounded-2xl font-label-bold text-label-bold flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.98] ${
                        gpsStatus === 'online'
                          ? 'bg-red-600 text-white shadow-red-600/20 hover:bg-red-700 alarm-active'
                          : gpsStatus === 'connecting'
                          ? 'bg-surface-variant/80 text-on-surface-variant cursor-wait shadow-none animate-pulse'
                          : 'secondary-gradient text-on-secondary shadow-secondary/20 hover:opacity-95'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[24px]">
                        {gpsStatus === 'online' ? 'sports_score' : gpsStatus === 'connecting' ? 'hourglass_empty' : 'play_arrow'}
                      </span>
                      {gpsStatus === 'online' ? 'STOP TRIP' : gpsStatus === 'connecting' ? 'CONNECTING...' : 'START TRIP'}
                    </button>

                    {/* Stats Panel */}
                    {gpsStatus === 'online' && currentPosition && (
                      <div className="grid grid-cols-2 gap-4 pt-2 animate-fadeInUp">
                        <div className="bg-primary/5 rounded-xl p-3.5 border border-primary/5">
                          <p className="text-[10px] text-on-surface-variant font-label-bold uppercase tracking-widest">
                            Current Speed
                          </p>
                          <p className="font-title-md font-bold text-primary mt-1">
                            {currentPosition.speed ? Math.round(currentPosition.speed * 3.6) : 0} <span className="text-xs font-normal">km/h</span>
                          </p>
                        </div>
                        <div className="bg-primary/5 rounded-xl p-3.5 border border-primary/5">
                          <p className="text-[10px] text-on-surface-variant font-label-bold uppercase tracking-widest">
                            Heading
                          </p>
                          <p className="font-title-md font-bold text-primary mt-1">
                            {currentPosition.heading ? Math.round(currentPosition.heading) : 0}°
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="text-center">
                      <p className="text-[11px] text-on-surface-variant opacity-75">
                        {gpsStatus === 'online'
                          ? 'GPS active. Transmitting location.'
                          : 'Select a route and press start to begin transmission.'}
                      </p>
                    </div>
                  </div>

                  {/* Route Timeline (Only shown if route selected) */}
                  {selectedRoute && (
                    <div className="animate-fadeInUp">
                      <RouteTimeline route={selectedRoute} busPosition={busPosition} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: MAP VIEW */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Map Card */}
              <div className="glass-card rounded-[32px] p-4 flex flex-col h-[600px] md:h-[650px] relative overflow-hidden">
                <div className="px-4 py-2 flex items-center justify-between z-10">
                  <div>
                    <h3 className="font-title-md text-primary font-bold">
                      {selectedRoute ? selectedRoute.name : 'Vitals Map'}
                    </h3>
                    <p className="text-[12px] text-on-surface-variant mt-0.5">
                      {isSharing ? 'Live position is broadcasting on route path' : 'Map preview'}
                    </p>
                  </div>
                  {gpsStatus === 'online' && (
                    <span className="flex items-center gap-1.5 bg-green-500/10 text-green-700 px-3 py-1 rounded-full text-xs font-bold live-indicator">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Live Feed
                    </span>
                  )}
                </div>

                <div className="flex-1 rounded-[24px] overflow-hidden mt-3 relative">
                  {mapCenter && Array.isArray(mapCenter) && mapCenter.length === 2 ? (
                    <>
                      <MapView
                        center={mapCenter}
                        zoom={13}
                        markers={stopMarkers}
                        routePolyline={polyline}
                        busPosition={busPosition}
                        isLive={tripStarted}
                        routeColor="#fc6c29"
                        routeWidth={5}
                        className="w-full h-full"
                      />
                      
                      {/* Floating Road Routing Toggle */}
                      <div className="absolute top-4 right-4 z-10 pointer-events-auto">
                        <button
                          onClick={() => setRoadRouting(!roadRouting)}
                          disabled={isSharing}
                          className={`glass-card px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-lg transition-all text-[11px] font-label-bold ${
                            isSharing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white active:scale-95'
                          } ${
                            roadRouting ? 'text-secondary border border-secondary/20' : 'text-on-surface-variant'
                          }`}
                          title={isSharing ? "Stop broadcasting to toggle routing mode" : "Toggle Road Routing / Straight Lines"}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {roadRouting ? 'route' : 'timeline'}
                          </span>
                          <span>{roadRouting ? 'Road Routing' : 'Straight Lines'}</span>
                        </button>
                      </div>

                      {/* Glassmorphic loading overlay until valid GPS coordinates are fetched */}
                      {isSharing && !currentPosition && (
                        <div className="absolute inset-0 bg-primary/20 backdrop-blur-md z-20 flex flex-col items-center justify-center text-center p-6 transition-all duration-300">
                          <div className="spinner mb-4 border-t-secondary" />
                          <p className="font-title-md font-bold text-primary">Fetching current location...</p>
                          <p className="font-body-sm text-on-surface-variant mt-1 max-w-[280px] leading-relaxed">
                            Locking onto GPS satellites. Please wait while we initialize your coordinates.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-variant/20 rounded-[24px]">
                      <p className="text-on-surface-variant font-label-md">Waiting for route data...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </section>
      </div>
    </>
  );
}

export default function DriverDashboard() {
  return (
    <DriverDashboardErrorBoundary>
      <DriverDashboardContent />
    </DriverDashboardErrorBoundary>
  );
}
