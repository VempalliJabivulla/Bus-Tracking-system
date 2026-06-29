import { Client, Databases } from 'node-appwrite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const OLA_API_KEY = process.env.VITE_OLA_MAPS_API_KEY;
const BASE_URL = 'https://api.olamaps.io';

async function getDirections(originLat, originLng, destLat, destLng) {
  const url = `${BASE_URL}/routing/v1/directions?origin=${originLat},${originLng}&destination=${destLat},${destLng}&api_key=${OLA_API_KEY}`;
  const response = await fetch(url, { method: 'POST', headers: { 'X-Request-Id': 'test-uuid' } });
  if (!response.ok) throw new Error('Failed to get directions');
  return response.json();
}

function decodePolyline(str, precision = 5) {
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

const client = new Client();
client
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID);

const databases = new Databases(client);
const dbId = process.env.VITE_APPWRITE_DATABASE_ID;

async function run() {
  const selectedRouteId = 'route-18d';
  try {
    const doc = await databases.getDocument(dbId, 'routes', selectedRouteId);
    const docStops = typeof doc.stops === 'string' ? JSON.parse(doc.stops) : doc.stops;
    const mappedStops = docStops.map(s => ({
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      latitude: s.lat,
      longitude: s.lng,
      order: s.order
    }));

    const selectedRoute = {
      id: doc.$id,
      code: doc.code,
      name: doc.name,
      stops: mappedStops
    };

    console.log('Selected Route:', selectedRoute.name);

    let fullPath = [];
    for (let i = 0; i < selectedRoute.stops.length - 1; i++) {
      const startStop = selectedRoute.stops[i];
      const endStop = selectedRoute.stops[i + 1];
      const startLat = startStop.lat, startLng = startStop.lng;
      const destLat  = endStop.lat,  destLng  = endStop.lng;

      try {
        const data = await getDirections(startLat, startLng, destLat, destLng);
        if (data.routes && data.routes.length > 0) {
          const encoded = data.routes[0].overview_polyline;
          if (encoded) {
            const decoded = decodePolyline(encoded);
            if (decoded.length > 0) {
              const decodedLatLon = decoded.map(pt => [pt[1], pt[0]]);
              decodedLatLon.unshift([startLat, startLng]);
              decodedLatLon.push([destLat, destLng]);

              if (fullPath.length > 0) fullPath.pop();
              fullPath = [...fullPath, ...decodedLatLon];
              console.log(`Success directions for leg ${i}: ${startStop.name} -> ${endStop.name}, points: ${decodedLatLon.length}`);
              continue;
            }
          }
        }
      } catch (legErr) {
        console.warn(`Leg directions failed (${startStop.name} -> ${endStop.name}):`, legErr.message);
      }

      const fallbackLeg = [[startLat, startLng], [destLat, destLng]];
      if (fullPath.length > 0) fullPath.pop();
      fullPath = [...fullPath, ...fallbackLeg];
      console.log(`Fallback directions for leg ${i}: ${startStop.name} -> ${endStop.name}`);
    }

    console.log('FullPath total points:', fullPath.length);

    // Validate distance
    selectedRoute.stops.forEach((stop) => {
      let minDistance = Infinity;
      fullPath.forEach(pt => {
        const lat1 = stop.latitude;
        const lng1 = stop.longitude;
        const lat2 = pt[0];
        const lng2 = pt[1];

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
      console.log(`Stop: ${stop.name}, minDistance: ${minDistance} meters`);
      if (minDistance > 50) {
        throw new Error(`Stop ${stop.name} not aligned with route`);
      }
    });

    console.log('✅ Validation succeeded!');
  } catch (err) {
    console.error('❌ Script failed:', err);
  }
}
run();
