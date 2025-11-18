# Photobooth Backend

Backend service for handling multiple file uploads to Firebase Storage.

## Features

- Multiple file upload support with sessionId
- Session-based file organization (no folders, direct bucket access)
- Firebase Storage integration
- RESTful API
- Support for images (JPEG, PNG, GIF, WebP) and videos (MP4)
- Automatic GIF generation per session using `gifencoder`
- Simple file naming: `${sessionId}-${photoIndex}.ext` or `${sessionId}-gif.ext`

## Project Structure

```
photobooth-backend/
├── src/
│   └── server.js          # Main server file
├── config/
│   └── firebase.js        # Firebase configuration
├── firebase-service-account.json  # Firebase credentials (not in git)
├── package.json
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js (v14 or higher)
- Firebase project with Storage enabled
- Firebase service account JSON file

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Install system dependencies required by `gifencoder` (for macOS):
```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
```

For Linux, install the equivalent packages via your package manager. For Windows, install the prebuilt binaries from [GTK prerequisites](https://github.com/Automattic/node-canvas#compiling) or use the Windows Subsystem for Linux (WSL).

4. Create a `.env` file in the root directory:
```env
PORT=5000
FIREBASE_BUCKET=your-firebase-bucket-name

# API Key for authentication (REQUIRED for production)
# Generate a strong random string, e.g., using: openssl rand -hex 32
API_KEY=your-secret-api-key-here

# CORS Configuration (optional)
# For production, specify your frontend domain(s):
# ALLOWED_ORIGINS=https://photomate.app,https://www.photomate.app
# Leave empty or set to '*' for development (allows all origins)
ALLOWED_ORIGINS=
```

5. Place your `firebase-service-account.json` file in the root directory

6. Generate a secure API key for production:
```bash
# Using OpenSSL (recommended)
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add the generated key to your `.env` file as `API_KEY`.

## Usage

### Development
```bash
npm start
# or
npm run dev
```

### Production
```bash
npm run prod
```

## API Endpoints
port = localhost:3000
API_KEY=ac89cefb7d385811283fa978c241b8c4ec3a0def07d8807318e1fcaab1fbef33

### POST `/upload`

Upload multiple files to Firebase Storage with sessionId.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- **Authentication**: API Key required (via `X-API-Key` header or `apiKey` query parameter)
- Query Parameter or Body: `sessionId` (required)
- Body: Multiple files with field names containing photoIndex (e.g., `photo-1`, `photo-2`, `photo-3`) or `gif`

**Note**: If `API_KEY` is not set in environment variables, authentication is disabled (development mode only).

**File Naming Convention:**
- Photos/Videos: Field name should contain a number (e.g., `photo-1`, `photo1`, `1`, etc.)
- GIF: Field name should contain "gif" (e.g., `gif`, `photo-gif`, etc.)

**Supported File Types:**
- Images: JPEG, PNG, GIF, WebP
- Videos: MP4

**Response:**
```json
{
  "success": true,
  "sessionId": "abc123",
  "bucketUrl": "https://storage.googleapis.com/bucket-name",
  "count": 4,
  "files": [
    {
      "filename": "image1.jpg",
      "uploadedName": "abc123-1.jpg",
      "url": "https://storage.googleapis.com/bucket-name/abc123-1.jpg",
      "photoIndex": "1"
    },
    {
      "filename": "image2.jpg",
      "uploadedName": "abc123-2.jpg",
      "url": "https://storage.googleapis.com/bucket-name/abc123-2.jpg",
      "photoIndex": "2"
    },
    {
      "filename": "video.mp4",
      "uploadedName": "abc123-3.mp4",
      "url": "https://storage.googleapis.com/bucket-name/abc123-3.mp4",
      "photoIndex": "3"
    },
    {
      "filename": "animation.gif",
      "uploadedName": "abc123-gif.gif",
      "url": "https://storage.googleapis.com/bucket-name/abc123-gif.gif",
      "photoIndex": "gif"
    }
  ]
}
```

**Example using curl:**
```bash
# Upload with sessionId and API key (via header - recommended)
curl -X POST "http://localhost:5000/upload?sessionId=abc123" \
  -H "X-API-Key: your-api-key-here" \
  -F "photo-1=@image1.jpg" \
  -F "photo-2=@image2.jpg" \
  -F "photo-3=@video.mp4" \
  -F "gif=@animation.gif"

# Alternative: API key via query parameter
curl -X POST "http://localhost:5000/upload?sessionId=abc123&apiKey=your-api-key-here" \
  -F "photo-1=@image1.jpg" \
  -F "photo-2=@image2.jpg" \
  -F "photo-3=@video.mp4" \
  -F "gif=@animation.gif"
```

