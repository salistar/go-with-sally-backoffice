// GoWithSally - Index Creation Script
// Creates all necessary indexes for optimal query performance

print("========================================");
print("GoWithSally - Creating Indexes");
print("========================================");

const dbName = process.env.MONGO_INITDB_DATABASE || "gowithsally";
db = db.getSiblingDB(dbName);

// ============ USERS INDEXES ============
print("\n[1/8] Users indexes...");
db.users.createIndex({ email: 1 }, { unique: true, sparse: true, name: "idx_users_email" });
db.users.createIndex({ phone: 1 }, { unique: true, name: "idx_users_phone" });
db.users.createIndex({ role: 1 }, { name: "idx_users_role" });
db.users.createIndex({ createdAt: -1 }, { name: "idx_users_created" });
db.users.createIndex({ isActive: 1, role: 1 }, { name: "idx_users_active_role" });
db.users.createIndex({ "currentLocation": "2dsphere" }, { name: "idx_users_location", sparse: true });
db.users.createIndex({ phoneVerified: 1, emailVerified: 1, faceVerified: 1 }, { name: "idx_users_verification" });
print("  -> 7 indexes created");

// ============ DRIVERS INDEXES ============
print("\n[2/8] Drivers indexes...");
db.drivers.createIndex({ user: 1 }, { unique: true, name: "idx_drivers_user" });
db.drivers.createIndex({ status: 1 }, { name: "idx_drivers_status" });
db.drivers.createIndex({ isOnline: 1, isAvailable: 1 }, { name: "idx_drivers_availability" });
db.drivers.createIndex({ "vehicle.plateNumber": 1 }, { unique: true, sparse: true, name: "idx_drivers_plate" });
db.drivers.createIndex({ "currentLocation": "2dsphere" }, { name: "idx_drivers_location", sparse: true });
db.drivers.createIndex({ status: 1, isOnline: 1, isAvailable: 1 }, { name: "idx_drivers_active" });
db.drivers.createIndex({ "statistics.averageRating": -1 }, { name: "idx_drivers_rating" });
db.drivers.createIndex({ createdAt: -1 }, { name: "idx_drivers_created" });
print("  -> 8 indexes created");

// ============ RIDES INDEXES ============
print("\n[3/8] Rides indexes...");
db.rides.createIndex({ user: 1, createdAt: -1 }, { name: "idx_rides_user" });
db.rides.createIndex({ driver: 1, createdAt: -1 }, { name: "idx_rides_driver" });
db.rides.createIndex({ status: 1 }, { name: "idx_rides_status" });
db.rides.createIndex({ rideNumber: 1 }, { unique: true, sparse: true, name: "idx_rides_number" });
db.rides.createIndex({ serviceType: 1, status: 1 }, { name: "idx_rides_service_status" });
db.rides.createIndex({ createdAt: -1 }, { name: "idx_rides_created" });
db.rides.createIndex({ "pickup.coordinates": "2dsphere" }, { name: "idx_rides_pickup_location", sparse: true });
db.rides.createIndex({ "dropoff.coordinates": "2dsphere" }, { name: "idx_rides_dropoff_location", sparse: true });
db.rides.createIndex({ user: 1, status: 1 }, { name: "idx_rides_user_status" });
db.rides.createIndex({ driver: 1, status: 1 }, { name: "idx_rides_driver_status" });
print("  -> 10 indexes created");

// ============ MESSAGES INDEXES ============
print("\n[4/8] Messages indexes...");
db.messages.createIndex({ conversationId: 1, createdAt: -1 }, { name: "idx_messages_conversation" });
db.messages.createIndex({ sender: 1, recipient: 1 }, { name: "idx_messages_participants" });
db.messages.createIndex({ rideId: 1, createdAt: -1 }, { name: "idx_messages_ride", sparse: true });
db.messages.createIndex({ recipient: 1, status: 1 }, { name: "idx_messages_unread" });
print("  -> 4 indexes created");

// ============ CONVERSATIONS INDEXES ============
print("\n[5/8] Conversations indexes...");
db.conversations.createIndex({ participants: 1 }, { name: "idx_conversations_participants" });
db.conversations.createIndex({ rideId: 1 }, { name: "idx_conversations_ride", sparse: true });
db.conversations.createIndex({ updatedAt: -1 }, { name: "idx_conversations_updated" });
print("  -> 3 indexes created");

// ============ SERVICES INDEXES ============
print("\n[6/8] Services indexes...");
db.services.createIndex({ type: 1 }, { unique: true, name: "idx_services_type" });
db.services.createIndex({ isActive: 1, displayOrder: 1 }, { name: "idx_services_active" });
print("  -> 2 indexes created");

// ============ BADGES INDEXES ============
print("\n[7/8] Badges indexes...");
db.badges.createIndex({ userId: 1 }, { unique: true, name: "idx_badges_user" });
db.badges.createIndex({ level: 1 }, { name: "idx_badges_level" });
print("  -> 2 indexes created");

// ============ PRICE PROPOSALS INDEXES ============
print("\n[8/8] Price proposals indexes...");
db.priceproposals.createIndex({ userId: 1, createdAt: -1 }, { name: "idx_proposals_user" });
db.priceproposals.createIndex({ status: 1 }, { name: "idx_proposals_status" });
db.priceproposals.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600, name: "idx_proposals_ttl" });
print("  -> 3 indexes created");

print("\n========================================");
print("All indexes created successfully!");
print("Total: 39 indexes across 8 collections");
print("========================================");
