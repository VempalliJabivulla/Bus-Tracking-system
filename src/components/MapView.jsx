import React, { useEffect, useRef, useState } from 'react';
import { initializeMap } from '../lib/olaMaps';
import '../lib/maplibre-gl.css';

// ------------------------------------------------------------------
// 1. ErrorBoundary
// ------------------------------------------------------------------
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center bg-error-container p-8 rounded-xl h-full w-full">
          <h2 className="text-error font-bold text-lg mb-2">Map Crash Detected</h2>
          <p className="text-on-error-container font-mono text-sm max-w-full overflow-auto">
            {this.state.error && this.state.error.toString()}
          </p>
          <pre className="text-on-error-container text-xs mt-4 text-left max-w-full overflow-auto max-h-40">
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ------------------------------------------------------------------
// 2. GPSValidator
// ------------------------------------------------------------------
export const GPSValidator = {
  isValid: (lat, lng, item = null) => {
    const nLat = Number(lat);
    const nLng = Number(lng);
    if (isNaN(nLat) || isNaN(nLng) || nLat < -90 || nLat > 90 || nLng < -180 || nLng > 180) {
      if (item) console.warn("Bad GPS", item);
      return false;
    }
    if (lat === null || lat === undefined || lat === '') {
      if (item) console.warn("Bad GPS", item);
      return false;
    }
    if (lng === null || lng === undefined || lng === '') {
      if (item) console.warn("Bad GPS", item);
      return false;
    }
    return true;
  }
};

// ------------------------------------------------------------------
// 3. MapCleanup
// ------------------------------------------------------------------
const MapCleanup = {
  clean: (mapInstanceRef, markersRef, busMarkerRef, userMarkerRef) => {
    if (markersRef && markersRef.current) {
      markersRef.current.forEach((m) => {
        if (m && typeof m.remove === 'function') m.remove();
      });
      markersRef.current = [];
    }
    if (busMarkerRef && busMarkerRef.current) {
      if (typeof busMarkerRef.current.remove === 'function') {
        busMarkerRef.current.remove();
      }
      busMarkerRef.current = null;
    }
    if (userMarkerRef && userMarkerRef.current) {
      if (typeof userMarkerRef.current.remove === 'function') {
        userMarkerRef.current.remove();
      }
      userMarkerRef.current = null;
    }
    if (mapInstanceRef && mapInstanceRef.current) {
      try {
        if (typeof mapInstanceRef.current.remove === 'function') {
          mapInstanceRef.current.remove();
        }
      } catch (e) {
        console.warn("Error removing map instance:", e);
      }
      mapInstanceRef.current = null;
    }
  }
};

