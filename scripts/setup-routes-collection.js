import { Client, Databases } from 'node-appwrite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const client = new Client();
client
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey('standard_885fcf1108c68e76bcd70d187d931abb51079488347b742dcb655a327bacd0f2953e99c3ceb2900c65a368c02bdcf96c5b12e292e04626d6a5887569a6b9db4dc4c519e3793d52ee66e88f77d211f2728e9c12eb3d8c1065252820b2fd7c37749ab6486ef6c6213de422b3dedcafbcbcb45e417e80b9428a2b2d8d6a7755257e');

const databases = new Databases(client);
const dbId = process.env.VITE_APPWRITE_DATABASE_ID;
const colId = 'routes';

const routesToSeed = [
  {
    id: 'route-hebbal-jain',
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
    id: 'route-fet-jayanagar',
    code: 'ROUTE 12B_RET',
    name: 'FET Block → Jayanagar',
    origin: 'FET Block',
    destination: 'Jayanagar',
    departureTime: '05:00',
    period: 'PM',
    shift: 'evening',
    stops: [
      { name: 'FET Block', lat: 12.6424, lng: 77.4394, order: 1 },
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
    name: 'FET Block → Yelahanka',
    origin: 'FET Block',
    destination: 'Yelahanka',
    departureTime: '05:15',
    period: 'PM',
    shift: 'evening',
    stops: [
      { name: 'FET Block', lat: 12.6424, lng: 77.4394, order: 1 },
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
    name: 'Jain University → Yelahanka',
    origin: 'Jain University',
    destination: 'Yelahanka',
    departureTime: '08:45',
    period: 'AM',
    shift: 'morning',
    stops: [
      { name: 'Jain University', lat: 12.6424, lng: 77.4394, order: 1 },
      { name: 'Yelahanka', lat: 13.1007, lng: 77.5963, order: 2 },
    ],
    originCoords: { lat: 12.6424, lng: 77.4394 },
    destinationCoords: { lat: 13.1007, lng: 77.5963 },
    status: 'active',
  },
  {
    id: 'route-42a',
    code: 'ROUTE 42A',
    name: 'Hebbal → FET Campus',
    origin: 'Hebbal',
    destination: 'FET Campus',
    departureTime: '08:15',
    period: 'AM',
    shift: 'morning',
    stops: [
      { name: 'Hebbal Main Stand', lat: 13.0358, lng: 77.5970, order: 1 },
      { name: 'Manyata Tech Park', lat: 13.0474, lng: 77.6212, order: 2 },
      { name: 'Tin Factory', lat: 13.0067, lng: 77.6510, order: 3 },
      { name: 'Marathahalli', lat: 12.9591, lng: 77.6971, order: 4 },
      { name: 'FET Campus', lat: 12.6424, lng: 77.4394, order: 5 },
    ],
    originCoords: { lat: 13.0358, lng: 77.5970 },
    destinationCoords: { lat: 12.6424, lng: 77.4394 },
    status: 'active',
  },
  {
    id: 'route-12b',
    code: 'ROUTE 12B',
    name: 'Jayanagar → FET Campus',
    origin: 'Jayanagar',
    destination: 'FET Campus',
    departureTime: '08:30',
    period: 'AM',
    shift: 'morning',
    stops: [
      { name: 'Jayanagar 4th Block', lat: 12.9279, lng: 77.5937, order: 1 },
      { name: 'Banashankari', lat: 12.9255, lng: 77.5468, order: 2 },
      { name: 'Silk Board', lat: 12.9177, lng: 77.6238, order: 3 },
      { name: 'HSR Layout', lat: 12.9121, lng: 77.6446, order: 4 },
      { name: 'FET Campus', lat: 12.6424, lng: 77.4394, order: 5 },
    ],
    originCoords: { lat: 12.9279, lng: 77.5937 },
    destinationCoords: { lat: 12.6424, lng: 77.4394 },
    status: 'active',
  },
  {
    id: 'route-05c',
    code: 'ROUTE 05C',
    name: 'Indiranagar → FET Campus',
    origin: 'Indiranagar',
    destination: 'FET Campus',
    departureTime: '07:45',
    period: 'AM',
    shift: 'morning',
    stops: [
      { name: 'Indiranagar 100ft Rd', lat: 12.9784, lng: 77.6408, order: 1 },
      { name: 'Domlur', lat: 12.9614, lng: 77.6387, order: 2 },
      { name: 'Koramangala', lat: 12.9352, lng: 77.6245, order: 3 },
      { name: 'JP Nagar', lat: 12.9063, lng: 77.5857, order: 4 },
      { name: 'FET Campus', lat: 12.6424, lng: 77.4394, order: 5 },
    ],
    originCoords: { lat: 12.9784, lng: 77.6408 },
    destinationCoords: { lat: 12.6424, lng: 77.4394 },
    status: 'active',
  },
  {
    id: 'route-18d',
    code: 'ROUTE 18D',
    name: 'FET Campus → Electronic City',
    origin: 'FET Campus',
    destination: 'Electronic City',
    departureTime: '05:30',
    period: 'PM',
    shift: 'evening',
    stops: [
      { name: 'FET Campus', lat: 12.6424, lng: 77.4394, order: 1 },
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
    name: 'FET Campus → Whitefield',
    origin: 'FET Campus',
    destination: 'Whitefield',
    departureTime: '06:00',
    period: 'PM',
    shift: 'evening',
    stops: [
      { name: 'FET Campus', lat: 12.6424, lng: 77.4394, order: 1 },
      { name: 'Marathahalli', lat: 12.9591, lng: 77.6971, order: 2 },
      { name: 'Kundalahalli', lat: 12.9628, lng: 77.7228, order: 3 },
      { name: 'Whitefield', lat: 12.9698, lng: 77.7500, order: 4 },
    ],
    originCoords: { lat: 12.6424, lng: 77.4394 },
    destinationCoords: { lat: 12.9698, lng: 77.7500 },
    status: 'upcoming',
  }
];

async function run() {
  try {
    console.log('Creating routes collection...');
    try {
      await databases.createCollection(
        dbId,
        colId,
        'Routes',
        ['read("any")', 'create("any")', 'update("any")', 'delete("any")']
      );
      console.log('✅ Collection created');

      // Create attributes
      await databases.createStringAttribute(dbId, colId, 'code', 255, true);
      await databases.createStringAttribute(dbId, colId, 'name', 255, true);
      await databases.createStringAttribute(dbId, colId, 'origin', 255, true);
      await databases.createStringAttribute(dbId, colId, 'destination', 255, true);
      await databases.createStringAttribute(dbId, colId, 'departureTime', 255, true);
      await databases.createStringAttribute(dbId, colId, 'period', 255, true);
      await databases.createStringAttribute(dbId, colId, 'shift', 255, true);
      await databases.createStringAttribute(dbId, colId, 'stops', 10000, true);
      await databases.createStringAttribute(dbId, colId, 'originCoords', 1000, true);
      await databases.createStringAttribute(dbId, colId, 'destinationCoords', 1000, true);
      await databases.createStringAttribute(dbId, colId, 'status', 255, true);
      console.log('✅ Attributes created');

      // Wait a moment for attributes to be ready
      await new Promise(r => setTimeout(r, 5000));
    } catch (e) {
      if (e.code === 409) {
        console.log('ℹ️ Collection already exists');
      } else {
        throw e;
      }
    }

    console.log('Seeding routes...');
    for (const route of routesToSeed) {
      const payload = {
        code: route.code,
        name: route.name,
        origin: route.origin,
        destination: route.destination,
        departureTime: route.departureTime,
        period: route.period,
        shift: route.shift,
        stops: JSON.stringify(route.stops),
        originCoords: JSON.stringify(route.originCoords),
        destinationCoords: JSON.stringify(route.destinationCoords),
        status: route.status
      };

      try {
        await databases.createDocument(dbId, colId, route.id, payload);
        console.log(`✅ Document created: ${route.name}`);
      } catch (err) {
        if (err.code === 409) {
          await databases.updateDocument(dbId, colId, route.id, payload);
          console.log(`✅ Document updated: ${route.name}`);
        } else {
          console.error(`Error creating document ${route.name}:`, err);
        }
      }
    }

    console.log('🎉 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Run failed:', error);
  }
}

run();
