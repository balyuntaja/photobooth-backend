import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";

import uploadRoutes from "./routes/uploadRoutes.js";
import printRoutes from "./routes/printRoutes.js";

dotenv.config();

const app = express();

app.use(helmet());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
  : ["*"];

const corsOptions = {
  origin: allowedOrigins.length === 1 && allowedOrigins[0] === "*" ? "*" : allowedOrigins,
  credentials: true,
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

