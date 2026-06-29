const OLA_API_KEY = import.meta.env.VITE_OLA_MAPS_API_KEY;
const BASE_URL = 'https://api.olamaps.io';

export async function getDirections(originLat, originLng, destLat, destLng, waypoints = []) {
  let url = `${BASE_URL}/routing/v1/directions?origin=${originLat},${originLng}&destination=${destLat},${destLng}&api_key=${OLA_API_KEY}`;
  if (waypoints && waypoints.length > 0) {
    const waypointsStr = waypoints.map((w) => `${w.lat},${w.lng}`).join('|');
    url += `&waypoints=${encodeURIComponent(waypointsStr)}`;
  }
  const response = await fetch(url, { method: 'POST', headers: { 'X-Request-Id': crypto.randomUUID() } });
  if (!response.ok) throw new Error('Failed to get directions');
  return response.json();
}

export async function getETA(originLat, originLng, destLat, destLng) {
  const data = await getDirections(originLat, originLng, destLat, destLng);
  if (data.routes && data.routes.length > 0) {
    const leg = data.routes[0].legs[0];
    return {
      durationSeconds: leg.duration.value,
      durationText: leg.duration.text,
      distanceMeters: leg.distance.value,
      distanceText: leg.distance.text,
    };
  }
  throw new Error('No route found');
}

export function decodePolyline(str, precision = 5) {
  let index = 0, lat = 0, lng = 0;
  const coordinates = [];
  const factor = Math.pow(10, precision);
  while (index < str.length) {
    let byte, shift = 0, result = 0;
    do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += ((result & 1) ? ~(result >> 1) : (result >> 1));
    shift = 0; result = 0;
    do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lng += ((result & 1) ? ~(result >> 1) : (result >> 1));
    coordinates.push([lng / factor, lat / factor]);
  }
  return coordinates;
}

let sdkPromise = null;

function getSDK() {
  if (sdkPromise) return sdkPromise;
  
  sdkPromise = new Promise((resolve, reject) => {
    if (window.OlaMapsSDK) {
      resolve(window.OlaMapsSDK);
      return;
    }
    
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.OlaMapsSDK) {
        clearInterval(interval);
        resolve(window.OlaMapsSDK);
      } else if (attempts > 50) { // 5 seconds
        clearInterval(interval);
        reject(new Error("OlaMapsSDK failed to load statically."));
      }
    }, 100);
  });
  
  return sdkPromise;
}

export function initializeMap(containerId, options = {}) {
  return getSDK().then((OlaMapsSDK) => {
    return new Promise((resolve, reject) => {
      const defaultOptions = {
        center: [77.5946, 12.9716],
        zoom: 12,
        style: `${BASE_URL}/tiles/vector/v1/styles/default-light-standard/style.json`,
        attributionControl: false,
      };
      const mergedOptions = { ...defaultOptions, ...options };

      try {
        const container = document.getElementById(containerId);
        if (!container) {
          throw new Error('Container missing');
        }

        const olaMaps = new OlaMapsSDK.OlaMaps({ apiKey: OLA_API_KEY });
        
        let map = olaMaps.init({
          style: mergedOptions.style,
          container: container,
          center: mergedOptions.center,
          zoom: mergedOptions.zoom,
          attributionControl: false,
        });

        // Resolve promise if init is async
        if (map instanceof Promise) {
          map.then((m) => {
            setupMapListeners(m);
            resolve({ map: m, olaMaps });
          }).catch(reject);
        } else {
          setupMapListeners(map);
          resolve({ map, olaMaps });
        }
      } catch (err) {
        reject(err);
      }
    });
  });
}

function setupMapListeners(map) {
  if (typeof map.on === 'function') {
    map.on("styledata", () => {
      console.log("STYLE DATA");
    });
    map.on("sourcedata", () => {
      console.log("SOURCE DATA");
    });
    map.on("idle", () => {
      console.log("MAP IDLE");
    });
    map.on("error", (e) => {
      console.log("MAP ERROR", e);
    });
  }
}

export { OLA_API_KEY };
