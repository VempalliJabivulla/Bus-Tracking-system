import { useState, useMemo, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SEED_ROUTES, calculateDistance } from '../lib/constants';
import { useAllLiveLocations } from '../hooks/useRealtime';
import RouteCard from '../components/RouteCard';
import RouteTimeline from '../components/RouteTimeline';
import MapView from '../components/MapView';
import { databases, DATABASE_ID, COLLECTIONS, Query } from '../lib/appwrite';

const PLANNER_STOPS = [
  { name: 'Banashankari', lat: 12.9255, lng: 77.5468 },
  { name: 'Bommanahalli', lat: 12.9003, lng: 77.6180 },
  { name: 'Domlur', lat: 12.9614, lng: 77.6387 },
  { name: 'Electronic City Phase 1', lat: 12.8452, lng: 77.6602 },
  { name: 'Jain University', lat: 12.6424, lng: 77.4394 },
  { name: 'Hebbal Main Stand', lat: 13.0358, lng: 77.5970 },
  { name: 'HSR Layout', lat: 12.9121, lng: 77.6446 },
  { name: 'Indiranagar 100ft Rd', lat: 12.9784, lng: 77.6408 },
  { name: 'Jayanagar', lat: 12.9279, lng: 77.5937 },
  { name: 'JP Nagar', lat: 12.9063, lng: 77.5857 },
  { name: 'Koramangala', lat: 12.9352, lng: 77.6245 },
  { name: 'Kundalahalli', lat: 12.9628, lng: 77.7228 },
  { name: 'Manyata Tech Park', lat: 13.0474, lng: 77.6212 },
  { name: 'Marathahalli', lat: 12.9591, lng: 77.6971 },
  { name: 'Silk Board', lat: 12.9177, lng: 77.6238 },
  { name: 'Tin Factory', lat: 13.0067, lng: 77.6510 },
  { name: 'Whitefield', lat: 12.9698, lng: 77.7500 },
  { name: 'Yelahanka', lat: 13.1007, lng: 77.5963 },
];

