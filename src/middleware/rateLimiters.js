import rateLimit from "express-rate-limit";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const uploadLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 100,
  message: "Too many upload requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const viewLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 200,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export { uploadLimiter, viewLimiter };

