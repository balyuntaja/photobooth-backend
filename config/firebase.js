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

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // For Vercel: credentials stored as environment variable (JSON string)
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (error) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:", error);
    throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT environment variable");
  }
} else {
  // For local development: read from file
  try {
    const serviceAccountPath = path.join(__dirname, "../firebase-service-account.json");
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
  } catch (error) {
    console.error("Failed to read firebase-service-account.json:", error.message);
    throw new Error(
      "Firebase service account not found. " +
      "Either set FIREBASE_SERVICE_ACCOUNT environment variable or provide firebase-service-account.json file."
    );
  }
}

// Check if Firebase app is already initialized (for serverless hot-reload)
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_BUCKET,
  });
}

const bucket = admin.storage().bucket();

export { bucket };

