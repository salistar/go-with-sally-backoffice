# Go With Sally - Backend API

Women-only ride-hailing backend API for Morocco 🚗💖🇲🇦

## Prerequisites

- Node.js >= 18
- MongoDB 
- Redis (optional, for caching)

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

## Running

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

## API Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/verify-phone
- POST /api/auth/verify-face
- POST /api/auth/logout

### Users
- GET /api/users/me
- PUT /api/users/me
- GET /api/users/emergency-contacts

### Drivers
- GET /api/drivers/me
- POST /api/drivers/online
- POST /api/drivers/offline
- GET /api/drivers/earnings

### Rides
- POST /api/rides/request
- GET /api/rides/:id
- POST /api/rides/:id/cancel
- POST /api/rides/:id/sos
- GET /api/rides/user/history

## Tech Stack

- Express.js
- MongoDB + Mongoose
- Redis (caching)
- Socket.IO (real-time)
- JWT Authentication
- TensorFlow.js (face recognition)