// ------------------------------------------------------------------
// 4. MarkerManager
// ------------------------------------------------------------------
const MarkerManager = {
  addStopMarkers: (map, olaMaps, markers, markersRef) => {
    if (!map || typeof map !== "object") return;
    
    // Clear old markers safely
    if (markersRef.current) {
      markersRef.current.forEach((m) => {
        if (m && typeof m.remove === 'function') m.remove();
      });
      markersRef.current = [];
    }

    markers.forEach((markerData) => {
      if (!GPSValidator.isValid(markerData.lat, markerData.lng, markerData)) return;

      const el = document.createElement('div');
      el.className = 'stop-marker relative group cursor-pointer';

      const dot = document.createElement('div');
      dot.style.width = markerData.isHighlighted ? '20px' : '14px';
      dot.style.height = markerData.isHighlighted ? '20px' : '14px';
      dot.style.borderRadius = '50%';
      dot.style.background = markerData.isHighlighted ? '#fc6c29' : '#ffffff';
      dot.style.border = '3px solid #1a1a24';
      if (markerData.isHighlighted) {
        dot.style.boxShadow = '0 0 15px rgba(252, 108, 41, 0.5)';
      }
      el.appendChild(dot);

      if (markerData.name) {
        const tooltip = document.createElement('div');
        tooltip.className = 'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-surface-container-highest text-on-surface text-[11px] font-label-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50';
        tooltip.innerText = markerData.name;
        el.appendChild(tooltip);
      }

      console.log("MAP");
      console.log(map);
      console.log(typeof map);
      console.log(map.constructor?.name);
      console.log(map.loaded?.());
      console.log(map.remove);
      console.log(map.flyTo);
      console.log(map.getCenter?.());
      console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(map || {})));

      try {
        let marker;
        if (typeof olaMaps.Marker === 'function') {
           marker = new olaMaps.Marker({ element: el, anchor: 'center' });
        } else {
           marker = olaMaps.addMarker({ element: el, anchor: 'center' });
        }

        marker.setLngLat([markerData.lng, markerData.lat]);

        if (map && typeof map.remove === "function" && typeof map.flyTo === "function") {
          marker.addTo(map);
          markersRef.current.push(marker);
        } else {
          console.error("INVALID MAP", map);
        }
      } catch (err) {
        console.error("Marker Failed", markerData, err);
      }
    });
  },

  updateBusMarker: (map, olaMaps, busPosition, busMarkerRef) => {
    console.log("ADDING BUS MARKER");
    console.log("busPosition:", busPosition);
    console.log("lat:", busPosition?.latitude);
    console.log("lng:", busPosition?.longitude);
    console.log("map:", map);
    console.log("isMapLoaded:", map?.loaded?.());

    if (!map || typeof map !== "object") return;
    if (!busPosition || !GPSValidator.isValid(busPosition.latitude, busPosition.longitude, busPosition)) return;

    const renderBus = () => {
      if (busMarkerRef.current && typeof busMarkerRef.current.setLngLat === 'function') {
        busMarkerRef.current.setLngLat([busPosition.longitude, busPosition.latitude]);
      } else {
        const el = document.createElement('div');
        el.className = 'bus-marker-premium';
        el.innerHTML = `
          <div class="bus-container">
            <div class="bus-glow"></div>
            <div class="bus-wrapper flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#ffffff">
                <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
              </svg>
            </div>
          </div>
        `;

        try {
          let newMarker;
          if (typeof olaMaps.Marker === 'function') {
             newMarker = new olaMaps.Marker({ element: el, anchor: 'center' });
          } else {
             newMarker = olaMaps.addMarker({ element: el, anchor: 'center' });
          }
          
          newMarker.setLngLat([busPosition.longitude, busPosition.latitude]);

          if (map && typeof map.remove === "function" && typeof map.flyTo === "function") {
            busMarkerRef.current = newMarker.addTo(map);
          } else {
            console.error("INVALID MAP", map);
          }
        } catch (err) {
          console.error("Marker Failed", busPosition, err);
        }
      }
    };

    if (map.loaded?.()) {
      renderBus();
    } else if (typeof map.once === 'function') {
      map.once('load', renderBus);
    }
  }
};

