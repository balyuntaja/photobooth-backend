import { Router } from "express";

import { uploadMedia, viewMedia } from "../controllers/mediaController.js";
import authenticateApiKey from "../middleware/authenticateApiKey.js";
import upload from "../middleware/upload.js";
import { uploadLimiter, viewLimiter } from "../middleware/rateLimiters.js";

const router = Router();

router.post("/upload", authenticateApiKey, uploadLimiter, upload.any(), uploadMedia);
router.get("/view", viewLimiter, viewMedia);

export default router;

