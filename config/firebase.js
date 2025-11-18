import admin from "firebase-admin";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Get Firebase service account credentials
// Priority: 1. Environment variable (for Vercel/serverless), 2. File (for local development)
let serviceAccount;
let bucket;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // For Vercel: credentials stored as environment variable (JSON string)
    console.log("📦 Using FIREBASE_SERVICE_ACCOUNT from environment variable");
    try {
      const envValue = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      serviceAccount = JSON.parse(envValue);
      console.log("✅ Successfully parsed FIREBASE_SERVICE_ACCOUNT");
    } catch (error) {
      console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:", error.message);
      console.error("Value length:", process.env.FIREBASE_SERVICE_ACCOUNT?.length);
      throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT environment variable: ${error.message}`);
    }
  } else {
    // For local development: read from file
    console.log("📂 Reading firebase-service-account.json from file system");
    try {
      const serviceAccountPath = path.join(__dirname, "../firebase-service-account.json");
      serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
      console.log("✅ Successfully loaded firebase-service-account.json");
    } catch (error) {
      console.error("❌ Failed to read firebase-service-account.json:", error.message);
      throw new Error(
        `Firebase service account not found: ${error.message}. ` +
        "Either set FIREBASE_SERVICE_ACCOUNT environment variable or provide firebase-service-account.json file."
      );
    }
  }

  // Validate required fields
  if (!serviceAccount?.project_id) {
    throw new Error("Service account is missing required field: project_id");
  }

  // Check if Firebase app is already initialized (for serverless hot-reload)
  if (admin.apps.length === 0) {
    let storageBucket = process.env.FIREBASE_BUCKET;
    
    if (!storageBucket) {
      throw new Error("FIREBASE_BUCKET environment variable is required");
    }

    // Remove gs:// prefix if present (Firebase Admin SDK doesn't need it)
    if (storageBucket.startsWith("gs://")) {
      storageBucket = storageBucket.replace("gs://", "");
      console.log("⚠️  Removed gs:// prefix from FIREBASE_BUCKET");
    }

    console.log(`🚀 Initializing Firebase Admin for project: ${serviceAccount.project_id}`);
    console.log(`📦 Storage bucket: ${storageBucket}`);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: storageBucket,
    });
    
    console.log("✅ Firebase Admin initialized successfully");
  } else {
    console.log("ℹ️  Firebase Admin already initialized, reusing existing instance");
  }

  bucket = admin.storage().bucket();
  console.log("✅ Firebase Storage bucket ready");
} catch (error) {
  console.error("💥 Fatal error initializing Firebase:", error);
  console.error("Stack:", error.stack);
  // Don't throw here, let it be handled by the caller
  // But log detailed error for debugging
  throw error;
}

export { bucket };

