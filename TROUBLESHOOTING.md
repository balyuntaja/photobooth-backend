# Troubleshooting FUNCTION_INVOCATION_FAILED

Error `FUNCTION_INVOCATION_FAILED` biasanya terjadi karena masalah environment variables atau Firebase initialization. Ikuti langkah-langkah berikut:

## ✅ Checklist Troubleshooting

### 1. Cek Environment Variables di Vercel

Masuk ke Vercel Dashboard → Project Settings → Environment Variables, pastikan ada:

#### a. `FIREBASE_SERVICE_ACCOUNT` ⚠️ WAJIB
- **Name**: `FIREBASE_SERVICE_ACCOUNT`
- **Value**: Seluruh JSON dari `firebase-service-account.json` (bisa single-line atau multi-line)
- **Format**: Valid JSON string
- **Environment**: Production, Preview, Development

**Cara test JSON valid:**
```bash
# Copy isi firebase-service-account.json
cat firebase-service-account.json | jq -c
# Atau test di Node.js
node -e "console.log(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT).project_id)"
```

#### b. `FIREBASE_BUCKET` ⚠️ WAJIB
- **Name**: `FIREBASE_BUCKET`
- **Value**: Nama bucket Firebase Storage (contoh: `photobooth-receipt.appspot.com`)
- **Cara cek**: Firebase Console → Storage → Settings → bucket name

#### c. `API_KEY` (Opsional tapi recommended)
- **Name**: `API_KEY`
- **Value**: API key untuk authentication

#### d. `ALLOWED_ORIGINS` (Opsional)
- **Name**: `ALLOWED_ORIGINS`
- **Value**: Daftar origins yang diizinkan (kosongkan untuk allow all)

### 2. Cek Logs di Vercel

1. Vercel Dashboard → Deployments
2. Klik deployment yang error
3. Klik "Function Logs" atau "View Logs"
4. Cari error messages dengan emoji:
   - ❌ = Error
   - ✅ = Success
   - 📦 = Info

**Error yang mungkin muncul:**
- `❌ Failed to parse FIREBASE_SERVICE_ACCOUNT` → JSON tidak valid
- `❌ FIREBASE_BUCKET environment variable is required` → Bucket tidak di-set
- `❌ Firebase service account not found` → Environment variable tidak ada

### 3. Common Issues & Solutions

#### Issue 1: JSON Invalid atau Corrupt

**Error:**
```
❌ Failed to parse FIREBASE_SERVICE_ACCOUNT: Unexpected token
```

