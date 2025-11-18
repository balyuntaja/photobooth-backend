import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";

import uploadRoutes from "./routes/uploadRoutes.js";
import printRoutes from "./routes/printRoutes.js";

dotenv.config();

const app = express();

app.use(helmet());

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

const corsOptions = {
  origin: allowedOrigins === "*" ? "*" : allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["X-API-Key", "Content-Type"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));

app.use("/", uploadRoutes);
app.use("/", printRoutes);

// Export the app for Vercel serverless functions
export default app;

// Only start server if not in serverless mode (Vercel)
// Vercel sets VERCEL env variable automatically
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

