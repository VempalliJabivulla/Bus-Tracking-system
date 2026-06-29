import { useState, useEffect, useCallback, useRef } from 'react';
import { client, databases, Query } from '../lib/appwrite';
import { DATABASE_ID, COLLECTIONS } from '../lib/appwrite';
import { getDirections, decodePolyline } from '../lib/olaMaps';
import { SEED_ROUTES } from '../lib/constants';

export function useLiveLocations(routeId) {
  const [locations, setLocations] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  // Returns true if location doc is fresh (updated within last 5 minutes)
  const isFresh = (doc) => {
    if (!doc.timestamp) return true;
    const age = Date.now() - new Date(doc.timestamp).getTime();
    return age < 5 * 60 * 1000; // 5 minutes
  };

  useEffect(() => {
    if (!routeId) return;

    setError(null);
    databases.listDocuments(DATABASE_ID, COLLECTIONS.LIVE_LOCATIONS, [
      Query.equal('routeId', routeId),
      Query.equal('isSharing', true),
    ]).then(response => {
      const locMap = {};
      response.documents.forEach(doc => {
        // Only show fresh locations
        if (isFresh(doc)) locMap[doc.driverId] = doc;
      });
      setLocations(locMap);
      setIsConnected(true);
    }).catch(err => {
      console.error('Failed to fetch locations:', err);
      setError(err);
      setIsConnected(false);
    });

    const channel = `databases.${DATABASE_ID}.collections.${COLLECTIONS.LIVE_LOCATIONS}.documents`;
    const unsubscribe = client.subscribe(channel, (response) => {
      const payload = response.payload;
      if (payload.routeId !== routeId) return;

      if (response.events.some(e => e.includes('.create')) || response.events.some(e => e.includes('.update'))) {
        if (payload.isSharing && isFresh(payload)) {
          // Active, fresh location — add/update
          setLocations(prev => ({ ...prev, [payload.driverId]: payload }));
        } else {
          // isSharing=false OR stale — remove from map
          setLocations(prev => {
            const updated = { ...prev };
            delete updated[payload.driverId];
            return updated;
          });
        }
      }
      if (response.events.some(e => e.includes('.delete'))) {
        setLocations(prev => {
          const updated = { ...prev };
          delete updated[payload.driverId];
          return updated;
        });
      }
    });

    setIsConnected(true);
    return () => { unsubscribe(); setIsConnected(false); };
  }, [routeId]);

  return { locations: Object.values(locations), locationMap: locations, isConnected, error };
}

export function useAllLiveLocations() {
  const [locations, setLocations] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    databases.listDocuments(DATABASE_ID, COLLECTIONS.LIVE_LOCATIONS, [
      Query.equal('isSharing', true),
      Query.limit(100),
    ]).then(response => {
      const locMap = {};
      response.documents.forEach(doc => { locMap[doc.driverId] = doc; });
      setLocations(locMap);
      setIsConnected(true);
    }).catch(err => {
      console.error('Failed to fetch all locations:', err);
      setError(err);
    });

    const channel = `databases.${DATABASE_ID}.collections.${COLLECTIONS.LIVE_LOCATIONS}.documents`;
    const unsubscribe = client.subscribe(channel, (response) => {
      const payload = response.payload;
      if (response.events.some(e => e.includes('.create')) || response.events.some(e => e.includes('.update'))) {
        if (payload.isSharing) {
          setLocations(prev => ({ ...prev, [payload.driverId]: payload }));
        } else {
          setLocations(prev => {
            const updated = { ...prev };
            delete updated[payload.driverId];
            return updated;
          });
        }
      }
      if (response.events.some(e => e.includes('.delete'))) {
        setLocations(prev => {
          const updated = { ...prev };
          delete updated[payload.driverId];
          return updated;
        });
      }
    });
    return () => unsubscribe();
  }, []);
  return { allLocations: Object.values(locations), isConnected, error };
}

