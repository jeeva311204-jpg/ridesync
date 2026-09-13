# RideSync

A real-time ride-hailing web app - request a ride, get matched with a nearby driver 
via proper geospatial filtering, and track their live location on the map as they 
head your way.

**Live demo:** https://ridesync-eosin.vercel.app/

Register two accounts (one Customer, one Driver) in separate browser tabs or an 
incognito window to see the full real-time flow.

## Features

- Real-time ride matching via Firebase Realtime Database, filtered by actual 
  distance using GeoFire geohashing (drivers only see requests within 5km, not 
  every request on the platform)
- Live GPS tracking of the driver's position on the customer's map
- Real road routing and ETA via OSRM (not straight-line distance)
- Atomic ride acceptance using a Firebase transaction, preventing two drivers 
  from accepting the same ride simultaneously
- Vehicle-tiered fare estimates (bike/auto/car) shown before booking, calculated 
  from actual route distance
- Location search (type a place name instead of only tapping the map)
- Star ratings for drivers, with a running average shown on their profile
- Trip receipts with a full fare breakdown
- Ride history for both customers and drivers
- Cancel ride (before pickup/in-progress)
- SOS emergency call button during an active ride
- One-tap Call and pre-filled WhatsApp handoff between customer and driver
- In-app toast, persistent status banner, and browser push notifications across 
  the full ride lifecycle (accepted, started, completed)
- Password reset and profile editing
- Admin dashboard showing every ride, filterable by status

## Tech stack

- Frontend: React + Vite
- Backend: Firebase (Authentication + Realtime Database) - no custom server
- Maps and routing: Leaflet.js + OSRM
- Geospatial matching: geofire-common (geohashing)
- Deployment: Vercel

## Why these choices

Firebase over a custom Node/Express backend: most of the backend work here is 
message-passing and auth. Firebase Realtime Database listeners do what a 
Socket.io server would, with no infrastructure to host or maintain.

OSRM over haversine distance: most ride-app clones fake ETA with straight-line 
distance. This app routes along actual roads for a realistic distance, duration, 
and fare.

Firebase transactions for ride acceptance: without this, two drivers tapping 
Accept at the same moment could both win the same ride. runTransaction performs 
an atomic read-check-write, closing that race condition without server-side 
locking.

GeoFire geohashing for driver matching: Realtime Database has no native 
geospatial query like MongoDB's $near. Geohashing solves this by encoding 
location into a string where nearby locations share string prefixes, letting 
range queries approximate a radius search.

## Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password) and Realtime Database (test mode)
3. Copy .env.example to .env and fill in your Firebase config
4. Set Realtime Database rules (see below)
5. Run: npm install
6. Run: npm run dev

### Database rules

\\\json
{
  "rules": {
    "users": {
      ".read": "auth != null",
      ".indexOn": ["geohash"],
      "\": {
        ".write": "auth != null && auth.uid === \"
      }
    },
    "rides": {
      ".read": "auth != null",
      ".write": "auth != null",
      ".indexOn": ["status", "pickup/geohash"]
    }
  }
}
\\\

## Project structure

- src/components - MapView, StatusBadge, StarRating, LocationSearch, ProtectedRoute
- src/context - AuthContext
- src/firebase - config, authService, rideService
- src/pages - Login, Register, CustomerDashboard, DriverDashboard, AdminDashboard, 
  RideHistory, Receipt, Profile
- src/styles - global.css

## Known limitations

- Location search uses OpenStreetMap's free Nominatim API, which has usage rate 
  limits; a production version would use a paid geocoding service for reliability
- Call and WhatsApp buttons hand off to the device's native apps rather than 
  sending automatically, since browsers cannot place calls or send messages 
  without a native business messaging API (e.g. Twilio)

## Roadmap

- Payment integration (Razorpay/UPI)
- Multi-stop and scheduled rides
- Native mobile app

## Author

Jeeva Soosairaj A - https://github.com/jeeva311204-jpg