### GET `/view`

Get all files for a specific sessionId.

**Request:**
- Method: `GET`
- Query Parameter: `sessionId` (required)

**Response:**
```json
{
  "success": true,
  "sessionId": "abc123",
  "bucketUrl": "https://storage.googleapis.com/bucket-name",
  "count": 4,
  "files": [
    {
      "name": "abc123-1.png",
      "url": "https://storage.googleapis.com/bucket-name/abc123-1.png",
      "photoIndex": "1",
      "contentType": "image/png",
      "size": "123456",
      "timeCreated": "2024-12-25T14:30:00.000Z",
      "updated": "2024-12-25T14:30:00.000Z"
    },
    {
      "name": "abc123-2.png",
      "url": "https://storage.googleapis.com/bucket-name/abc123-2.png",
      "photoIndex": "2",
      "contentType": "image/png",
      "size": "123456",
      "timeCreated": "2024-12-25T14:30:00.000Z",
      "updated": "2024-12-25T14:30:00.000Z"
    },
    {
      "name": "abc123-3.mp4",
      "url": "https://storage.googleapis.com/bucket-name/abc123-3.mp4",
      "photoIndex": "3",
      "contentType": "video/mp4",
      "size": "123456",
      "timeCreated": "2024-12-25T14:30:00.000Z",
      "updated": "2024-12-25T14:30:00.000Z"
    },
    {
      "name": "abc123-gif.gif",
      "url": "https://storage.googleapis.com/bucket-name/abc123-gif.gif",
      "photoIndex": "gif",
      "contentType": "image/gif",
      "size": "123456",
      "timeCreated": "2024-12-25T14:30:00.000Z",
      "updated": "2024-12-25T14:30:00.000Z"
    }
  ]
}
```

**Example using curl:**
```bash
# Get all files for a sessionId
curl "http://localhost:5000/view?sessionId=abc123"
```

**Response when no files found:**
```json
{
  "success": false,
  "message": "No files found for this sessionId",
  "sessionId": "abc123",
  "files": []
}
```

## File Naming

Files are stored directly in the bucket root (no folders) with the format:
- Photos/Videos: `${sessionId}-${photoIndex}.ext` (e.g., `abc123-1.png`, `abc123-2.mp4`)
- GIF: `${sessionId}-gif.ext` (e.g., `abc123-gif.gif`)

**Frontend Access Pattern:**
```
https://photomate.app/view?sessionId=abc123
```

Frontend can directly access files:
- `${BUCKET_URL}/${sessionId}-1.png`
- `${BUCKET_URL}/${sessionId}-2.png`
- `${BUCKET_URL}/${sessionId}-3.mp4`
- `${BUCKET_URL}/${sessionId}-gif.gif`

## Security Features

The server includes several security measures:

- **API Key Authentication**: Upload endpoint requires API key (set via `API_KEY` env variable)
  - API key can be sent via `X-API-Key` header (recommended) or `apiKey` query parameter
  - **API key has NO expiration** - it's permanent until changed in environment variables
  - If `API_KEY` is not set, authentication is disabled (development mode only)
- **Rate Limiting**: 
  - Upload endpoint: 100 requests per 15 minutes per IP
  - View endpoint: 200 requests per 15 minutes per IP
- **File Type Validation**: Only allows image files (JPEG, PNG, GIF, WebP) and video files (MP4)
- **File Size Limits**: Maximum 10MB per file, maximum 10 files per request
- **Input Validation**: sessionId is validated (alphanumeric, hyphens, underscores, max 100 chars)
- **Security Headers**: Helmet.js adds security headers to all responses
- **CORS Protection**: Configurable CORS to restrict allowed origins
- **Error Handling**: Generic error messages to prevent information leakage

## Environment Variables

- `PORT` - Server port (default: 5000)
- `FIREBASE_BUCKET` - Firebase Storage bucket name
- `API_KEY` - API key for authentication (REQUIRED for production, optional for development)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins (optional, defaults to '*' for development)

## Dependencies

- express - Web framework
- multer - File upload middleware
- firebase-admin - Firebase Admin SDK
- cors - CORS middleware
- dotenv - Environment variable management
- uuid - UUID generation (not used in current implementation)

## License

ISC

