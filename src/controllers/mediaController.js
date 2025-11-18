import path from "path";

import { bucket } from "../../config/firebase.js";
import { MAX_FILE_SIZE } from "../middleware/upload.js";
import { createGifFromPhotos } from "../services/gifService.js";
import { validateSessionId } from "../utils/validation.js";
import { filterAndSortPhotos, extractPhotoIndex } from "../utils/photoHelpers.js";

const FIREBASE_BASE_URL = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}`;

const getFileMetadata = (file, sessionId) => {
  const ext = path.extname(file.originalname);

  if (file.fieldname.toLowerCase().includes("gif")) {
    return {
      fileName: `${sessionId}-gif${ext}`,
      photoIndex: "gif",
    };
  }

  const photoIndex = extractPhotoIndex(file.fieldname);
  return {
    fileName: `${sessionId}-${photoIndex}${ext}`,
    photoIndex,
  };
};

const uploadFileToBucket = (sessionId, file) => {
  return new Promise((resolve, reject) => {
    const { fileName, photoIndex } = getFileMetadata(file, sessionId);
    const blob = bucket.file(fileName);

    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    blobStream.on("error", (err) => {
      reject(err);
    });

    blobStream.on("finish", async () => {
      try {
        await blob.makePublic();
        const [signedUrl] = await blob.getSignedUrl({
          action: "read",
          expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
        });

        resolve({
          filename: file.originalname,
          uploadedName: fileName,
          url: signedUrl,
          photoIndex,
        });
      } catch (error) {
        const encodedFileName = encodeURIComponent(fileName);
        const fallbackUrl = `${FIREBASE_BASE_URL}/o/${encodedFileName}?alt=media`;

        resolve({
          filename: file.originalname,
          uploadedName: fileName,
          url: fallbackUrl,
          photoIndex,
        });
      }
    });

    blobStream.end(file.buffer);
  });
};

const uploadGifToBucket = async (sessionId, gifBuffer) => {
  const gifFileName = `${sessionId}-gif.gif`;
  const gifBlob = bucket.file(gifFileName);

  await new Promise((resolve, reject) => {
    const gifStream = gifBlob.createWriteStream({
      metadata: {
        contentType: "image/gif",
      },
    });

    gifStream.on("error", (err) => {
      reject(err);
    });

    gifStream.on("finish", async () => {
      try {
        await gifBlob.makePublic();
        const [signedUrl] = await gifBlob.getSignedUrl({
          action: "read",
          expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
        });

        resolve({
          filename: "generated.gif",
          uploadedName: gifFileName,
          url: signedUrl,
          photoIndex: "gif",
        });
      } catch (error) {
        const encodedFileName = encodeURIComponent(gifFileName);
        const fallbackUrl = `${FIREBASE_BASE_URL}/o/${encodedFileName}?alt=media`;

        resolve({
          filename: "generated.gif",
          uploadedName: gifFileName,
          url: fallbackUrl,
          photoIndex: "gif",
        });
      }
    });

    gifStream.end(gifBuffer);
  });
};

export const uploadMedia = async (req, res) => {
  try {
    const files = req.files;
    const sessionId = req.query.sessionId || req.body.sessionId;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: "sessionId is required. Send it as query parameter or in request body.",
      });
    }

    if (!validateSessionId(sessionId)) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid sessionId format. Only alphanumeric characters, hyphens, and underscores are allowed (max 100 chars).",
      });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No files uploaded.",
      });
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({
          success: false,
          error: `File ${file.originalname} exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
        });
      }
    }

    const uploadResults = await Promise.all(files.map((file) => uploadFileToBucket(sessionId, file)));

    const sortedPhotoFiles = filterAndSortPhotos(files);
    let gifResult = null;

    if (sortedPhotoFiles.length > 1) {
      try {
        const gifBuffer = await createGifFromPhotos(sortedPhotoFiles);

        if (gifBuffer) {
          gifResult = await uploadGifToBucket(sessionId, gifBuffer);
        }
      } catch (error) {
        console.error("Error creating GIF:", error);
      }
    }

    const bucketUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}`;
    const filesResponse = gifResult ? [...uploadResults, gifResult] : uploadResults;

    return res.status(200).json({
      success: true,
      sessionId,
      bucketUrl,
      count: filesResponse.length,
      files: filesResponse,
    });
  } catch (error) {
    console.error("Upload error:", error);

    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "File too large. Maximum size is 10MB per file.",
      });
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        error: "Too many files. Maximum is 10 files per request.",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const viewMedia = async (req, res) => {
  try {
    const sessionId = req.query.sessionId;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: "sessionId is required as query parameter.",
      });
    }

    if (!validateSessionId(sessionId)) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid sessionId format. Only alphanumeric characters, hyphens, and underscores are allowed (max 100 chars).",
      });
    }

    const [files] = await bucket.getFiles({
      prefix: `${sessionId}-`,
    });

    if (!files || files.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No files found for this sessionId",
        sessionId,
        files: [],
      });
    }

    const fileList = await Promise.all(
      files.map(async (file) => {
        const [metadata] = await file.getMetadata();

        let publicUrl;
        try {
          [publicUrl] = await file.getSignedUrl({
            action: "read",
            expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
          });
        } catch (error) {
          const encodedFileName = encodeURIComponent(file.name);
          publicUrl = `${FIREBASE_BASE_URL}/o/${encodedFileName}?alt=media`;
        }

        const photoIndexMatch = file.name.match(/-(\d+|gif)\./);
        const photoIndex = photoIndexMatch ? photoIndexMatch[1] : null;

        return {
          name: file.name,
          url: publicUrl,
          photoIndex,
          contentType: metadata.contentType,
          size: metadata.size,
          timeCreated: metadata.timeCreated,
          updated: metadata.updated,
        };
      })
    );

    fileList.sort((a, b) => {
      if (a.photoIndex === "gif") return 1;
      if (b.photoIndex === "gif") return -1;
      return parseInt(a.photoIndex, 10) - parseInt(b.photoIndex, 10);
    });

    return res.status(200).json({
      success: true,
      sessionId,
      bucketUrl: FIREBASE_BASE_URL,
      count: fileList.length,
      files: fileList,
    });
  } catch (error) {
    console.error("View error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

