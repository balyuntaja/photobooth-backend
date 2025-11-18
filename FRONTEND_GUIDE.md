# Panduan Front-end untuk Integrasi dengan Backend

## Konfigurasi CORS
Backend sudah dikonfigurasi untuk menerima request dari:
- `https://receiptbooth-photomate.netlify.app` (selalu diizinkan)

## 1. Upload File - POST `/upload`

### Menggunakan Fetch API

```javascript
const uploadFiles = async (files, sessionId, apiKey) => {
  const formData = new FormData();
  
  // Tambahkan sessionId ke FormData atau sebagai query parameter
  formData.append('sessionId', sessionId);
  
  // Tambahkan files dengan nama field yang mengandung angka (untuk foto)
  // atau "gif" (untuk GIF)
  files.forEach((file, index) => {
    const fieldName = file.type === 'image/gif' ? 'gif' : `photo-${index + 1}`;
    formData.append(fieldName, file);
  });
  
  try {
    const response = await fetch(
      `https://photobooth-backend-beta.vercel.app/upload?sessionId=${sessionId}`,
      {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey, // PENTING: Header case-sensitive
          // JANGAN set Content-Type secara manual untuk FormData
          // Browser akan otomatis set dengan boundary
        },
        credentials: 'include', // PENTING: Untuk CORS dengan credentials
        body: formData,
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

// Contoh penggunaan
const handleUpload = async () => {
  const files = document.getElementById('fileInput').files;
  const sessionId = 'abc123';
  const apiKey = 'your-api-key-here'; // Ambil dari environment variable
  
  try {
    const result = await uploadFiles(Array.from(files), sessionId, apiKey);
    console.log('Upload success:', result);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### Menggunakan Axios

```javascript
import axios from 'axios';

const uploadFiles = async (files, sessionId, apiKey) => {
  const formData = new FormData();
  
  // Tambahkan files
  files.forEach((file, index) => {
    const fieldName = file.type === 'image/gif' ? 'gif' : `photo-${index + 1}`;
    formData.append(fieldName, file);
  });
  
  try {
    const response = await axios.post(
      `https://photobooth-backend-beta.vercel.app/upload?sessionId=${sessionId}`,
      formData,
      {
        headers: {
          'X-API-Key': apiKey,
          // Axios akan otomatis set Content-Type untuk FormData
        },
        withCredentials: true, // PENTING: Untuk CORS dengan credentials
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Upload error:', error.response?.data || error.message);
    throw error;
  }
};
```

## 2. View Files - GET `/view`

### Menggunakan Fetch API

```javascript
const viewFiles = async (sessionId) => {
  try {
    const response = await fetch(
      `https://photobooth-backend-beta.vercel.app/view?sessionId=${sessionId}`,
      {
        method: 'GET',
        credentials: 'include', // PENTING: Untuk CORS dengan credentials
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch files');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('View error:', error);
    throw error;
  }
};

// Contoh penggunaan
const handleView = async () => {
  const sessionId = 'abc123';
  
  try {
    const result = await viewFiles(sessionId);
    console.log('Files:', result.files);
  } catch (error) {
    console.error('View failed:', error);
  }
};
```

### Menggunakan Axios

```javascript
import axios from 'axios';

const viewFiles = async (sessionId) => {
  try {
    const response = await axios.get(
      `https://photobooth-backend-beta.vercel.app/view?sessionId=${sessionId}`,
      {
        withCredentials: true, // PENTING: Untuk CORS dengan credentials
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('View error:', error.response?.data || error.message);
    throw error;
  }
};
```

## 3. Checklist Front-end

Pastikan kode front-end Anda memiliki:

- ✅ **`credentials: 'include'`** (Fetch) atau **`withCredentials: true`** (Axios)
- ✅ Header **`X-API-Key`** dengan case yang benar untuk upload endpoint
- ✅ **TIDAK** set `Content-Type` manual saat upload file (biarkan browser set otomatis untuk FormData)
- ✅ URL endpoint yang benar: `https://photobooth-backend-beta.vercel.app`
- ✅ SessionId dikirim sebagai query parameter atau di FormData

## 4. Environment Variables Front-end

Simpan API key di environment variable front-end:

```javascript
// .env (untuk React/Vue/Next.js)
VITE_API_KEY=your-api-key-here
# atau
REACT_APP_API_KEY=your-api-key-here
# atau
NEXT_PUBLIC_API_KEY=your-api-key-here

// Penggunaan
const apiKey = import.meta.env.VITE_API_KEY; // Vite
// atau
const apiKey = process.env.REACT_APP_API_KEY; // Create React App
// atau
const apiKey = process.env.NEXT_PUBLIC_API_KEY; // Next.js
```

## 5. Error Handling

```javascript
const handleApiError = (error) => {
  if (error.message.includes('CORS')) {
    console.error('CORS Error: Pastikan backend sudah dikonfigurasi dengan benar');
  } else if (error.message.includes('API key')) {
    console.error('Authentication Error: Periksa API key');
  } else if (error.message.includes('sessionId')) {
    console.error('Validation Error: SessionId tidak valid');
  } else {
    console.error('Unexpected error:', error);
  }
};
```

## 6. Testing CORS

Untuk test apakah CORS bekerja, buka browser console dan jalankan:

```javascript
fetch('https://photobooth-backend-beta.vercel.app/view?sessionId=test', {
  method: 'GET',
  credentials: 'include',
})
  .then(res => res.json())
  .then(data => console.log('CORS OK:', data))
  .catch(err => console.error('CORS Error:', err));
```

Jika tidak ada error CORS, berarti konfigurasi sudah benar.

