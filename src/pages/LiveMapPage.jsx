import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SEED_ROUTES, calculateDistance } from '../lib/constants';
import { useLiveLocations } from '../hooks/useRealtime';
import { getDirections, decodePolyline } from '../lib/olaMaps';
import { useAuth } from '../context/AuthContext';
import MapView from '../components/MapView';
import ETATimer from '../components/ETATimer';
import AlarmManager from '../components/AlarmManager';
import RouteTimeline from '../components/RouteTimeline';
import { databases, DATABASE_ID, COLLECTIONS } from '../lib/appwrite';

export default function LiveMapPage() {
  const { routeId } = useParams();
  const navigate = useNavigate();
  const { userStop } = useAuth();

  // Find route data from database, fallback to seed
  const [route, setRoute] = useState(() => {
    const r = SEED_ROUTES.find((r) => r.id === routeId) || null;
    if (r && r.stops) {
      r.stops = [...r.stops].sort((a, b) => a.order - b.order);
    }
    return r;
  });

  useEffect(() => {
    if (!routeId) return;
    const fetchRoute = async () => {
      try {
        const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.ROUTES || 'routes', routeId);
        const parsedStops = typeof doc.stops === 'string' ? JSON.parse(doc.stops) : doc.stops;
        const sortedStops = [...parsedStops].sort((a, b) => a.order - b.order);
        const formatted = {
          id: doc.$id,
          code: doc.code,
          name: doc.name,
          origin: doc.origin,
          destination: doc.destination,
          departureTime: doc.departureTime,
          period: doc.period,
          shift: doc.shift,
          stops: sortedStops,
          originCoords: typeof doc.originCoords === 'string' ? JSON.parse(doc.originCoords) : doc.originCoords,
          destinationCoords: typeof doc.destinationCoords === 'string' ? JSON.parse(doc.destinationCoords) : doc.destinationCoords,
          status: doc.status
        };
        setRoute(formatted);
      } catch (err) {
        console.warn("Using static SEED_ROUTES fallback for live map:", err);
      }
    };
    fetchRoute();
  }, [routeId]);

  // Live location tracking
  const { locations, isConnected } = useLiveLocations(routeId);
  const busLocation = useMemo(() => {
    const locList = Object.values(locations || {});
    return locList.length > 0 ? locList[0] : null;
  }, [locations]);

  // Determine the user's destination stop for ETA
  const userDestinationStop = route
    ? route.stops.find((s) => s.name === userStop) || route.stops[route.stops.length - 1]
    : null;

  // Build bus position object for child components
  const busPosition = React.useMemo(() => {
    return busLocation
      ? { latitude: busLocation.lat, longitude: busLocation.lng }
      : null;
  }, [busLocation?.lat, busLocation?.lng]);

  // Determine map center
  const mapCenter = React.useMemo(() => {
    if (busPosition) return [busPosition.longitude, busPosition.latitude];
    if (route) return [route.originCoords.lng, route.originCoords.lat];
    return [77.5946, 12.9716];
  }, [busPosition, route]);

  // Build ETA data from busLocation for AlarmManager
  const [etaData, setEtaData] = useState(null);

  // Route polyline states
  const [staticPolyline, setStaticPolyline] = useState(null);
  const [polylineError, setPolylineError] = useState(false);

  // Mobile panel toggle
  const [panelExpanded, setPanelExpanded] = useState(false);

  const [roadRouting, setRoadRouting] = useState(true);

  // Fetch static route polyline once on mount or route change
  useEffect(() => {
    if (!route || !route.stops || route.stops.length < 2) {
      setStaticPolyline(null);
      return;
    }

    const fetchPolyline = async () => {
      try {
        const sortedStops = [...route.stops].sort((a, b) => a.order - b.order);
        const origin = sortedStops[0];
        const dest = sortedStops[sortedStops.length - 1];
        const waypoints = sortedStops.slice(1, -1);

        if (roadRouting) {
          try {
            const data = await getDirections(origin.lat, origin.lng, dest.lat, dest.lng, waypoints);
            if (data.routes && data.routes.length > 0) {
              const encoded = data.routes[0].overview_polyline;
              if (encoded) {
                const decoded = decodePolyline(encoded);
                if (decoded.length > 0) {
                  // Ensure start and end coordinates match the stops exactly
                  decoded.unshift([origin.lng, origin.lat]);
                  decoded.push([dest.lng, dest.lat]);

                  // Snap intermediate stops to the nearest point on polyline to guarantee 0px offset
                  for (const stop of waypoints) {
                    let minDistance = Infinity;
                    let closestIdx = -1;
                    for (let j = 0; j < decoded.length; j++) {
                      const dx = decoded[j][0] - stop.lng;
                      const dy = decoded[j][1] - stop.lat;
                      const dist = dx * dx + dy * dy;
                      if (dist < minDistance) {
                        minDistance = dist;
                        closestIdx = j;
                      }
                    }
                    if (closestIdx !== -1) {
                      decoded[closestIdx] = [stop.lng, stop.lat];
                    }
                  }

                  setStaticPolyline(decoded);
                  setPolylineError(false);
                  return;
                }
              }
            }
          } catch (legErr) {
            console.warn(`Waypoints directions failed for route ${route.name}:`, legErr);
          }
        }

        // Fallback to straight lines connecting all stops in sequence
        const fallback = sortedStops.map((s) => [s.lng, s.lat]);
        setStaticPolyline(fallback);
        setPolylineError(false);
      } catch (err) {
        console.error('Failed to fetch route polyline:', err);
        setPolylineError(true);
      }
    };

    fetchPolyline();
  }, [route, roadRouting]);

  // Keep route polyline continuous from the first stop to the last stop (no slicing)
  const polyline = staticPolyline;

  // Build stop markers for MapView
  const stopMarkers = React.useMemo(() => {
    return route
      ? route.stops.map((stop) => ({
          lat: stop.lat,
          lng: stop.lng,
          name: stop.name,
          isHighlighted: stop.name === userStop,
        }))
      : [];
  }, [route, userStop]);



  // 404 state — route not found
  if (!route) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 animate-fadeInUp">
          <span className="material-symbols-outlined text-[64px] text-error">
            wrong_location
          </span>
          <h2 className="font-headline-lg text-headline-lg text-primary font-extrabold">
            Route Not Found
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm mx-auto">
            The route you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/student')}
            className="premium-gradient text-on-primary px-8 py-3.5 rounded-2xl font-label-bold text-label-bold hover:shadow-xl transition-all active:scale-95 inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ─── Header ─── */}
      <header className="premium-gradient text-on-primary px-4 md:px-8 py-4 flex items-center gap-4 shadow-lg relative z-20">
        <button
          onClick={() => navigate('/student')}
          className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-90"
          aria-label="Go back"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="font-title-md text-white font-bold truncate">{route.name}</h1>
            <span className="secondary-gradient text-on-secondary px-2.5 py-0.5 rounded-lg font-label-bold text-[10px] tracking-tight shrink-0">
              {route.code}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-400 live-indicator" />
                <span className="text-[11px] text-green-300 font-label-bold">
                  {busLocation ? 'Bus is live' : 'Connected — waiting for bus'}
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-[11px] text-yellow-300 font-label-bold">
                  Connecting...
                </span>
              </>
            )}
          </div>
        </div>

        {/* Quick info on larger screens */}
        <div className="hidden md:flex items-center gap-3">
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
            <p className="text-[10px] text-white/50 font-label-bold uppercase tracking-widest">
              Departs
            </p>
            <p className="font-title-md font-bold text-white">
              {route.departureTime} {route.period}
            </p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
            <p className="text-[10px] text-white/50 font-label-bold uppercase tracking-widest">
              Stops
            </p>
            <p className="font-title-md font-bold text-white">{route.stops.length}</p>
          </div>
        </div>
      </header>

      {/* ─── Main Content: Map + Panel ─── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* ─── Map Area ─── */}
        <div className="flex-1 relative min-h-[400px] lg:min-h-0">
          <MapView
            center={mapCenter}
            zoom={13}
            markers={stopMarkers}
            routePolyline={polyline}
            busPosition={busPosition}
            userPosition={null}
            className="w-full h-full"
          />

          {/* Floating status badges */}
          <div className="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none z-10">
            {/* Connection badge */}
            <div
              className={`pointer-events-auto glass-card rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-lg ${
                busLocation ? '' : 'animate-pulse'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[20px] ${
                  busLocation ? 'text-green-600' : 'text-on-surface-variant'
                }`}
              >
                {busLocation ? 'gps_fixed' : 'gps_not_fixed'}
              </span>
              <span className="font-label-bold text-[11px] text-on-surface-variant">
                {busLocation ? 'Tracking active' : 'Waiting for GPS signal'}
              </span>
            </div>

            {/* Map Controls */}
            <div className="flex flex-col gap-2.5 items-end pointer-events-auto ml-auto">
              {busPosition && (
                <button
                  onClick={() => {
                    /* MapView auto-pans to bus */
                  }}
                  className="glass-card w-10 h-10 rounded-xl flex items-center justify-center shadow-lg hover:bg-white transition-all active:scale-90"
                  aria-label="Center on bus"
                >
                  <span className="material-symbols-outlined text-[20px] text-primary">
                    my_location
                  </span>
                </button>
              )}

              <button
                onClick={() => setRoadRouting(!roadRouting)}
                className={`glass-card px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-lg hover:bg-white transition-all active:scale-95 text-[11px] font-label-bold ${
                  roadRouting ? 'text-secondary border border-secondary/20' : 'text-on-surface-variant'
                }`}
                title="Toggle Road Routing / Straight Lines"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {roadRouting ? 'route' : 'timeline'}
                </span>
                <span>{roadRouting ? 'Road Routing' : 'Straight Lines'}</span>
              </button>
            </div>
          </div>

          {/* Polyline error banner */}
          {polylineError && (
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <div className="glass-card rounded-2xl px-4 py-3 flex items-center gap-2 border-l-4 border-yellow-500">
                <span className="material-symbols-outlined text-[18px] text-yellow-600">
                  warning
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Route path could not be loaded. Stop markers are still visible.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ─── Info Panel ─── */}
        <div
          className={`
            w-full lg:w-[420px] xl:w-[460px] lg:border-l border-outline-variant/20
            bg-background lg:overflow-y-auto custom-scrollbar
            flex flex-col
            transition-all duration-300
          `}
        >
          {/* Mobile pull tab */}
          <button
            onClick={() => setPanelExpanded(!panelExpanded)}
            className="lg:hidden flex items-center justify-center py-2 bg-surface-container border-t border-outline-variant/20"
            aria-label={panelExpanded ? 'Collapse panel' : 'Expand panel'}
          >
            <div className="w-10 h-1 rounded-full bg-outline-variant/40" />
          </button>

          {/* Panel content */}
          <div
            className={`
              p-4 md:p-6 space-y-5 overflow-y-auto custom-scrollbar
              ${panelExpanded ? '' : 'max-h-[60vh] lg:max-h-none'}
            `}
          >
            {/* Route header card */}
            <div className="glass-card rounded-[24px] p-6 animate-fadeInUp">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 premium-gradient rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-[28px] text-white">
                    directions_bus
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-title-md text-primary font-bold truncate">
                    {route.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="secondary-gradient text-on-secondary px-2.5 py-0.5 rounded-lg font-label-bold text-[10px]">
                      {route.code}
                    </span>
                    <span className="text-on-surface-variant font-label-md text-label-md">
                      {route.departureTime} {route.period}
                    </span>
                  </div>
                </div>
              </div>

              {/* Route quick stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-primary/5 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-on-surface-variant font-label-bold uppercase tracking-widest">
                    Origin
                  </p>
                  <p className="font-label-bold text-primary text-[12px] mt-1 truncate">
                    {route.origin}
                  </p>
                </div>
                <div className="bg-primary/5 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-on-surface-variant font-label-bold uppercase tracking-widest">
                    Dest.
                  </p>
                  <p className="font-label-bold text-primary text-[12px] mt-1 truncate">
                    {route.destination}
                  </p>
                </div>
                <div className="bg-primary/5 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-on-surface-variant font-label-bold uppercase tracking-widest">
                    Stops
                  </p>
                  <p className="font-label-bold text-primary text-[12px] mt-1">
                    {route.stops.length}
                  </p>
                </div>
              </div>

              {/* Your stop indicator */}
              {userDestinationStop && (
                <div className="mt-4 flex items-center gap-3 bg-secondary/5 border border-secondary/10 rounded-xl p-3">
                  <span className="material-symbols-outlined text-secondary text-[20px]">
                    location_on
                  </span>
                  <div>
                    <p className="text-[10px] text-on-surface-variant font-label-bold uppercase tracking-widest">
                      Your Stop
                    </p>
                    <p className="font-label-bold text-primary text-[13px]">
                      {userDestinationStop.name}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ETA Timer */}
            <div className="animate-fadeInUp stagger-1">
              <ETATimer
                busPosition={busPosition}
                destinationStop={userDestinationStop}
                onEtaUpdate={setEtaData}
              />
            </div>

            {/* Alarm Manager */}
            <div className="animate-fadeInUp stagger-2">
              <AlarmManager
                eta={etaData}
                busPosition={busPosition}
                stopName={userDestinationStop?.name || route.destination}
              />
            </div>

            {/* Route Timeline */}
            <div className="animate-fadeInUp stagger-3">
              <RouteTimeline route={route} busPosition={busPosition} />
            </div>

            {/* Back to dashboard button */}
            <div className="animate-fadeInUp stagger-4 pt-2 pb-6">
              <button
                onClick={() => navigate('/student')}
                className="w-full glass-card rounded-2xl py-4 font-label-bold text-label-bold text-on-surface-variant hover:bg-white hover:text-primary transition-all active:scale-[0.98] flex items-center justify-center gap-2 border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
