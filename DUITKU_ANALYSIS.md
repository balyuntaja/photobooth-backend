# Analisis Implementasi Duitku Payment Gateway

## 📋 Ringkasan Implementasi

### File yang Terlibat:
1. `src/services/duitkuService.js` - Service untuk create payment
2. `src/controllers/paymentController.js` - Controller untuk handle request
3. `src/routes/paymentRoutes.js` - Route definitions
4. `src/utils/duitkuSignature.js` - Signature generation utility

---

## ✅ Yang Sudah Benar

### 1. **Struktur Code**
- ✅ Separation of concerns (Service, Controller, Route)
- ✅ Signature generation terpisah di utility
- ✅ Environment variables untuk credentials

### 2. **Create Payment Flow**
- ✅ Signature generation menggunakan MD5 hash
- ✅ Format signature: `merchantCode + merchantOrderId + amount + apiKey`
- ✅ Endpoint Duitku: `/webapi/api/merchant/v2/inquiry`
- ✅ Payload structure terlihat benar
- ✅ Error handling untuk statusCode !== "00"

### 3. **Route Setup**
- ✅ Route `/api/payment/qris` untuk create payment
- ✅ Route `/api/payment/callback` untuk callback dari Duitku
- ✅ Route terpisah di `/api/payment`

---

## ⚠️ Masalah Keamanan KRITIS

### 1. **Callback Handler Tidak Memverifikasi Signature** 🔴

**Masalah:**
```javascript
// src/controllers/paymentController.js - Line 30-40
export const duitkuCallback = async (req, res) => {
  const { merchantOrderId, resultCode } = req.body;

  if (resultCode === "00") {
    // TODO: update status transaksi = PAID
  }

  res.send("OK");
};
```

**Risiko:**
- ❌ Siapa saja bisa mengirim POST request ke `/api/payment/callback`
- ❌ Bisa fake payment dengan mengirim `resultCode: "00"`
- ❌ Tidak ada verifikasi bahwa callback benar-benar dari Duitku
- ❌ **SANGAT BERBAHAYA** - bisa di-exploit untuk mark payment as paid tanpa bayar

**Solusi yang Diperlukan:**
```javascript
// Perlu verify signature dari Duitku sebelum update status
// Duitku mengirim signature di callback body
// Verify dengan: MD5(merchantCode + merchantOrderId + amount + apiKey)
```

---

### 2. **Missing Input Validation**

**Masalah:**
- ❌ Tidak ada validasi format `amount` (harus number, harus > 0)
- ❌ Tidak ada validasi format `orderId` (harus unique, format tertentu)
- ❌ Tidak ada sanitization input

**Risiko:**
- Bisa kirim amount negatif atau 0
- Bisa kirim orderId dengan format aneh
- Potential injection attacks

---

### 3. **Error Handling Kurang Detail**

**Masalah:**
```javascript
// src/controllers/paymentController.js - Line 21-26
catch (err) {
  res.status(500).json({
    success: false,
    message: err.message
  });
}
```

**Risiko:**
- Error message bisa expose sensitive information
- Tidak ada logging untuk debugging
- Tidak ada handling untuk network errors

---

### 4. **Missing Environment Variables Validation**

**Masalah:**
- Tidak ada validasi apakah `DUITKU_MERCHANT_CODE`, `DUITKU_API_KEY`, `DUITKU_BASE_URL` sudah di-set
- Akan error di runtime jika env var tidak ada

---

## 🔍 Analisis Detail

### 1. Signature Generation

**Current Implementation:**
```javascript
// src/utils/duitkuSignature.js
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
```

**✅ Benar:**
- Menggunakan MD5 hash
- Format sesuai dokumentasi Duitku (biasanya: merchantCode + merchantOrderId + amount + apiKey)

**⚠️ Perlu Diperhatikan:**
- Pastikan `amount` dalam format yang benar (biasanya string atau number tanpa separator)
- Pastikan tidak ada whitespace atau formatting yang tidak perlu

