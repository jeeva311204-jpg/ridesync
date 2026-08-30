# RideSync

A real-time ride-tracking web app - request a ride, get matched with a nearby driver, and watch their live location on a map. Built as a portfolio project covering real-time systems, geolocation, and serverless architecture.

## Features
- Real-time ride matching via Firebase Realtime Database
- Live GPS tracking on a map
- Real road routing and ETA via OSRM
- Atomic ride acceptance (Firebase transaction, prevents double-booking)
- Automatic fare calculation
- In-app and browser push notifications
- Call and WhatsApp handoff between customer and driver
- Admin dashboard of all rides

## Tech stack
Frontend: React + Vite. Backend: Firebase (Auth + Realtime Database). Maps: Leaflet.js + OSRM.

## Setup
1. Create a Firebase project, enable Email/Password Auth and Realtime Database
2. Copy .env.example to .env and fill in your Firebase config
3. npm install
4. npm run dev

## Author
Jeeva Soosairaj A - https://github.com/jeeva311204-jpg
