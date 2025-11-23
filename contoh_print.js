import express from 'express';
import multer from 'multer';
import Jimp from 'jimp';
import escpos from 'escpos';
import usb from 'escpos-usb';

// Set USB module
escpos.USB = usb;

// Printer USB
const device = new escpos.USB(0x0418, 0x5011);
const printer = new escpos.Printer(device);

const app = express();
app.use(express.json());

// Multer memory upload
const upload = multer({
  storage: multer.memoryStorage(),
});

// ------------------------------------------------------
// Convert Jimp to escpos.Image format
// ------------------------------------------------------
function jimpToEscposImage(jimpImage) {
  const { width, height, data } = jimpImage.bitmap;
  
  // Create pixels object in the format expected by escpos.Image (ndarray-like)
  // escpos.Image expects format from get-pixels: { data: TypedArray, shape: [width, height, channels] }
  // Jimp data is already in RGBA format (Buffer), convert to Uint8Array
  const pixelData = data instanceof Uint8Array ? data : new Uint8Array(data);
  
  const pixels = {
    data: pixelData,
    shape: [width, height, 4] // RGBA = 4 channels
  };
  
  return new escpos.Image(pixels);
}

// ------------------------------------------------------
// Floyd–Steinberg Dithering
// ------------------------------------------------------
async function floydSteinberg(image) {
  const { width, height, data } = image.bitmap;

  const getIndex = (x, y) => (width * y + x) * 4;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {

      const idx = getIndex(x, y);
      const oldPixel = data[idx];
      const newPixel = oldPixel < 128 ? 0 : 255;

      const error = oldPixel - newPixel;

      data[idx] = data[idx + 1] = data[idx + 2] = newPixel;

      function add(px, py, factor) {
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const i = getIndex(px, py);
          const val = data[i] + error * factor;
          data[i] = data[i + 1] = data[i + 2] = Math.max(0, Math.min(255, val));
        }
      }

      add(x + 1, y    , 7 / 16);
      add(x - 1, y + 1, 3 / 16);
      add(x    , y + 1, 5 / 16);
      add(x + 1, y + 1, 1 / 16);
    }
  }

  return image;
}

// ------------------------------------------------------
// PRINT ENDPOINT
// ------------------------------------------------------
// Using upload.any() to accept any field name
app.post('/print', upload.any(), async (req, res) => {
  try {
    // Get the first file from any field
    const file = req.files && req.files.length > 0 ? req.files[0] : null;
    
    if (!file) {
      return res.status(400).json({ 
        error: "No photo uploaded", 
        message: "Please send a file (any field name is accepted)" 
      });
    }

    const quantity = parseInt(req.body.quantity || "1");

    let img = await Jimp.read(file.buffer);

    img.resize(680, Jimp.AUTO);
    img = img.grayscale();

    img = await floydSteinberg(img);

    // Convert Jimp image to escpos.Image
    const escposImage = jimpToEscposImage(img);

    device.open(async (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Cannot open printer" });
      }

      for (let i = 0; i < quantity; i++) {
        await printer
          .align('ct')
          .image(escposImage)
          .then(() => printer.newLine())
          .then(() => printer.cut());
      }

      printer.close();

      res.json({ success: true, message: "Printed successfully" });
    });

  } catch (e) {
    console.error(e);
    
    // Handle MulterError specifically
    if (e.name === 'MulterError') {
      return res.status(400).json({ 
        error: "Upload error", 
        message: e.message 
      });
    }
    
    res.status(500).json({ error: "Print failed", message: e.message });
  }
});

app.listen(3000, () => console.log("Server running on :3000"));
