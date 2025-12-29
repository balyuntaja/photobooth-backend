import { createQrisPayment } from "../services/duitkuService.js";
import { verifyDuitkuCallback } from "../utils/duitkuSignature.js";

// Store processed transactions to prevent duplicate processing (idempotent)
// In production, use database instead
const processedTransactions = new Set();

/**
 * Create QRIS payment
 */
export const createPayment = async (req, res) => {
  try {
    const { amount, orderId } = req.body;

    // Input validation
    if (!amount || !orderId) {
      return res.status(400).json({
        success: false,
        message: "amount dan orderId wajib"
      });
    }

    // Validate amount format and value
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        message: "amount harus berupa angka positif"
      });
    }

    // Validate orderId format
    if (typeof orderId !== 'string' || orderId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "orderId harus berupa string yang valid"
      });
    }

    // Validate orderId length (prevent too long)
    if (orderId.length > 100) {
      return res.status(400).json({
        success: false,
        message: "orderId maksimal 100 karakter"
      });
    }

    // Sanitize orderId (remove whitespace)
    const sanitizedOrderId = orderId.trim();

    // Check if orderId already exists (prevent duplicate)
    // TODO: In production, check database instead
    if (processedTransactions.has(sanitizedOrderId)) {
      return res.status(400).json({
        success: false,
        message: "orderId sudah pernah digunakan"
      });
    }

    console.log(`[Payment] Create payment request: orderId=${sanitizedOrderId}, amount=${amountNum}`);

    const result = await createQrisPayment({ 
      amount: amountNum, 
      orderId: sanitizedOrderId 
    });

    res.json({
      success: true,
      qrString: result.qrString,
      reference: result.reference
    });
  } catch (err) {
    console.error("[Payment] Create payment error:", {
      error: err.message,
      stack: err.stack,
      body: req.body
    });

    // Don't expose internal error details
    const statusCode = err.response?.status || 500;
    const message = statusCode === 500 
      ? "Internal server error" 
      : err.message;

    res.status(statusCode).json({
      success: false,
      message
    });
  }
};

/**
 * Handle callback from Duitku
 * This endpoint receives payment status updates from Duitku
 */
export const duitkuCallback = async (req, res) => {
  try {
    const callbackData = req.body;
    const apiKey = process.env.DUITKU_API_KEY;

    // Log callback received
    console.log(`[Payment] Callback received:`, {
      merchantOrderId: callbackData.merchantOrderId,
      resultCode: callbackData.resultCode,
      timestamp: new Date().toISOString()
    });

    // Validate required fields
    if (!callbackData.merchantOrderId || !callbackData.resultCode) {
      console.error("[Payment] Invalid callback data: missing required fields");
      return res.status(400).send("Invalid callback data");
    }

    // CRITICAL: Verify signature to ensure callback is from Duitku
    if (!apiKey) {
      console.error("[Payment] DUITKU_API_KEY not configured");
      return res.status(500).send("Server configuration error");
    }

    const isValidSignature = verifyDuitkuCallback(callbackData, apiKey);
    
    if (!isValidSignature) {
      console.error(`[Payment] Invalid callback signature for orderId=${callbackData.merchantOrderId}`);
      return res.status(400).send("Invalid signature");
    }

    const { merchantOrderId, resultCode, paymentAmount } = callbackData;

    // Check if transaction already processed (idempotent)
    // TODO: In production, check database instead
    if (processedTransactions.has(merchantOrderId)) {
      console.log(`[Payment] Transaction already processed: orderId=${merchantOrderId}`);
      return res.send("OK");
    }

    // Process based on result code
    if (resultCode === "00") {
      // Payment successful
      console.log(`[Payment] Payment successful: orderId=${merchantOrderId}, amount=${paymentAmount}`);
      
      // Mark as processed
      processedTransactions.add(merchantOrderId);

      // TODO: Update status transaksi = PAID in database
      // TODO: Unlock print / upload final
      // Example:
      // await updateTransactionStatus(merchantOrderId, 'PAID');
      // await unlockPrintAccess(merchantOrderId);
      
    } else {
      // Payment failed or other status
      console.log(`[Payment] Payment failed: orderId=${merchantOrderId}, resultCode=${resultCode}`);
      
      // Mark as processed to prevent retry loops
      processedTransactions.add(merchantOrderId);

      // TODO: Update status transaksi = FAILED in database
      // Example:
      // await updateTransactionStatus(merchantOrderId, 'FAILED', resultCode);
    }

    // Always return "OK" to Duitku (required by Duitku)
    res.send("OK");
  } catch (error) {
    console.error("[Payment] Callback error:", {
      error: error.message,
      stack: error.stack,
      body: req.body
    });

    // Still return "OK" to prevent Duitku from retrying
    // But log the error for investigation
    res.send("OK");
  }
};
