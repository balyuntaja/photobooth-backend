import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";

import uploadRoutes from "./routes/uploadRoutes.js";

// Import Firebase config - will fail fast if credentials are missing
import "../config/firebase.js";

dotenv.config();

const app = express();

// Default allowed origins (always included)
const defaultOrigins = [
  "https://receiptbooth-photomate.netlify.app",
];

// Get additional origins from environment variable
const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
  : [];

// Determine allowed origins
let allowedOrigins;
if (envOrigins.length === 0 && !process.env.ALLOWED_ORIGINS) {
  // If ALLOWED_ORIGINS is not set, allow all origins (development mode)
  allowedOrigins = "*";
} else if (envOrigins.includes("*")) {
  // If "*" is explicitly set, allow all origins
  allowedOrigins = "*";
} else {
  // Combine default and environment origins
  allowedOrigins = [...defaultOrigins, ...envOrigins];
}

// CORS must be configured before helmet to prevent header conflicts
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Always allow Netlify origin
    if (origin === "https://receiptbooth-photomate.netlify.app") {
      return callback(null, true);
    }
    
    // If all origins are allowed (development mode)
    if (allowedOrigins === "*") {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}. Allowed origins:`, allowedOrigins);
      // For debugging, allow but log warning. In production, you can block with:
      // callback(new Error(`Origin ${origin} not allowed by CORS`));
      callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["X-API-Key", "Content-Type", "Authorization"],
  exposedHeaders: [],
  optionsSuccessStatus: 200,
  preflightContinue: false,
};

app.use(cors(corsOptions));

// Note: cors() middleware automatically handles OPTIONS requests, so no need for manual handler

// Configure helmet to not interfere with CORS
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Disable CSP to avoid CORS issues
  })
);
app.use(express.json({ limit: "10mb" }));

app.use("/", uploadRoutes);

// Export the app for Vercel serverless functions
export default app;

// Only start server if not in serverless mode (Vercel)
// Vercel sets VERCEL env variable automatically
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