**Solution:**
1. Copy ulang isi `firebase-service-account.json`
2. Pastikan JSON valid (bisa test di https://jsonlint.com/)
3. Pastikan tidak ada karakter yang corrupt
4. Re-paste di Vercel Dashboard

#### Issue 2: Environment Variable Tidak Ter-set

**Error:**
```
❌ Firebase service account not found
```

**Solution:**
1. Pastikan environment variable `FIREBASE_SERVICE_ACCOUNT` sudah di-set
2. Pastikan environment (Production/Preview/Development) sudah dipilih
3. Redeploy setelah menambahkan environment variable

#### Issue 3: FIREBASE_BUCKET Kosong

**Error:**
```
❌ FIREBASE_BUCKET environment variable is required
```

**Solution:**
1. Cek nama bucket di Firebase Console
2. Tambahkan environment variable `FIREBASE_BUCKET`
3. Format: `your-project.appspot.com` (tanpa `gs://`)

#### Issue 4: Private Key Format Error

**Error:**
```
Invalid FIREBASE_SERVICE_ACCOUNT environment variable: ...
```

**Solution:**
- Pastikan `private_key` di JSON memiliki `\n` untuk line breaks
- Format harus: `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`
- Jangan hapus escape characters `\n`

### 4. Test Environment Variables

Setelah deploy, test dengan curl atau Postman:

```bash
# Test 1: Cek apakah server berjalan
curl "https://photobooth-backend-beta.vercel.app/view?sessionId=test"

# Test 2: Upload test (dengan API key jika di-set)
curl -X POST "https://photobooth-backend-beta.vercel.app/upload?sessionId=test&apiKey=YOUR_API_KEY" \
  -F "photo-1=@image.jpg"
```

### 5. Step-by-Step Fix

Jika masih error, ikuti langkah ini:

1. **Backup file lokal:**
   ```bash
   cp firebase-service-account.json firebase-service-account.json.backup
   ```

2. **Copy JSON content:**
   ```bash
   # Option 1: Single-line (recommended)
   cat firebase-service-account.json | jq -c
   
   # Option 2: Pretty print untuk verify
   cat firebase-service-account.json | jq
   ```

3. **Paste di Vercel:**
   - Vercel Dashboard → Settings → Environment Variables
   - Add/Edit `FIREBASE_SERVICE_ACCOUNT`
   - Paste JSON (single-line atau multi-line, keduanya OK)
   - Save

4. **Set FIREBASE_BUCKET:**
   - Cek di Firebase Console → Storage → Settings
   - Copy bucket name (contoh: `photobooth-receipt.appspot.com`)
   - Add/Edit `FIREBASE_BUCKET` di Vercel
   - Save

5. **Redeploy:**
   - Vercel Dashboard → Deployments
   - Klik "Redeploy" pada deployment terbaru
   - Atau push commit baru

6. **Cek logs:**
   - Setelah redeploy, cek Function Logs
   - Cari log dengan emoji ✅ atau ❌
   - Log akan menunjukkan di mana error terjadi

### 6. Verify Environment Variables

Di Vercel, Anda bisa verify dengan:

1. **Deployment Settings:**
   - Vercel Dashboard → Settings → Environment Variables
   - Pastikan semua variable sudah ada
   - Pastikan environment (Production/Preview/Development) sudah dipilih

2. **Check Build Logs:**
   - Deployment → Build Logs
   - Cek apakah ada warning tentang environment variables

### 7. Still Not Working?

Jika masih error setelah semua langkah di atas:

1. **Cek exact error di logs:**
   - Function Logs di Vercel Dashboard
   - Copy error message lengkap

2. **Test local:**
   ```bash
   # Set environment variables locally
   export FIREBASE_SERVICE_ACCOUNT='$(cat firebase-service-account.json | jq -c)'
   export FIREBASE_BUCKET='your-bucket-name.appspot.com'
   
   # Run server
   npm start
   
   # Test
   curl "http://localhost:5000/view?sessionId=test"
   ```

3. **Verify JSON format:**
   ```javascript
   // Test di Node.js
   const json = require('./firebase-service-account.json');
   console.log('Project ID:', json.project_id);
   console.log('Private Key:', json.private_key.substring(0, 30) + '...');
   ```

## 📋 Quick Checklist

- [ ] `FIREBASE_SERVICE_ACCOUNT` sudah di-set di Vercel
- [ ] JSON format valid (bisa di-parse)
- [ ] `FIREBASE_BUCKET` sudah di-set di Vercel
- [ ] Environment (Production/Preview/Development) sudah dipilih
- [ ] Sudah redeploy setelah menambahkan environment variables
- [ ] Cek Function Logs untuk error messages
- [ ] Private key memiliki `\n` untuk line breaks

## 🔍 Debug Commands

```bash
# Test Firebase config locally
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('firebase-service-account.json', 'utf8'));
console.log('Project ID:', config.project_id);
console.log('Has private_key:', !!config.private_key);
console.log('Bucket should be:', config.project_id + '.appspot.com');
"

# Test JSON validity
cat firebase-service-account.json | jq . > /dev/null && echo "✅ JSON valid" || echo "❌ JSON invalid"
```

## 📞 Next Steps

Jika masih error, siapkan informasi berikut:
1. Error message lengkap dari Function Logs
2. Screenshot Environment Variables di Vercel (blur nilai-nilai sensitive)
3. Hasil test local (jika sudah test)
4. Nama bucket Firebase Storage Anda

