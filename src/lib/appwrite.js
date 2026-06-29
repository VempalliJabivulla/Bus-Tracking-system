import { Client, Account, Databases, ID, Query } from 'appwrite';

const client = new Client();

client
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export { client, ID, Query };

// Database constants
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
export const COLLECTIONS = {
  ROUTES: import.meta.env.VITE_APPWRITE_COLLECTION_ROUTES,
  LIVE_LOCATIONS: import.meta.env.VITE_APPWRITE_COLLECTION_LIVE_LOCATIONS,
  DRIVERS: import.meta.env.VITE_APPWRITE_COLLECTION_DRIVERS,
  ALARMS: import.meta.env.VITE_APPWRITE_COLLECTION_ALARMS,
};
