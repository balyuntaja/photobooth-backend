import { Router } from "express";

import { uploadMedia, viewMedia, getAllPhotos } from "../controllers/mediaController.js";
import authenticateApiKey from "../middleware/authenticateApiKey.js";
import upload from "../middleware/upload.js";
import { uploadLimiter, viewLimiter } from "../middleware/rateLimiters.js";

const router = Router();

// Handle OPTIONS preflight requests for CORS (must be before other routes)
router.options("/upload", (req, res) => {
  res.sendStatus(200);
});

router.options("/view", (req, res) => {
  res.sendStatus(200);
});

router.options("/photos", (req, res) => {
  res.sendStatus(200);
});

router.post("/upload", authenticateApiKey, uploadLimiter, upload.any(), uploadMedia);
router.get("/view", viewLimiter, viewMedia);
router.get("/photos", viewLimiter, getAllPhotos);

export default router;

