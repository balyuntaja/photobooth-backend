import express from "express";
import {
  createPayment,
  duitkuCallback
} from "../controllers/paymentController.js";

const router = express.Router();

router.post("/qris", createPayment);
router.post("/callback", duitkuCallback);

export default router;