// ------------------------------------------------------------------
// 5. MapProvider (Core Component Logic)
// ------------------------------------------------------------------
function MapProvider({
  center,
  zoom = 12,
  markers = [],
  routePolyline = null,
  busPosition = null,
  userPosition = null,
  className = '',
  onMapReady,
  routeColor = '#fc6c29',
  routeWidth = 5,
  isLive = false,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const olaMapsRef = useRef(null);
  const markersRef = useRef([]);
  const busMarkerRef = useRef(null);
  const userMarkerRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState(null);
  
  const mapIdRef = useRef('map-' + Math.random().toString(36).substring(2, 9));
  
  const initialized = useRef(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (initialized.current) return;
    
    initialized.current = true;
    let isMounted = true;

    const containerId = mapIdRef.current;
    mapContainerRef.current.id = containerId;

    const loadMap = async () => {
      try {
        console.log("MAP INIT START");
        const { map, olaMaps } = await initializeMap(containerId, {
          center: center || [77.5946, 12.9716],
          zoom,
        });

        console.log("MAP INIT SUCCESS");
        if (!isMounted) {
          try {
            if (map && typeof map.remove === 'function') map.remove();
          } catch (e) {}
          return;
        }

        mapInstanceRef.current = map;
        olaMapsRef.current = olaMaps;

        const handleMapLoad = () => {
          if (isMounted) {
            console.log("MAP LOAD COMPLETED EVENT");
            setMapReady(true);
            setLoading(false);
            if (onMapReady) onMapReady(map, olaMaps);
          }
        };

        if (map.loaded?.()) {
          handleMapLoad();
        } else if (typeof map.once === 'function') {
          map.once('load', handleMapLoad);
        }
      } catch (err) {
        console.log("MAP INIT FAILED", err);
        if (isMounted) {
          console.error('Map initialization error:', err);
          setError(err.message);
        }
      }
    };

    loadMap();

    return () => {
      isMounted = false;
      initialized.current = false; // Reset initialized ref on unmount to handle StrictMode double-mount safely
      MapCleanup.clean(mapInstanceRef, markersRef, busMarkerRef, userMarkerRef);
    };
  }, []);

  // Update stop markers
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !olaMapsRef.current) return;
    const map = mapInstanceRef.current;
    MarkerManager.addStopMarkers(map, olaMapsRef.current, markers, markersRef);
  }, [markers, mapReady]);

  // Update bus position marker
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !olaMapsRef.current || !busPosition) return;
    const map = mapInstanceRef.current;
    MarkerManager.updateBusMarker(map, olaMapsRef.current, busPosition, busMarkerRef);
  }, [busPosition, mapReady]);

  // Update user position marker
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !olaMapsRef.current || !userPosition) return;
    const map = mapInstanceRef.current;
    const olaMaps = olaMapsRef.current;

    const renderUser = () => {
      if (userMarkerRef.current && typeof userMarkerRef.current.setLngLat === 'function') {
        userMarkerRef.current.setLngLat([userPosition.longitude, userPosition.latitude]);
      } else {
        const el = document.createElement('div');
        el.className = 'user-location-marker';
        el.innerHTML = `
          <div class="user-pulse"></div>
          <div class="user-dot flex items-center justify-center">
            <span class="material-symbols-outlined" style="font-size: 14px; color: white;">person</span>
          </div>
        `;

        try {
          let newMarker;
          if (typeof olaMaps.Marker === 'function') {
             newMarker = new olaMaps.Marker({ element: el, anchor: 'center' });
          } else {
             newMarker = olaMaps.addMarker({ element: el, anchor: 'center' });
          }
          newMarker.setLngLat([userPosition.longitude, userPosition.latitude]);
          userMarkerRef.current = newMarker.addTo(map);
        } catch (err) {
          console.error("User Marker Failed", err);
        }
      }
    };

    renderUser();
  }, [userPosition, mapReady]);

  // Camera bounds management
  useEffect(() => {
    console.log("CAMERA BOUNDS MANAGEMENT RUNNING:", {
      mapReady,
      mapExists: !!mapInstanceRef.current,
      isLive,
      busPosition,
      markersCount: markers?.length,
      routePolylineCount: routePolyline?.length
    });
    if (!mapReady || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (isLive && busPosition) {
      const pos = {
        lat: busPosition.latitude !== undefined ? busPosition.latitude : busPosition.lat,
        lng: busPosition.longitude !== undefined ? busPosition.longitude : busPosition.lng
      };
      if (typeof map.setCenter === 'function') {
        console.log("Centering map on bus position:", pos);
        map.setCenter(pos);
      }
    } else if (markers && markers.length > 0) {
      // Fit bounds to all route stops and polyline path
      const bounds = {
        minLng: Infinity,
        maxLng: -Infinity,
        minLat: Infinity,
        maxLat: -Infinity,
        extend: function(coord) {
          this.minLng = Math.min(this.minLng, coord[0]);
          this.maxLng = Math.max(this.maxLng, coord[0]);
          this.minLat = Math.min(this.minLat, coord[1]);
          this.maxLat = Math.max(this.maxLat, coord[1]);
          return this;
        }
      };

      markers.forEach(stop => {
        console.log("Extending bounds with stop coordinate:", stop.name, stop.lng, stop.lat);
        bounds.extend([stop.lng, stop.lat]);
      });

      if (routePolyline && routePolyline.length > 0) {
        console.log(`Extending bounds with ${routePolyline.length} polyline points...`);
        routePolyline.forEach(pt => {
          bounds.extend(pt);
        });
      }

      console.log("Calculated bounds:", {
        minLng: bounds.minLng,
        maxLng: bounds.maxLng,
        minLat: bounds.minLat,
        maxLat: bounds.maxLat
      });

      if (typeof map.resize === 'function') {
        map.resize();
      }

      // Fit bounds mathematically to bypass any SDK fitBounds limitations
      const dLng = bounds.maxLng - bounds.minLng;
      const dLat = bounds.maxLat - bounds.minLat;
      const centerLng = (bounds.minLng + bounds.maxLng) / 2;
      const centerLat = (bounds.minLat + bounds.maxLat) / 2;
      
      const maxSpan = Math.max(dLng, dLat * 1.3);
      const calculatedZoom = Math.min(14, Math.max(1, Math.floor(Math.log2(360 / maxSpan)) - 1));

      if (typeof map.resize === 'function') {
        map.resize();
      }

      if (typeof map.jumpTo === 'function') {
        console.log("Calling map.jumpTo mathematically:", { center: [centerLng, centerLat], zoom: calculatedZoom });
        map.jumpTo({
          center: [centerLng, centerLat],
          zoom: calculatedZoom
        });
      } else if (typeof map.fitBounds === 'function') {
        console.log("Falling back to map.fitBounds...");
        map.fitBounds([
          [bounds.minLng, bounds.minLat],
          [bounds.maxLng, bounds.maxLat]
        ], {
          padding: 60,
          maxZoom: 14,
          animate: false
        });
      }
    } else if (center) {
      if (typeof map.setCenter === 'function') {
        map.setCenter(center);
      }
    }
  }, [busPosition, markers, routePolyline, isLive, mapReady]);

  // Add route polyline
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !routePolyline) return;

    const map = mapInstanceRef.current;
    if (!map || typeof map !== "object") return;

    const removeExistingPolyline = () => {
      try {
        if (typeof map.getLayer === 'function' && map.getLayer('route-layer')) {
          map.removeLayer('route-layer');
        }
        if (typeof map.getSource === 'function' && map.getSource('route')) {
          map.removeSource('route');
        }
      } catch (e) {
        console.warn("Error removing polyline:", e);
      }
    };

    const drawPolyline = (coords) => {
      removeExistingPolyline();

      // Convert [lat, lng] to [lng, lat] for MapLibre/GeoJSON compatibility if needed
      const formatted = coords.map(c => {
        if (c[0] < c[1]) {
          return [c[1], c[0]];
        }
        return c;
      });

      try {
        if (typeof map.addSource === 'function') {
          map.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: formatted,
              },
            },
          });
        }

        if (typeof map.addLayer === 'function') {
          map.addLayer({
            id: 'route-layer',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': routeColor, 'line-width': routeWidth, 'line-opacity': 0.9 },
          });
        }
      } catch (err) {
        console.warn("Could not draw route polyline:", err);
      }
    };

    const addRoute = () => {
      const isStyleReady = (typeof map.isStyleLoaded === 'function' ? map.isStyleLoaded() : false) || 
                           (typeof map.loaded === 'function' ? map.loaded() : false);
      if (!isStyleReady) {
        setTimeout(addRoute, 100);
        return;
      }

      const source = typeof map.getSource === 'function' ? map.getSource('route') : null;
      if (source && typeof source.setData === 'function') {
        const formatted = routePolyline.map(c => {
          if (c[0] < c[1]) return [c[1], c[0]];
          return c;
        });
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: formatted,
          },
        });
        return;
      }

      drawPolyline(routePolyline);
    };

    addRoute();

    if (typeof map.on === 'function') {
      map.on('styledata', addRoute);
      map.on('load', addRoute);
    }

    return () => {
      if (typeof map.off === 'function') {
        map.off('styledata', addRoute);
        map.off('load', addRoute);
      }
    };
  }, [routePolyline, mapReady, routeColor, routeWidth]);

  // Sync paint properties when color or width changes dynamically
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    try {
      if (typeof map.setPaintProperty === 'function' && map.getLayer('route-layer')) {
        map.setPaintProperty('route-layer', 'line-color', routeColor);
        map.setPaintProperty('route-layer', 'line-width', routeWidth);
      }
    } catch (e) {
      console.warn("Could not update route paint properties dynamically:", e);
    }
  }, [routeColor, routeWidth, mapReady]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-surface-container rounded-[24px] p-8 ${className}`}>
        <div className="text-center">
          <span className="material-symbols-outlined text-[48px] text-error mb-3 block">error</span>
          <p className="font-title-md text-error font-bold">Map failed to load</p>
          <p className="font-body-sm text-on-surface-variant mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height: '100%', width: '100%' }}>
      <div
        ref={mapContainerRef}
        className="map-container"
        style={{ 
          minHeight: '400px', 
          width: '100%', 
          height: '100%',
          opacity: 1,
          display: 'block',
          visibility: 'visible',
          position: 'relative',
          zIndex: 'auto'
        }}
      />
    </div>
  );
}

// ------------------------------------------------------------------
// 6. MapView Export
// ------------------------------------------------------------------
export default function MapView(props) {
  return (
    <ErrorBoundary>
      <MapProvider {...props} />
    </ErrorBoundary>
  );
}
