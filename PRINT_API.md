# Print API Documentation

Dokumentasi untuk endpoint `/print` yang digunakan untuk mencetak foto ke printer ESC/POS.

## Endpoint

```
POST /print
```

## Deskripsi

Endpoint ini menerima file gambar (foto) dan mencetaknya ke printer ESC/POS yang terhubung via USB. Gambar akan otomatis di-resize, diubah ke grayscale, dan diterapkan Floyd-Steinberg dithering untuk hasil cetak yang optimal.

## Request Format

- **Content-Type**: `multipart/form-data`
- **Method**: `POST`

## Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `file` | File | ✅ Yes | - | File gambar yang akan dicetak (field name bisa bebas, contoh: `photo`, `image`, `file`, dll) |
| `quantity` | Number/String | ❌ No | `1` | Jumlah cetakan yang diinginkan |

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Printed successfully"
}
```

### Error Responses

#### 400 Bad Request - No File Uploaded

```json
{
  "error": "No photo uploaded",
  "message": "Please send a file (any field name is accepted)"
}
```

#### 400 Bad Request - Upload Error

```json
{
  "error": "Upload error",
  "message": "Error message dari Multer"
}
```

#### 500 Internal Server Error - Printer Error

```json
{
  "error": "Cannot open printer"
}
```

atau

```json
{
  "error": "Print failed",
  "message": "Error message detail"
}
```

## Contoh Penggunaan

### 1. Menggunakan Fetch API (JavaScript/TypeScript)

```javascript
async function printPhoto(file, quantity = 1) {
  const formData = new FormData();
  formData.append('photo', file); // field name bisa bebas
  formData.append('quantity', quantity.toString());

  try {
    const response = await fetch('http://localhost:5000/print', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Print success:', data.message);
      return data;
    } else {
      console.error('Print error:', data.error);
      throw new Error(data.error || 'Print failed');
    }
  } catch (error) {
    console.error('Network error:', error);
    throw error;
  }
}

// Penggunaan
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];
printPhoto(file, 2); // print 2 kali
```

### 2. Menggunakan Axios

```javascript
import axios from 'axios';

async function printPhoto(file, quantity = 1) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('quantity', quantity.toString());

  try {
    const response = await axios.post('http://localhost:5000/print', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('Print success:', response.data.message);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('Print error:', error.response.data.error);
      throw new Error(error.response.data.error);
    } else {
      console.error('Network error:', error.message);
      throw error;
    }
  }
}

// Penggunaan
printPhoto(selectedFile, 3); // print 3 kali
```

### 3. Menggunakan React dengan File Input

```jsx
import React, { useState } from 'react';

function PrintComponent() {
  const [file, setFile] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handlePrint = async () => {
    if (!file) {
      setMessage('Please select a file');
      return;
    }

    setLoading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('quantity', quantity.toString());

    try {
      const response = await fetch('http://localhost:5000/print', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('✅ ' + data.message);
      } else {
        setMessage('❌ Error: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ Network error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <input
        type="number"
        min="1"
        value={quantity}
        onChange={(e) => setQuantity(parseInt(e.target.value))}
        placeholder="Quantity"
      />
      <button onClick={handlePrint} disabled={loading || !file}>
        {loading ? 'Printing...' : 'Print'}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
}
```

### 4. Menggunakan HTML Form (Traditional)

```html
<form id="printForm" enctype="multipart/form-data">
  <input type="file" name="photo" accept="image/*" required />
  <input type="number" name="quantity" value="1" min="1" />
  <button type="submit">Print</button>
</form>

<script>
document.getElementById('printForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  
  try {
    const response = await fetch('http://localhost:5000/print', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    alert(data.success ? data.message : 'Error: ' + data.error);
  } catch (error) {
    alert('Network error: ' + error.message);
  }
});
</script>
```

### 5. Menggunakan cURL (Testing)

```bash
# Print 1 kali (default)
curl -X POST http://localhost:5000/print \
  -F "photo=@/path/to/image.jpg"

# Print 3 kali
curl -X POST http://localhost:5000/print \
  -F "photo=@/path/to/image.jpg" \
  -F "quantity=3"
```

## Catatan Penting

1. **Field Name Fleksibel**: Field name untuk file bisa menggunakan nama apapun (`photo`, `image`, `file`, `upload`, dll). Endpoint akan mengambil file pertama yang di-upload.

2. **Format Gambar**: Endpoint menerima berbagai format gambar (JPEG, PNG, GIF, WebP). Gambar akan otomatis di-resize ke lebar 680px dengan proporsi aspek dipertahankan.

3. **Image Processing**: 
   - Gambar otomatis diubah ke grayscale
   - Diterapkan Floyd-Steinberg dithering untuk hasil cetak yang lebih baik
   - Gambar di-resize ke lebar maksimal 680px

4. **Quantity**: Parameter `quantity` menentukan berapa kali gambar akan dicetak. Default adalah 1.

5. **CORS**: Endpoint mendukung CORS dan akan menangani preflight OPTIONS request secara otomatis.

6. **Error Handling**: Selalu handle error response dengan baik. Cek status code dan error message untuk memberikan feedback yang jelas ke user.

## Base URL

- **Development**: `http://localhost:5000`
- **Production**: Sesuaikan dengan URL server production Anda

## Testing

Untuk testing, Anda bisa menggunakan:

1. **Postman**: 
   - Method: POST
   - URL: `http://localhost:5000/print`
   - Body: form-data
   - Key: `photo` (type: File), `quantity` (type: Text)

2. **cURL** (lihat contoh di atas)

3. **Browser DevTools**: Gunakan fetch API di console browser

## Troubleshooting

### Error: "Cannot open printer"
- Pastikan printer terhubung via USB
- Pastikan printer sudah dihidupkan
- Pastikan driver printer sudah terinstall
- Cek koneksi USB

### Error: "No photo uploaded"
- Pastikan file sudah dipilih
- Pastikan menggunakan `multipart/form-data`
- Pastikan field name untuk file sudah benar

### Error: "Print failed"
- Cek console server untuk detail error
- Pastikan format gambar valid
- Pastikan ukuran file tidak terlalu besar

## Support

Jika ada pertanyaan atau masalah, hubungi tim backend.

