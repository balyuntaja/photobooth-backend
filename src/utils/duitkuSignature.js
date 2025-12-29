import crypto from "crypto";

export const generateDuitkuSignature = (
  merchantCode,
  merchantOrderId,
  amount,
  apiKey
) => {
  return crypto
    .createHash("md5")
    .update(merchantCode + merchantOrderId + amount + apiKey)
    .digest("hex");
};

/**
 * Verify Duitku callback signature
 * @param {Object} callbackData - Callback data from Duitku
 * @param {string} apiKey - Duitku API key
 * @returns {boolean} - True if signature is valid
 */
export const verifyDuitkuCallback = (callbackData, apiKey) => {
  const { merchantCode, merchantOrderId, paymentAmount, signature } = callbackData;

  if (!merchantCode || !merchantOrderId || !paymentAmount || !signature) {
    return false;
  }

  const expectedSignature = generateDuitkuSignature(
    merchantCode,
    merchantOrderId,
    paymentAmount,
    apiKey
  );

  return signature === expectedSignature;
};