export default function StudentDashboard() {
  const [shift, setShift] = useState('morning');
  const [searchQuery, setSearchQuery] = useState('');
  const { allLocations, isConnected, error: dbError } = useAllLiveLocations();
  const location = useLocation();
  const { userRoute, userStop, user } = useAuth();

  const [dbRoutes, setDbRoutes] = useState([]);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
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
          stops: typeof doc.stops === 'string' ? JSON.parse(doc.stops) : doc.stops,
          originCoords: typeof doc.originCoords === 'string' ? JSON.parse(doc.originCoords) : doc.originCoords,
          destinationCoords: typeof doc.destinationCoords === 'string' ? JSON.parse(doc.destinationCoords) : doc.destinationCoords,
          status: doc.status
        }));
        setDbRoutes(formatted);
      } catch (err) {
        console.warn("Using static SEED_ROUTES fallback for student dashboard:", err);
        setDbRoutes(SEED_ROUTES);
      }
    };
    fetchRoutes();
  }, []);

  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => console.warn('User location error:', err),
      { enableHighAccuracy: true }
    );
  }, []);

  const isSchedulesTab = location.pathname === '/student/schedules';
  const isRoutesTab = location.pathname === '/student/routes';
  const isPlannerTab = location.pathname === '/student/planner';
  const isDashboardTab = location.pathname === '/student' || (!isSchedulesTab && !isRoutesTab && !isPlannerTab);

  // Custom Route Planner States
  const [plannerStops, setPlannerStops] = useState(['', '']);

  const handlePlannerStopChange = (index, value) => {
    const updated = [...plannerStops];
    updated[index] = value;
    setPlannerStops(updated);
  };

  const addPlannerStop = () => {
    setPlannerStops([...plannerStops, '']);
  };

  const removePlannerStop = (index) => {
    if (plannerStops.length <= 2) return;
    const updated = [...plannerStops];
    updated.splice(index, 1);
    setPlannerStops(updated);
  };

  const resetPlanner = () => {
    setPlannerStops(['', '']);
  };

  const plannerPolyline = useMemo(() => {
    // Both stops must be selected to render the connection
    const coordinates = plannerStops
      .map((name) => {
        const stop = PLANNER_STOPS.find((s) => s.name === name);
        return stop ? [stop.lng, stop.lat] : null;
      })
      .filter(Boolean);

    // If any select box is not selected yet, or less than 2 valid coordinates, do not render connection
    const allFilled = plannerStops.every((name) => name !== '');
    if (!allFilled || coordinates.length < 2) return null;

    return coordinates;
  }, [plannerStops]);

  const plannerMarkers = useMemo(() => {
    return plannerStops
      .map((name) => {
        const stop = PLANNER_STOPS.find((s) => s.name === name);
        return stop ? { lat: stop.lat, lng: stop.lng, name: stop.name, isHighlighted: true } : null;
      })
      .filter(Boolean);
  }, [plannerStops]);

  const plannerMapCenter = useMemo(() => {
    if (plannerMarkers.length > 0) {
      return [plannerMarkers[0].lng, plannerMarkers[0].lat];
    }
    return [77.5946, 12.9716]; // Bangalore
  }, [plannerMarkers]);

  // Build a routeId → live location lookup map
  const liveLocationMap = useMemo(() => {
    const map = {};
    allLocations.forEach((loc) => {
      map[loc.routeId] = loc;
    });
    return map;
  }, [allLocations]);

  // Filter routes by shift and search query
  const filteredRoutes = useMemo(() => {
    return dbRoutes.filter((route) => {
      const matchesShift = route.shift === shift;
      if (!searchQuery.trim()) return matchesShift;

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        route.name.toLowerCase().includes(q) ||
        route.code.toLowerCase().includes(q) ||
        route.origin.toLowerCase().includes(q) ||
        route.destination.toLowerCase().includes(q) ||
        route.stops.some((stop) => stop.name.toLowerCase().includes(q));

      return matchesShift && matchesSearch;
    });
  }, [dbRoutes, shift, searchQuery]);

  // Find preferred route details
  const preferredRoute = useMemo(() => {
    return dbRoutes.find((r) => r.id === userRoute) || null;
  }, [dbRoutes, userRoute]);

  const distanceToPreferredBus = useMemo(() => {
    if (!userLocation || !preferredRoute) return null;
    const liveBus = liveLocationMap[preferredRoute.id];
    if (!liveBus) return null;
    return calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      liveBus.lat,
      liveBus.lng
    );
  }, [userLocation, preferredRoute, liveLocationMap]);

  // Pick the active route for the timeline sidebar
  const timelineRoute = useMemo(() => {
    if (isDashboardTab && preferredRoute) return preferredRoute;
    return (
      filteredRoutes.find((r) => r.status === 'active') || filteredRoutes[0]
    );
  }, [filteredRoutes, isDashboardTab, preferredRoute]);

  // Get live position for the timeline route (if any)
  const timelineBusPosition = timelineRoute
    ? liveLocationMap[timelineRoute.id] ?? null
    : null;

  return (
    <>
      {/* ── Background overlay ── */}
      <div className="main-bg-overlay fixed inset-0 pointer-events-none -z-10" />

      <div className="min-h-screen bg-background">
        {/* ══════════════════════════════════════════════
            HEADER SECTION
        ══════════════════════════════════════════════ */}
        <section className="relative px-6 md:px-12 lg:px-20 pt-12 pb-6 animate-fadeInUp">
          <div className="max-w-[1600px] mx-auto">
            {/* Top badges */}
            <div className="flex items-center gap-3 mb-4">
              <span className="premium-gradient text-on-primary px-4 py-1.5 rounded-xl font-label-bold text-[11px] uppercase tracking-widest shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-[14px] align-middle mr-1">
                  school
                </span>
                FET Branch
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant tracking-wide">
                JAIN UNIVERSITY
              </span>
            </div>

            {/* Title */}
            <h1 className="font-display-lg text-display-lg text-primary mb-3">
              {isDashboardTab && `Welcome Back, ${user?.name || 'Student'}`}
              {isRoutesTab && "Routes & Schedules"}
              {isSchedulesTab && "Campus Timetable"}
              {isPlannerTab && "Custom Route Planner"}
            </h1>

            {/* Subtitle */}
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-2xl leading-relaxed">
              {isDashboardTab && "Quick summary of campus shuttle service, live feeds, and preferred route tracking."}
              {isRoutesTab && "Track campus transit buses in real-time. View live locations, estimated arrivals, and set proximity alerts for your stop."}
              {isSchedulesTab && "Find complete timings, shift schedules, and designated stop sequences for Jain University campus buses."}
              {isPlannerTab && "Connect stops sequentially with a smooth blue route polyline. Specify stops below to visualize connections instantly."}
            </p>

            {/* Database Setup Banner */}
            {dbError && (
              <div className="mt-6 bg-amber-500/10 border border-amber-500/25 text-amber-900 rounded-[24px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fadeInUp">
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-700 shrink-0">
                    <span className="material-symbols-outlined text-[28px]">database_alert</span>
                  </div>
                  <div>
                    <h3 className="font-title-md text-amber-950 font-bold text-base leading-tight">Appwrite Backend Setup Required</h3>
                    <p className="font-body-sm text-amber-900/80 text-sm mt-1 max-w-xl leading-relaxed">
                      Your Appwrite database <b>campus_transit</b> or collection <b>live_locations</b> could not be found. Run the setup script in your terminal to configure the backend:
                    </p>
                    <div className="mt-2.5 flex items-center gap-2 font-mono text-xs bg-black/5 px-3 py-1.5 rounded-lg w-fit text-amber-950">
                      node scripts/init-appwrite.js
                    </div>
                  </div>
                </div>
                <div className="text-sm text-amber-900 font-label-bold shrink-0">
                  <span className="bg-amber-500 text-white px-4 py-2.5 rounded-xl block text-center shadow-lg shadow-amber-500/15">
                    Check Console Logs
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            FILTERS SECTION
        ══════════════════════════════════════════════ */}
        {(isRoutesTab || isSchedulesTab) && (
          <section className="px-6 md:px-12 lg:px-20 pb-6 animate-fadeInUp stagger-1">
            <div className="max-w-[1600px] mx-auto">
              <div className="glass-card rounded-3xl p-5 md:p-6 flex flex-col md:flex-row items-center gap-4">
                {/* Shift toggle */}
                <div className="flex bg-surface-variant/60 rounded-2xl p-1.5 gap-1">
                  <button
                    onClick={() => setShift('morning')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-label-bold text-label-bold transition-all ${
                      shift === 'morning'
                        ? 'premium-gradient text-on-primary shadow-lg shadow-primary/20'
                        : 'text-on-surface-variant hover:bg-white/60'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      wb_sunny
                    </span>
                    Morning
                  </button>
                  <button
                    onClick={() => setShift('evening')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-label-bold text-label-bold transition-all ${
                      shift === 'evening'
                        ? 'premium-gradient text-on-primary shadow-lg shadow-primary/20'
                        : 'text-on-surface-variant hover:bg-white/60'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      dark_mode
                    </span>
                    Evening
                  </button>
                </div>

                {/* Search input */}
                <div className="relative flex-1 w-full md:w-auto">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[22px]">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search routes, stops, or areas…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/60 border border-outline-variant/20 rounded-2xl pl-12 pr-5 py-3.5 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                  />
                </div>

                {/* Live connection indicator */}
                <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md shrink-0">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-green-500 live-indicator' : 'bg-gray-400'
                    }`}
                  />
                  {isConnected ? 'Live Connected' : 'Connecting…'}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════
            ROUTES GRID / DASHBOARD / TIMETABLE
        ══════════════════════════════════════════════ */}
        <section className="px-6 md:px-12 lg:px-20 pb-20 animate-fadeInUp stagger-2">
          <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            {isPlannerTab ? (
              <>
                {/* ── Planner Control Panel (Left Col, 1 col width) ── */}
                <div className="space-y-6 animate-fadeInUp">
                  <div className="glass-card rounded-[32px] p-6 space-y-6">
                    <div>
                      <h2 className="font-title-md text-primary font-bold">Route Planner</h2>
                      <p className="font-body-sm text-on-surface-variant mt-1">
                        Select stops to generate a direct connection polyline.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {plannerStops.map((stop, index) => (
                        <div key={index} className="space-y-2 animate-fadeInUp">
                          <div className="flex items-center justify-between pl-1">
                            <label className="font-label-bold text-xs text-primary uppercase tracking-wide">
                              {index === 0 ? 'Start Stop' : index === plannerStops.length - 1 ? 'End Stop' : `Stop ${index + 1}`}
                            </label>
                            {plannerStops.length > 2 && (
                              <button
                                onClick={() => removePlannerStop(index)}
                                className="text-error hover:text-red-700 text-xs font-label-bold flex items-center gap-0.5"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[14px]">delete</span>
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="relative">
                            <select
                              value={stop}
                              onChange={(e) => handlePlannerStopChange(index, e.target.value)}
                              className="w-full bg-white/70 border border-outline-variant/30 rounded-xl px-4 py-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                            >
                              <option value="">Select a stop</option>
                              {PLANNER_STOPS.map((s) => (
                                <option key={s.name} value={s.name}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                              expand_more
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={addPlannerStop}
                        className="flex-1 bg-primary/5 hover:bg-primary/10 text-primary py-3 rounded-xl font-label-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Add Stop
                      </button>
                      
                      <button
                        onClick={resetPlanner}
                        className="px-4 bg-outline-variant/10 hover:bg-outline-variant/20 text-on-surface-variant py-3 rounded-xl font-label-bold text-xs flex items-center justify-center gap-1 transition-all"
                        type="button"
                      >
                        Reset
                      </button>
                    </div>

                    {plannerPolyline && (
                      <div className="bg-blue-500/5 border border-blue-500/10 text-blue-900 rounded-2xl p-4 space-y-2.5 animate-fadeInUp">
                        <div className="flex gap-2.5 items-start">
                          <span className="material-symbols-outlined text-[20px] text-blue-600 shrink-0 mt-0.5">info</span>
                          <div>
                            <p className="font-label-bold text-xs text-blue-950">Active Route Connection</p>
                            <p className="text-[11px] leading-relaxed mt-0.5">
                              Connected {plannerStops.filter(Boolean).join(" → ")} as a straight-line polyline.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Planner Map (Right Col, 2 col width) ── */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="glass-card rounded-[32px] p-4 flex flex-col h-[550px] md:h-[600px] relative overflow-hidden animate-scaleIn">
                    <div className="px-4 py-2 flex items-center justify-between z-10">
                      <div>
                        <h3 className="font-title-md text-primary font-bold">Planner Preview Map</h3>
                        <p className="text-[12px] text-on-surface-variant mt-0.5">
                          Unsnapped straight-line visualization.
                        </p>
                      </div>
                      {plannerPolyline ? (
                        <span className="flex items-center gap-1.5 bg-blue-500/10 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          Polyline Active
                        </span>
                      ) : (
                        <span className="text-xs text-on-surface-variant bg-surface-variant/40 px-3 py-1 rounded-full font-label-md">
                          Select at least two stops
                        </span>
                      )}
                    </div>

                    <div className="flex-1 rounded-[24px] overflow-hidden mt-3 relative">
                      <MapView
                        center={plannerMapCenter}
                        zoom={12}
                        markers={plannerMarkers}
                        routePolyline={plannerPolyline}
                        routeColor="#0070f3" // Smooth blue route line
                        routeWidth={5}       // Width of 5px
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* ── Left Column: Main View depending on active tab ── */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* === DASHBOARD TAB VIEW === */}
                  {isDashboardTab && (
                    <div className="space-y-6">
                      {/* Summary Stats Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="glass-card rounded-[24px] p-5 flex items-center gap-4 animate-scaleIn">
                          <div className="w-12 h-12 rounded-2xl premium-gradient text-white flex items-center justify-center">
                            <span className="material-symbols-outlined">map</span>
                          </div>
                          <div>
                            <p className="text-[10px] text-on-surface-variant font-label-bold uppercase tracking-wider">Total Routes</p>
                            <p className="font-title-md font-bold text-primary">{SEED_ROUTES.length}</p>
                          </div>
                        </div>
                        
                        <div className="glass-card rounded-[24px] p-5 flex items-center gap-4 animate-scaleIn stagger-1">
                          <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-700 flex items-center justify-center">
                            <span className="material-symbols-outlined live-indicator">sensors</span>
                          </div>
                          <div>
                            <p className="text-[10px] text-on-surface-variant font-label-bold uppercase tracking-wider">Buses Live</p>
                            <p className="font-title-md font-bold text-green-700">{allLocations.length}</p>
                          </div>
                        </div>

                        <div className="glass-card rounded-[24px] p-5 flex items-center gap-4 animate-scaleIn stagger-2">
                          <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center">
                            <span className="material-symbols-outlined">schedule</span>
                          </div>
                          <div>
                            <p className="text-[10px] text-on-surface-variant font-label-bold uppercase tracking-wider">Preferred Stop</p>
                            <p className="font-title-md font-bold text-primary truncate max-w-[120px]">{userStop || "Not Selected"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Preferred Bus Status Card */}
                      <div className="glass-card rounded-[32px] p-6 space-y-5 border border-outline-variant/10 animate-fadeInUp">
                        <div className="flex items-center justify-between">
                          <h3 className="font-title-md text-primary font-bold">Your Preferred Bus</h3>
                          {preferredRoute && (
                            <span className="secondary-gradient text-on-secondary px-3 py-1 rounded-lg font-label-bold text-[10px]">
                              {preferredRoute.code}
                            </span>
                          )}
                        </div>

                        {preferredRoute ? (
                          <div className="space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-primary/5 rounded-[24px] p-5">
                              <div>
                                <p className="font-title-md font-bold text-primary">{preferredRoute.name}</p>
                                <p className="font-body-sm text-on-surface-variant mt-1">
                                  Departure: <span className="font-label-bold text-primary">{preferredRoute.departureTime} {preferredRoute.period}</span> ({preferredRoute.shift} shift)
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {liveLocationMap[preferredRoute.id] ? (
                                  <span className="flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-xs font-bold live-indicator">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    Live Now {distanceToPreferredBus !== null && `• ${distanceToPreferredBus.toFixed(1)} km away`}
                                  </span>
                                ) : (
                                  <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-xs font-bold">
                                    Not Active
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col md:flex-row justify-between gap-4 pt-2">
                              <div className="flex items-center gap-2 text-on-surface-variant">
                                <span className="material-symbols-outlined text-[20px] text-secondary">location_on</span>
                                <span className="font-body-sm text-sm">
                                  Alert Stop: <span className="font-label-bold text-primary">{userStop}</span>
                                </span>
                              </div>

                              <div className="flex gap-3">
                                <Link
                                  to={`/student/live/${preferredRoute.id}`}
                                  className="premium-gradient text-on-primary px-5 py-2.5 rounded-xl font-label-bold text-xs hover:shadow-lg transition-all text-center inline-block"
                                >
                                  Track Live Map
                                </Link>
                                <Link
                                  to="/student/routes"
                                  className="glass-card hover:bg-white text-on-surface-variant px-5 py-2.5 rounded-xl font-label-bold text-xs border border-outline-variant/30 text-center inline-block"
                                >
                                  Change Route
                                </Link>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 space-y-4">
                            <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40 block">
                              wrong_location
                            </span>
                            <div className="space-y-1">
                              <p className="font-title-md text-primary font-bold">No Preferred Route Selected</p>
                              <p className="font-body-sm text-on-surface-variant max-w-md mx-auto">
                                Set up your preferences to view live ETA status and receive proximity notifications directly on your dashboard.
                              </p>
                            </div>
                            <Link
                              to="/student/routes"
                              className="premium-gradient text-on-primary px-6 py-3 rounded-xl font-label-bold text-xs hover:shadow-lg transition-all inline-block"
                            >
                              Select Preferred Route
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* Upcoming Departures list */}
                      <div className="glass-card rounded-[32px] p-6 space-y-4 animate-fadeInUp stagger-1">
                        <h3 className="font-title-md text-primary font-bold">Upcoming Shuttles</h3>
                        <div className="divide-y divide-outline-variant/10">
                          {SEED_ROUTES.slice(0, 3).map((r) => (
                            <div key={r.id} className="py-4 flex items-center justify-between first:pt-0 last:pb-0">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                                  <span className="material-symbols-outlined">directions_bus</span>
                                </div>
                                <div>
                                  <p className="font-label-bold text-primary text-sm">{r.name}</p>
                                  <p className="text-[11px] text-on-surface-variant">{r.origin} to {r.destination}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-title-md font-bold text-primary text-sm">{r.departureTime} {r.period}</p>
                                <p className="text-[10px] text-on-surface-variant font-label-bold uppercase tracking-wide">{r.shift}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* === ROUTES TAB VIEW === */}
                  {isRoutesTab && (
                    <div className="space-y-6">
                      {/* Column header */}
                      <div className="flex items-center justify-between">
                        <h2 className="font-headline-lg text-headline-lg text-primary">
                          Active Fleet Departures
                        </h2>
                        <div className="flex items-center gap-2 text-on-surface-variant/60 font-label-md text-label-md">
                          <span className="material-symbols-outlined text-[18px] animate-spin-slow">
                            sync
                          </span>
                          Last updated just now
                        </div>
                      </div>

                      {/* Route cards list */}
                      {filteredRoutes.length > 0 ? (
                        <div className="space-y-5">
                          {filteredRoutes.map((route, index) => (
                            <div
                              key={route.id}
                              className={`animate-fadeInUp stagger-${Math.min(
                                index + 1,
                                5
                              )}`}
                            >
                              <RouteCard
                                route={route}
                                liveLocation={liveLocationMap[route.id] ?? null}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="glass-card rounded-[32px] p-16 text-center">
                          <span className="material-symbols-outlined text-[64px] text-on-surface-variant/30 mb-4 block">
                            directions_bus
                          </span>
                          <h3 className="font-title-md text-title-md text-primary mb-2">
                            No routes found
                          </h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            {searchQuery
                              ? `No ${shift} routes match "${searchQuery}". Try a different search term.`
                              : `No ${shift} routes are currently scheduled.`}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* === SCHEDULES TAB VIEW === */}
                  {isSchedulesTab && (
                    <div className="glass-card rounded-[32px] p-6 space-y-6 animate-fadeInUp">
                      <h2 className="font-title-md text-title-md text-primary font-bold">TIMETABLE BOARD</h2>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-outline-variant/20 text-on-surface-variant font-label-bold text-xs uppercase tracking-wider">
                              <th className="py-4 px-3">Route</th>
                              <th className="py-4 px-3">Origin / Destination</th>
                              <th className="py-4 px-3">Departs</th>
                              <th className="py-4 px-3">Shift</th>
                              <th className="py-4 px-3 text-right">Stops</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/10 text-sm">
                            {SEED_ROUTES.map((r) => (
                              <tr key={r.id} className="hover:bg-primary/5 transition-colors">
                                <td className="py-4 px-3 font-label-bold text-primary">
                                  <span className="secondary-gradient text-on-secondary px-2.5 py-0.5 rounded-lg font-label-bold text-[10px] inline-block mr-2">
                                    {r.code}
                                  </span>
                                </td>
                                <td className="py-4 px-3">
                                  <div className="font-label-bold text-primary">{r.name}</div>
                                  <div className="text-[11px] text-on-surface-variant mt-0.5">{r.origin} to {r.destination}</div>
                                </td>
                                <td className="py-4 px-3 font-mono font-bold text-primary">{r.departureTime} {r.period}</td>
                                <td className="py-4 px-3">
                                  <span className={`px-2 py-1 rounded-md text-[10px] font-label-bold uppercase ${r.shift === 'morning' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}`}>
                                    {r.shift}
                                  </span>
                                </td>
                                <td className="py-4 px-3 text-right font-label-bold text-primary">{r.stops.length}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Right Column: Feature Card + Timeline (1 col width) ── */}
                <div className="space-y-6">
                  {/* Feature / promo card */}
                  <div className="bg-white rounded-[32px] shadow-xl overflow-hidden animate-fadeInUp stagger-3">
                    {/* Gradient image placeholder */}
                    <div className="relative h-48 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-secondary" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white/20 text-[120px]">
                          directions_bus
                        </span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/50 to-transparent h-16" />
                    </div>

                    {/* Card content */}
                    <div className="p-8 -mt-4 relative z-10">
                      <span className="secondary-gradient text-on-secondary px-3 py-1 rounded-lg font-label-bold text-[10px] uppercase tracking-wider">
                        Campus Transit
                      </span>
                      <h3 className="font-title-md text-title-md text-primary font-bold mt-3 mb-2">
                        Real-Time Bus Tracking
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                        Know exactly where your bus is. Set proximity alerts and
                        never miss your ride to campus again.
                      </p>
                      <div className="flex items-center gap-4 mt-6">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500 live-indicator" />
                          <span className="font-label-bold text-[11px] text-green-700">
                            {allLocations.length} Live
                          </span>
                        </div>
                        <span className="w-px h-4 bg-outline-variant/30" />
                        <span className="font-label-md text-label-md text-on-surface-variant">
                          {SEED_ROUTES.length} Total Routes
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Route Timeline */}
                  {timelineRoute && (
                    <div className="animate-fadeInUp stagger-4">
                      <RouteTimeline
                        route={timelineRoute}
                        busPosition={timelineBusPosition}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
