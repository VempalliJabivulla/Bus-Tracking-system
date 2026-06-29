# 🚌 UniTrack (Campus Transit)

A state-of-world, premium web application for real-time bus location sharing and tracking, tailored specifically for university campuses. Built with React, Vite, Appwrite, and the OLA Maps SDK.

## ✨ Features
- **Role-Based Portals**: Separate dashboards for **Students** and **Drivers**.
- **Real-Time Tracking**: Drivers share their live GPS location via Appwrite Realtime.
- **Interactive Maps**: Seamless map visualization using OLA Maps Web SDK.
- **Smart Analytics**: Real-time speed, heading, and time estimation.
- **Proximity Alarms**: Set up visual and auditory alarms for when a bus approaches your selected stop.
- **Premium UI/UX**: World-class design, smooth gradients, micro-animations, and dynamic interactions powered by TailwindCSS.

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+ recommended)
- An [Appwrite](https://appwrite.io/) Account (Cloud or Self-hosted)
- An [OLA Maps API](https://maps.olawebsolutions.com/) Key

### 2. Appwrite Database Setup
Since this app relies on Appwrite for database and real-time features, you must configure your collections manually.

1. Create a new **Project** in your Appwrite Console.
2. Go to **Databases** and create a new database.
3. Note down the `Project ID` and `Database ID`.
4. Create a new collection named **Locations** and note down the `Collection ID`.
5. In the **Locations** collection, go to **Attributes** and create the following:
   - `routeId` (String, size 50, required)
   - `lat` (Float, required)
   - `lng` (Float, required)
   - `speed` (Float, not required)
   - `heading` (Float, not required)
   - `timestamp` (String, size 100, required)
   - `driverId` (String, size 100, required)
6. Go to **Settings** of the Locations collection and update **Permissions**:
   - Add `Any` (or `Users`) role and grant **Create**, **Read**, **Update**, **Delete** permissions (for development).

### 3. Environment Variables
Create a `.env` file in the root directory (if not already present) and populate it:

```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
VITE_APPWRITE_DATABASE_ID=your_database_id
VITE_APPWRITE_COLLECTION_ID=your_collection_id
VITE_OLA_MAPS_API_KEY=your_ola_maps_api_key
```

### 4. Installation & Running Locally

Install the dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

Navigate to `http://localhost:5173` to view the application!

## 🛠️ Tech Stack
- **Frontend**: React.js, Vite, TailwindCSS, Lucide React
- **Backend/BaaS**: Appwrite (Database, Realtime)
- **Mapping Engine**: OLA Maps Web SDK
- **Routing**: React Router DOM

## 👨‍💻 Development Notes
- Routes and Stops are currently seeded in `src/lib/constants.js`.
- Location sharing logic is centralized in `src/hooks/useRealtime.js`.