---

### 2. Create Payment Request

**Current Implementation:**
```javascript
// src/services/duitkuService.js
const payload = {
  merchantCode,
  paymentAmount: amount,
  paymentMethod: "QRIS",
  merchantOrderId: orderId,
  productDetails: "Receipt Photobooth",
  callbackUrl: `${process.env.BASE_URL}/api/payment/callback`,
  returnUrl: `${process.env.BASE_URL}/payment-success`,
  signature
};
```

**✅ Benar:**
- Payload structure terlihat sesuai
- Signature sudah di-include
- Callback URL dan return URL sudah di-set

**⚠️ Perlu Diperhatikan:**
- Pastikan `BASE_URL` sudah di-set dengan benar
- Pastikan `paymentAmount` dalam format yang benar (biasanya number atau string tanpa separator)
- Pastikan `merchantOrderId` unique dan tidak pernah digunakan sebelumnya

---

### 3. Callback Handler

**Current Implementation:**
```javascript
// src/controllers/paymentController.js
export const duitkuCallback = async (req, res) => {
  const { merchantOrderId, resultCode } = req.body;

  if (resultCode === "00") {
    // TODO: update status transaksi = PAID
  }

  res.send("OK");
};
```

**❌ Masalah Besar:**
1. **Tidak verify signature** - CRITICAL SECURITY ISSUE
2. **Tidak handle error cases** - resultCode selain "00"
3. **Tidak log callback** - sulit untuk debugging
4. **TODO belum diimplementasi** - belum update status transaksi
5. **Tidak idempotent** - bisa dipanggil multiple times

**Callback dari Duitku biasanya mengirim:**
```javascript
{
  merchantCode: "...",
  merchantOrderId: "...",
  paymentAmount: "...",
  resultCode: "00", // atau error code
  signature: "...", // signature untuk verify
  // ... field lainnya
}
```

**Yang Harus Dilakukan:**
1. Verify signature dari Duitku
2. Check apakah transaksi sudah pernah diproses (idempotent)
3. Update status transaksi di database
4. Log callback untuk audit
5. Handle error cases

---

## 📝 Rekomendasi Perbaikan

### Priority 1: Security (CRITICAL)

#### 1. **Verify Callback Signature**
```javascript
// Perlu tambahkan function untuk verify callback signature
export const verifyDuitkuCallback = (callbackData, apiKey) => {
  const { merchantCode, merchantOrderId, paymentAmount, signature } = callbackData;
  
  const expectedSignature = generateDuitkuSignature(
    merchantCode,
    merchantOrderId,
    paymentAmount,
    apiKey
  );
  
  return signature === expectedSignature;
};
```

#### 2. **Update Callback Handler**
```javascript
export const duitkuCallback = async (req, res) => {
  try {
    const callbackData = req.body;
    
    // 1. Verify signature
    const isValid = verifyDuitkuCallback(callbackData, process.env.DUITKU_API_KEY);
    if (!isValid) {
      console.error("Invalid callback signature");
      return res.status(400).send("Invalid signature");
    }
    
    // 2. Check if already processed (idempotent)
    // TODO: Check database if transaction already processed
    
    // 3. Process based on resultCode
    if (callbackData.resultCode === "00") {
      // Update status to PAID
      // TODO: Update database
      console.log(`Payment successful: ${callbackData.merchantOrderId}`);
    } else {
      // Handle failed payment
      console.log(`Payment failed: ${callbackData.merchantOrderId}, code: ${callbackData.resultCode}`);
    }
    
    // 4. Always return "OK" to Duitku
    res.send("OK");
  } catch (error) {
    console.error("Callback error:", error);
    res.status(500).send("Error");
  }
};
```

---

### Priority 2: Input Validation

