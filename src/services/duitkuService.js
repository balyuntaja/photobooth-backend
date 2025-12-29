import axios from "axios";
import { generateDuitkuSignature } from "../utils/duitkuSignature.js";

/**
 * Validate required Duitku environment variables
 */
const validateDuitkuEnv = () => {
  const required = ['DUITKU_MERCHANT_CODE', 'DUITKU_API_KEY', 'DUITKU_BASE_URL', 'BASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required Duitku environment variables: ${missing.join(', ')}`);
  }
};

/**
 * Create QRIS payment via Duitku
 * @param {Object} params - Payment parameters
 * @param {string} params.orderId - Merchant order ID
 * @param {number|string} params.amount - Payment amount
 * @returns {Promise<Object>} - Duitku payment response
 */
export const createQrisPayment = async ({ orderId, amount }) => {
  // Validate environment variables
  validateDuitkuEnv();

  const merchantCode = process.env.DUITKU_MERCHANT_CODE;
  const apiKey = process.env.DUITKU_API_KEY;
  const baseUrl = process.env.DUITKU_BASE_URL;

  // Convert amount to string for signature (Duitku expects string)
  const amountStr = String(amount);

  console.log(`[Payment] Creating QRIS payment: orderId=${orderId}, amount=${amountStr}`);

  const signature = generateDuitkuSignature(
    merchantCode,
    orderId,
    amountStr,
    apiKey
  );

  const payload = {
    merchantCode,
    paymentAmount: amountStr,
    paymentMethod: "SP",
    merchantOrderId: orderId,
    productDetails: "Receipt Photobooth",
    callbackUrl: `${process.env.BASE_URL}/api/payment/callback`,
    returnUrl: `${process.env.BASE_URL}/payment-success`,
    signature
  };

  try {
    const { data } = await axios.post(
      `${baseUrl}/webapi/api/merchant/v2/inquiry`,
      payload
    );

    if (data.statusCode !== "00") {
      console.error(`[Payment] Duitku API error: ${data.statusCode} - ${data.statusMessage}`);
      throw new Error(data.statusMessage || "Payment creation failed");
    }

    console.log(`[Payment] Payment created successfully: orderId=${orderId}, reference=${data.reference}`);
    return data;
  } catch (error) {
    console.error(`[Payment] Error creating payment for orderId=${orderId}:`, {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    // Re-throw with more context
    if (error.response?.data) {
      throw new Error(error.response.data.statusMessage || error.message);
    }
    throw error;
  }
};
