// ============================================================
// 📄 rideSocket.js — GoWithSally Backend
// LOG SUMMARY:
//   • console.log('rideSocket.js ▶ Module loaded')
//   • Real-time ride events via Socket.IO
// ============================================================

console.log('📄 [rideSocket.js] ▶ Module loaded');

/**
 * Setup ride-related socket events
 */
const setupRideSocket = (io, socket, user) => {
  console.log(`📄 [rideSocket.js] ▶ Setting up ride socket for user: ${user.id}`);

  // ─────────────────────────────────────────────────────────────────────────
  // DRIVER LOCATION UPDATES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * driver:location-update
   * Driver sends their real-time location during active ride
   */
  socket.on('driver:location-update', (data) => {
    console.log('📄 [rideSocket.js] ▶ driver:location-update event received');

    try {
      const { rideId, latitude, longitude, bearing, speed, accuracy } = data;

      if (!rideId || latitude === undefined || longitude === undefined) {
        console.error('rideSocket.js ▶ Invalid location data');
        socket.emit('error', { message: 'Invalid location data' });
        return;
      }

      // Broadcast location to passenger in the ride
      io.to(`ride:${rideId}`).emit('driver:location-updated', {
        rideId,
        location: {
          latitude,
          longitude,
          bearing,
          speed,
          accuracy,
        },
        timestamp: new Date().toISOString(),
      });

      console.log(`rideSocket.js ▶ Location broadcast for ride: ${rideId}`);
    } catch (error) {
      console.error('rideSocket.js ▶ driver:location-update error:', error);
      socket.emit('error', { message: 'Error updating location' });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // RIDE STATUS CHANGES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * ride:status-change
   * Notify users about ride status updates
   */
  socket.on('ride:status-change', (data) => {
    console.log('📄 [rideSocket.js] ▶ ride:status-change event received');

    try {
      const { rideId, status, previousStatus, reason } = data;

      if (!rideId || !status) {
        console.error('rideSocket.js ▶ Invalid status data');
        return;
      }

      io.to(`ride:${rideId}`).emit('ride:status-updated', {
        rideId,
        status,
        previousStatus,
        reason,
        timestamp: new Date().toISOString(),
      });

      console.log(`rideSocket.js ▶ Status updated for ride: ${rideId} -> ${status}`);
    } catch (error) {
      console.error('rideSocket.js ▶ ride:status-change error:', error);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DRIVER AVAILABILITY
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * driver:available-rides
   * Notify driver of nearby ride requests
   */
  socket.on('driver:request-available-rides', (data) => {
    console.log('📄 [rideSocket.js] ▶ driver:request-available-rides event received');

    try {
      const { latitude, longitude, radius = 5 } = data;

      if (latitude === undefined || longitude === undefined) {
        console.error('rideSocket.js ▶ Invalid coordinates');
        return;
      }

      // In real implementation, query database for nearby rides
      // For now, just acknowledge the request
      socket.emit('driver:available-rides-response', {
        latitude,
        longitude,
        radius,
        rides: [], // Would be populated from database
        timestamp: new Date().toISOString(),
      });

      console.log('rideSocket.js ▶ Available rides requested for location');
    } catch (error) {
      console.error('rideSocket.js ▶ driver:request-available-rides error:', error);
    }
  });

  /**
   * driver:toggle-availability
   * Driver goes online/offline
   */
  socket.on('driver:toggle-availability', (data) => {
    console.log('📄 [rideSocket.js] ▶ driver:toggle-availability event received');

    try {
      const { available, latitude, longitude } = data;

      // Broadcast driver availability to all clients
      io.emit('driver:availability-changed', {
        driverId: user.id,
        available,
        location: available ? { latitude, longitude } : null,
        timestamp: new Date().toISOString(),
      });

      console.log(
        `rideSocket.js ▶ Driver ${user.id} availability: ${available}`
      );
    } catch (error) {
      console.error('rideSocket.js ▶ driver:toggle-availability error:', error);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PASSENGER RIDE ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * passenger:cancel-ride
   * Passenger cancels active ride
   */
  socket.on('passenger:cancel-ride', (data) => {
    console.log('📄 [rideSocket.js] ▶ passenger:cancel-ride event received');

    try {
      const { rideId, reason } = data;

      if (!rideId) {
        console.error('rideSocket.js ▶ Missing ride ID');
        return;
      }

      // Broadcast cancellation to driver in the ride
      io.to(`ride:${rideId}`).emit('ride:cancelled-by-passenger', {
        rideId,
        reason,
        cancelledBy: user.id,
        timestamp: new Date().toISOString(),
      });

      console.log(`rideSocket.js ▶ Ride cancelled by passenger: ${rideId}`);
    } catch (error) {
      console.error('rideSocket.js ▶ passenger:cancel-ride error:', error);
      socket.emit('error', { message: 'Error cancelling ride' });
    }
  });

  /**
   * passenger:emergency-alert
   * Passenger triggers emergency alert
   */
  socket.on('passenger:emergency-alert', (data) => {
    console.log('📄 [rideSocket.js] ▶ passenger:emergency-alert event received');

    try {
      const { rideId, reason, location } = data;

      if (!rideId) {
        console.error('rideSocket.js ▶ Missing ride ID');
        return;
      }

      // Broadcast emergency alert
      io.to(`ride:${rideId}`).emit('ride:emergency-alert', {
        rideId,
        passengerId: user.id,
        reason,
        location,
        timestamp: new Date().toISOString(),
      });

      // Also notify admins
      io.to('admin').emit('emergency:passenger-alert', {
        rideId,
        passengerId: user.id,
        reason,
        location,
      });

      console.log(`rideSocket.js ▶ Emergency alert for ride: ${rideId}`);
    } catch (error) {
      console.error('rideSocket.js ▶ passenger:emergency-alert error:', error);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // RIDE ROOM MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * ride:join-room
   * User joins ride-specific room for updates
   */
  socket.on('ride:join-room', (data) => {
    console.log('📄 [rideSocket.js] ▶ ride:join-room event received');

    try {
      const { rideId } = data;

      if (!rideId) {
        return;
      }

      socket.join(`ride:${rideId}`);
      console.log(`rideSocket.js ▶ User ${user.id} joined room: ride:${rideId}`);

      // Notify others in the room
      socket.to(`ride:${rideId}`).emit('ride:user-joined', {
        rideId,
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('rideSocket.js ▶ ride:join-room error:', error);
    }
  });

  /**
   * ride:leave-room
   * User leaves ride-specific room
   */
  socket.on('ride:leave-room', (data) => {
    console.log('📄 [rideSocket.js] ▶ ride:leave-room event received');

    try {
      const { rideId } = data;

      if (!rideId) {
        return;
      }

      socket.leave(`ride:${rideId}`);
      console.log(`rideSocket.js ▶ User ${user.id} left room: ride:${rideId}`);

      socket.to(`ride:${rideId}`).emit('ride:user-left', {
        rideId,
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('rideSocket.js ▶ ride:leave-room error:', error);
    }
  });

  console.log('📄 [rideSocket.js] ▶ Ride socket handlers registered');
};

module.exports = setupRideSocket;
