// Seed route data matching the UniTrack design
export const SEED_ROUTES = [
  {
    id: 'route-fet-jayanagar',
    code: 'ROUTE 12B_RET',
    name: 'Jain University → Jayanagar',
    origin: 'Jain University',
    destination: 'Jayanagar',
    departureTime: '05:00',
    period: 'PM',
    shift: 'evening',
    stops: [
      { name: 'Jain University', lat: 12.6424, lng: 77.4394, order: 1 },
      { name: 'Banashankari', lat: 12.9255, lng: 77.5468, order: 2 },
      { name: 'Jayanagar', lat: 12.9279, lng: 77.5937, order: 3 },
    ],
    originCoords: { lat: 12.6424, lng: 77.4394 },
    destinationCoords: { lat: 12.9279, lng: 77.5937 },
    status: 'active',
  },
  {
    id: 'route-fet-yelahanka',
    code: 'ROUTE 33F_RET',
    name: 'Jain University → Yelahanka',
    origin: 'Jain University',
    destination: 'Yelahanka',
    departureTime: '05:15',
    period: 'PM',
    shift: 'evening',
    stops: [
      { name: 'Jain University', lat: 12.6424, lng: 77.4394, order: 1 },
      { name: 'Yelahanka', lat: 13.1007, lng: 77.5963, order: 2 },
    ],
    originCoords: { lat: 12.6424, lng: 77.4394 },
    destinationCoords: { lat: 13.1007, lng: 77.5963 },
    status: 'active',
  },
  {
    id: 'route-jain-jayanagar',
    code: 'ROUTE 12B_RET2',
    name: 'Jain University → Jayanagar',
    origin: 'Jain University',
    destination: 'Jayanagar',
    departureTime: '05:30',
    period: 'PM',
    shift: 'evening',
    stops: [
      { name: 'Jain University', lat: 12.6424, lng: 77.4394, order: 1 },
      { name: 'HSR Layout', lat: 12.9121, lng: 77.6446, order: 2 },
      { name: 'Silk Board', lat: 12.9177, lng: 77.6238, order: 3 },
      { name: 'Jayanagar', lat: 12.9279, lng: 77.5937, order: 4 },
    ],
    originCoords: { lat: 12.6424, lng: 77.4394 },
    destinationCoords: { lat: 12.9279, lng: 77.5937 },
    status: 'active',
  },
  {
    id: 'route-33f',
    code: 'ROUTE 33F',
    name: 'Yelahanka → Jain University',
    origin: 'Yelahanka',
    destination: 'Jain University',
    departureTime: '08:45',
    period: 'AM',
    shift: 'morning',
    stops: [
      { name: 'Yelahanka', lat: 13.1007, lng: 77.5963, order: 1 },
      { name: 'Jain University', lat: 12.6424, lng: 77.4394, order: 2 },
    ],
    originCoords: { lat: 13.1007, lng: 77.5963 },
    destinationCoords: { lat: 12.6424, lng: 77.4394 },
    status: 'active',
  },
  {
    id: 'route-42a',
    code: 'ROUTE 42A',
    name: 'Hebbal → Jain University',
    origin: 'Hebbal',
    destination: 'Jain University',
    departureTime: '08:15',
    period: 'AM',
    shift: 'morning',
    stops: [
      { name: 'Hebbal Main Stand', lat: 13.0358, lng: 77.5970, order: 1 },
      { name: 'Manyata Tech Park', lat: 13.0474, lng: 77.6212, order: 2 },
      { name: 'Tin Factory', lat: 13.0067, lng: 77.6510, order: 3 },
      { name: 'Marathahalli', lat: 12.9591, lng: 77.6971, order: 4 },
      { name: 'Jain University', lat: 12.6424, lng: 77.4394, order: 5 },
    ],
    originCoords: { lat: 13.0358, lng: 77.5970 },
    destinationCoords: { lat: 12.6424, lng: 77.4394 },
    status: 'active',
  },
  {
    id: 'route-12b',
    code: 'ROUTE 12B',
    name: 'Jayanagar → Jain University',
    origin: 'Jayanagar',
    destination: 'Jain University',
    departureTime: '08:30',
    period: 'AM',
    shift: 'morning',
    stops: [
      { name: 'Jayanagar 4th Block', lat: 12.9279, lng: 77.5937, order: 1 },
      { name: 'Banashankari', lat: 12.9255, lng: 77.5468, order: 2 },
      { name: 'Silk Board', lat: 12.9177, lng: 77.6238, order: 3 },
      { name: 'HSR Layout', lat: 12.9121, lng: 77.6446, order: 4 },
      { name: 'Jain University', lat: 12.6424, lng: 77.4394, order: 5 },
    ],
    originCoords: { lat: 12.9279, lng: 77.5937 },
    destinationCoords: { lat: 12.6424, lng: 77.4394 },
    status: 'active',
  },
  {
    id: 'route-05c',
    code: 'ROUTE 05C',
    name: 'Indiranagar → Jain University',
    origin: 'Indiranagar',
    destination: 'Jain University',
    departureTime: '07:45',
    period: 'AM',
    shift: 'morning',
    stops: [
      { name: 'Indiranagar 100ft Rd', lat: 12.9784, lng: 77.6408, order: 1 },
      { name: 'Domlur', lat: 12.9614, lng: 77.6387, order: 2 },
      { name: 'Koramangala', lat: 12.9352, lng: 77.6245, order: 3 },
      { name: 'JP Nagar', lat: 12.9063, lng: 77.5857, order: 4 },
      { name: 'Jain University', lat: 12.6424, lng: 77.4394, order: 5 },
    ],
    originCoords: { lat: 12.9784, lng: 77.6408 },
    destinationCoords: { lat: 12.6424, lng: 77.4394 },
    status: 'active',
  },
  {
    id: 'route-18d',
    code: 'ROUTE 18D',
    name: 'Jain University → Electronic City',
    origin: 'Jain University',
    destination: 'Electronic City',
    departureTime: '05:30',
    period: 'PM',
    shift: 'evening',
    stops: [
      { name: 'Jain University', lat: 12.6424, lng: 77.4394, order: 1 },
      { name: 'Silk Board', lat: 12.9177, lng: 77.6238, order: 2 },
      { name: 'Bommanahalli', lat: 12.9003, lng: 77.6180, order: 3 },
      { name: 'Electronic City Phase 1', lat: 12.8452, lng: 77.6602, order: 4 },
    ],
    originCoords: { lat: 12.6424, lng: 77.4394 },
    destinationCoords: { lat: 12.8452, lng: 77.6602 },
    status: 'upcoming',
  },
  {
    id: 'route-21e',
    code: 'ROUTE 21E',
    name: 'Jain University → Whitefield',
    origin: 'Jain University',
    destination: 'Whitefield',
    departureTime: '06:00',
    period: 'PM',
    shift: 'evening',
    stops: [
      { name: 'Jain University', lat: 12.6424, lng: 77.4394, order: 1 },
      { name: 'Marathahalli', lat: 12.9591, lng: 77.6971, order: 2 },
      { name: 'Kundalahalli', lat: 12.9628, lng: 77.7228, order: 3 },
      { name: 'Whitefield', lat: 12.9698, lng: 77.7500, order: 4 },
    ],
    originCoords: { lat: 12.6424, lng: 77.4394 },
    destinationCoords: { lat: 12.9698, lng: 77.7500 },
    status: 'upcoming',
  },
];

// Jain University coordinates
export const FET_CAMPUS = {
  // OLA Maps registered 'FET Bus Stop Jain University' coordinate
  lat: 12.6424,
  lng: 77.4394,
  name: 'Jain University',
};

// Alarm sound data URI (short beep sound)
export const ALARM_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVghar/i2Y/LFyHsf+PajsqWoav/5FsOilZhq3/k241KViGrf+UcDQpWIat/5RwNClYhq3/lHA0KViGrf+UcDQpWIat/5RwNClYhq3/lHA0KQ==';

// Format seconds to MM:SS
export function formatTime(seconds) {
  if (seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Format seconds to human readable (e.g., "12 min", "1 hr 5 min")
export function formatDuration(seconds) {
  if (seconds < 60) return 'Less than a min';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours} hr ${remainingMins} min` : `${hours} hr`;
}

// Calculate distance between two coordinates in km (Haversine)
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