#### 1. **Validate Create Payment Input**
```javascript
export const createPayment = async (req, res) => {
  try {
    const { amount, orderId } = req.body;

    // Validation
    if (!amount || !orderId) {
      return res.status(400).json({
        success: false,
        message: "amount dan orderId wajib"
      });
    }

    // Validate amount
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        message: "amount harus berupa angka positif"
      });
    }

    // Validate orderId format (contoh: harus alphanumeric, max length, dll)
    if (typeof orderId !== 'string' || orderId.length > 100) {
      return res.status(400).json({
        success: false,
        message: "orderId format tidak valid"
      });
    }

    // Check if orderId already exists (prevent duplicate)
    // TODO: Check database

    // ... rest of code
  } catch (err) {
    // Better error handling
    console.error("Create payment error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
```

---

### Priority 3: Environment Variables

#### 1. **Validate Environment Variables**
```javascript
// Di startup atau di service
const requiredEnvVars = [
  'DUITKU_MERCHANT_CODE',
  'DUITKU_API_KEY',
  'DUITKU_BASE_URL',
  'BASE_URL'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});
```

---

### Priority 4: Logging & Monitoring

#### 1. **Add Logging**
```javascript
// Log semua payment requests
console.log(`[Payment] Create payment request: orderId=${orderId}, amount=${amount}`);

// Log callback dari Duitku
console.log(`[Payment] Callback received: orderId=${merchantOrderId}, resultCode=${resultCode}`);
```

#### 2. **Add Error Logging**
```javascript
// Log errors dengan detail
console.error("[Payment Error]", {
  error: err.message,
  stack: err.stack,
  orderId,
  amount
});
```

---

## 🔐 Security Checklist

- [ ] ✅ Signature generation sudah benar
- [ ] ❌ **Callback signature verification** - MISSING (CRITICAL)
- [ ] ❌ Input validation - MISSING
- [ ] ❌ Idempotent callback handling - MISSING
- [ ] ❌ Environment variables validation - MISSING
- [ ] ❌ Error message sanitization - MISSING
- [ ] ❌ Logging untuk audit - MISSING

---

## 📚 Best Practices yang Perlu Diterapkan

### 1. **Always Verify Callback Signature**
- Jangan pernah trust callback tanpa verify signature
- Ini adalah security requirement dari Duitku

### 2. **Idempotent Operations**
- Callback bisa dipanggil multiple times
- Check apakah transaksi sudah diproses sebelum update

### 3. **Input Validation**
- Validate semua input dari user
- Sanitize input untuk prevent injection

### 4. **Error Handling**
- Jangan expose sensitive information di error message
- Log errors untuk debugging
- Return generic error message ke user

### 5. **Logging**
- Log semua payment operations
- Log callback dari Duitku
- Log errors dengan detail

### 6. **Database Transaction**
- Update status transaksi di database
- Handle race conditions
- Use database transactions untuk consistency

---

## 🎯 Kesimpulan

### Yang Sudah Benar:
- ✅ Struktur code baik
- ✅ Signature generation benar
- ✅ Create payment flow benar
- ✅ Route setup benar

### Yang Perlu Diperbaiki (URGENT):
- 🔴 **CRITICAL: Callback signature verification** - Security risk tinggi
- ⚠️ Input validation
- ⚠️ Error handling
- ⚠️ Environment variables validation
- ⚠️ Logging

### Priority:
1. **PRIORITY 1 (CRITICAL):** Fix callback signature verification
2. **PRIORITY 2:** Add input validation
3. **PRIORITY 3:** Improve error handling
4. **PRIORITY 4:** Add logging

---

## 📖 Referensi

Untuk implementasi yang benar, referensi dokumentasi Duitku:
- Duitku API Documentation
- Duitku Callback Signature Verification
- Duitku Security Best Practices

---

**Catatan:** Analisis ini dibuat tanpa mengubah file apapun, hanya untuk review dan rekomendasi perbaikan.

