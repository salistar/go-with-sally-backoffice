// GoWithSally - Database Initialization Script
// Creates database, user, and collections with validation

print("========================================");
print("GoWithSally - Database Initialization");
print("========================================");

const dbName = process.env.MONGO_INITDB_DATABASE || "gowithsally";
db = db.getSiblingDB(dbName);

// Create application user
print("\n[1/4] Creating application user...");
db.createUser({
  user: "gws_app",
  pwd: "gws_app_secure_2024",
  roles: [
    { role: "readWrite", db: dbName },
    { role: "dbAdmin", db: dbName }
  ]
});

// Create read-only user for analytics
db.createUser({
  user: "gws_readonly",
  pwd: "gws_readonly_2024",
  roles: [
    { role: "read", db: dbName }
  ]
});

print("  -> Users created successfully");

// Create collections with validators
print("\n[2/4] Creating collections with validation schemas...");

// Users Collection
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["firstName", "lastName", "phone", "role", "createdAt"],
      properties: {
        firstName: { bsonType: "string", minLength: 2, maxLength: 50 },
        lastName: { bsonType: "string", minLength: 2, maxLength: 50 },
        email: { bsonType: "string" },
        phone: { bsonType: "string", pattern: "^\\+212[0-9]{9}$" },
        password: { bsonType: "string" },
        role: { enum: ["user", "driver", "admin", "sub_admin", "support"] },
        avatar: { bsonType: "string" },
        dateOfBirth: { bsonType: "date" },
        preferredLanguage: { enum: ["fr", "ar", "en"] },
        emailVerified: { bsonType: "bool" },
        phoneVerified: { bsonType: "bool" },
        faceVerified: { bsonType: "bool" },
        genderVerified: { bsonType: "bool" },
        isActive: { bsonType: "bool" },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});

// Drivers Collection
db.createCollection("drivers", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user", "status", "createdAt"],
      properties: {
        user: { bsonType: "objectId" },
        status: { enum: ["pending_documents", "pending_verification", "under_review", "approved", "suspended", "rejected"] },
        isOnline: { bsonType: "bool" },
        isAvailable: { bsonType: "bool" },
        createdAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});

// Rides Collection
db.createCollection("rides", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user", "status", "serviceType", "createdAt"],
      properties: {
        user: { bsonType: "objectId" },
        driver: { bsonType: "objectId" },
        status: { enum: ["searching", "driver_assigned", "driver_arriving", "driver_arrived", "pickup_verified", "in_progress", "arriving", "completed", "cancelled", "no_driver"] },
        serviceType: { enum: ["sally_eco", "sally_standard", "sally_confort", "sally_pool"] },
        createdAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});

// Messages Collection
db.createCollection("messages", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["conversationId", "sender", "type", "createdAt"],
      properties: {
        conversationId: { bsonType: "objectId" },
        sender: { bsonType: "objectId" },
        recipient: { bsonType: "objectId" },
        type: { enum: ["text", "image", "audio", "video", "file", "location"] },
        content: { bsonType: "string" },
        status: { enum: ["sending", "sent", "delivered", "read", "failed"] },
        createdAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
});

// Conversations Collection
db.createCollection("conversations");

// Services Collection
db.createCollection("services");

// Badges Collection
db.createCollection("badges");

// Price Proposals Collection
db.createCollection("priceproposals");

// OTPs Collection
db.createCollection("otps");

// Notifications Collection
db.createCollection("notifications");

// Admin Logs Collection
db.createCollection("adminlogs");

// Payments Collection
db.createCollection("payments");

print("  -> All collections created successfully");

// Create TTL indexes for auto-expiring data
print("\n[3/4] Creating TTL indexes...");
db.otps.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });
db.notifications.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 7776000 }); // 90 days

print("  -> TTL indexes created");

// Set profiling
print("\n[4/4] Configuring profiling...");
db.setProfilingLevel(1, { slowms: 100 });

print("\n========================================");
print("Database initialization complete!");
print("========================================");