export function useLocationSharing(routeId, driverId, simulate = false, roadRouting = true) {
  const [gpsStatus, setGpsStatus] = useState("offline");
  const [dbStatus, setDbStatus] = useState("offline");
  const [dbErrorMsg, setDbErrorMsg] = useState("");
  const [currentPosition, setCurrentPosition] = useState(null);
  
  const docIdRef = useRef(null);
  const watchIdRef = useRef(null);
  const simIntervalRef = useRef(null);

  // Helper function to calculate heading
  const calculateHeading = (p1, p2) => {
    if (!p1 || !p2) return 0;
    const dLng = p2[0] - p1[0];
    const dLat = p2[1] - p1[1];
    let angle = (Math.atan2(dLng, dLat) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    return angle;
  };

  const startSharing = useCallback(async () => {
    console.log("BUTTON CLICKED", { simulate });
    
    setGpsStatus("connecting");
    setDbStatus("connecting");
    setDbErrorMsg("");

    const updateDBLocation = async (lat, lng, spd, hdg) => {
      const payload = {
        lat: lat,
        lng: lng,
        speed: spd || 0,
        heading: hdg || 0,
        routeId,
        isSharing: true,
        timestamp: new Date().toISOString(),
      };

      try {
        let response;
        try {
          response = await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.LIVE_LOCATIONS,
            driverId,
            payload
          );
        } catch (updateErr) {
          response = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.LIVE_LOCATIONS,
            driverId,
            { driverId, ...payload }
          );
        }
        docIdRef.current = driverId;
        setDbStatus("online");
        setDbErrorMsg("");
      } catch (dbErr) {
        console.error("APPWRITE ERROR", dbErr);
        setDbStatus("failed");
        setDbErrorMsg(dbErr.message || "Unknown error");
      }
    };

    if (simulate) {
      try {
        const selectedRoute = SEED_ROUTES.find(r => r.id === routeId);
        if (!selectedRoute || !selectedRoute.stops || selectedRoute.stops.length === 0) {
          throw new Error("No valid route selected for simulation");
        }

        let coords = [];
        for (let i = 0; i < selectedRoute.stops.length - 1; i++) {
          const startStop = selectedRoute.stops[i];
          const endStop = selectedRoute.stops[i + 1];
          const startLat = startStop.lat, startLng = startStop.lng;
          const destLat  = endStop.lat,  destLng  = endStop.lng;

          if (roadRouting) {
            try {
              const data = await getDirections(startLat, startLng, destLat, destLng);
              if (data.routes && data.routes.length > 0 && data.routes[0].overview_polyline) {
                const decoded = decodePolyline(data.routes[0].overview_polyline);
                if (decoded.length > 0) {
                  decoded.unshift([startLng, startLat]);
                  decoded.push([destLng, destLat]);

                  if (coords.length > 0) {
                    coords.pop();
                  }
                  coords = [...coords, ...decoded];
                  continue;
                }
              }
            } catch (legErr) {
              console.warn(`Simulation leg directions failed from ${startStop.name} to ${endStop.name}:`, legErr);
            }
          }

          const fallbackLeg = [[startLng, startLat], [destLng, destLat]];
          if (coords.length > 0) coords.pop();
          coords = [...coords, ...fallbackLeg];
        }

        if (coords.length === 0) {
          throw new Error("Empty simulation path");
        }


        setGpsStatus("online");
        let idx = 0;
        let startDelayTicks = 5; // Stay stationary at start stop for 5 ticks (10 seconds)

        const tick = async () => {
          if (startDelayTicks > 0) {
            startDelayTicks--;
            const startPoint = coords[0];
            const lat = startPoint[1];
            const lng = startPoint[0];
            setCurrentPosition({ latitude: lat, longitude: lng, speed: 0, heading: 0 });
            await updateDBLocation(lat, lng, 0, 0);
            return;
          }

          if (idx >= coords.length) {
            // Stay at destination or loop
            idx = coords.length - 1;
          }

          const currentPoint = coords[idx];
          const nextPoint = coords[idx + 1] || null;

          const lat = currentPoint[1];
          const lng = currentPoint[0];
          const speed = nextPoint ? 11 : 0; // ~40 km/h or stopped
          const heading = calculateHeading(currentPoint, nextPoint);

          setCurrentPosition({ latitude: lat, longitude: lng, speed, heading });
          await updateDBLocation(lat, lng, speed, heading);

          idx++;
        };

        // Run first tick immediately
        await tick();

        const intervalId = setInterval(tick, 2000);
        simIntervalRef.current = intervalId;

      } catch (err) {
        console.error("Simulation initialization failed:", err);
        setGpsStatus("offline");
        setDbStatus("failed");
        setDbErrorMsg(err.message || "Simulation initialization failed");
      }
      return;
    }

    // Geolocation API behavior
    if (!navigator.geolocation) {
      setGpsStatus("offline");
      return;
    }

    try {
      console.log("START INITIAL GPS FETCH");
      setGpsStatus("connecting");
      
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          console.log("INITIAL GPS SUCCESS", pos.coords);
          const { latitude: lat, longitude: lng, speed: spd, heading: hdg } = pos.coords;
          const nLat = Number(lat);
          const nLng = Number(lng);
          if (Number.isFinite(nLat) && Number.isFinite(nLng) && nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180) {
            setGpsStatus("online");
            setCurrentPosition({ latitude: nLat, longitude: nLng, speed: spd || 0, heading: hdg || 0 });
            await updateDBLocation(nLat, nLng, spd || 0, hdg || 0);
          }

          // Once initial position is successfully retrieved, start watching location
          const id = navigator.geolocation.watchPosition(
            async (watchPos) => {
              console.log("GPS WATCH SUCCESS", watchPos.coords);
              const { latitude: wLat, longitude: wLng, speed: wSpd, heading: wHdg } = watchPos.coords;
              const nwLat = Number(wLat);
              const nwLng = Number(wLng);
              if (Number.isFinite(nwLat) && Number.isFinite(nwLng) && nwLat >= -90 && nwLat <= 90 && nwLng >= -180 && nwLng <= 180) {
                setGpsStatus("online");
                setCurrentPosition({ latitude: nwLat, longitude: nwLng, speed: wSpd || 0, heading: wHdg || 0 });
                await updateDBLocation(nwLat, nwLng, wSpd || 0, wHdg || 0);
              }
            },
            (watchError) => {
              console.warn("GPS watch error:", watchError);
            },
            { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
          );
          watchIdRef.current = id;
        },
        (error) => {
          console.log("INITIAL GPS ERROR", error);
          switch (error.code) {
            case 1: setGpsStatus("permission-denied"); break;
            case 2: setGpsStatus("position-unavailable"); break;
            case 3: setGpsStatus("timeout"); break;
            default: setGpsStatus("offline");
          }
          setDbStatus("offline");
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } catch (err) {
      console.error("GPS initialization error:", err);
      setGpsStatus("offline");
    }
  }, [routeId, driverId, simulate, roadRouting]);

  const stopSharing = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simIntervalRef.current !== null) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }

    if (docIdRef.current) {
      try {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.LIVE_LOCATIONS,
          docIdRef.current,
          { isSharing: false }
        );
        setDbStatus("offline");
      } catch (err) {}
    }

    setGpsStatus("offline");
    setCurrentPosition(null);
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (simIntervalRef.current !== null) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    };
  }, []);

  return { gpsStatus, dbStatus, dbErrorMsg, startSharing, stopSharing, currentPosition };
}
