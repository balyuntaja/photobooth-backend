import rateLimit from "express-rate-limit";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

// Custom keyGenerator to properly handle proxy headers
// After setting trust proxy in Express, req.ip will automatically use X-Forwarded-For
const keyGenerator = (req) => {
  // Use req.ip which will be set correctly after trust proxy is enabled
  // Fallback to connection remoteAddress if needed
  return req.ip || req.connection?.remoteAddress || 'unknown';
};

const uploadLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 100,
  message: "Too many upload requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
});

const viewLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 200,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
});

export { uploadLimiter, viewLimiter };

