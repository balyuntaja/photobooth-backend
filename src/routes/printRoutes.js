import { Router } from "express";
import escpos from "escpos";

// Lazy import escpos-usb to make it optional for Vercel deployment
let escposUSBPromise = null;

const initializeEscposUSB = async () => {
  if (escpos.USB !== undefined) return escpos.USB;
  
  try {
    if (!escposUSBPromise) {
      escposUSBPromise = import("escpos-usb");
    }
    const escposUSBModule = await escposUSBPromise;
    const escposUSB = escposUSBModule.default || escposUSBModule;
    escpos.USB = escposUSB;
    return escposUSB;
  } catch (error) {
    console.warn("escpos-usb not available, printing will not work:", error.message);
    escpos.USB = null;
    return null;
  }
};

const router = Router();

router.post("/print", async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  // Initialize escpos-usb if not already done
  const escposUSB = await initializeEscposUSB();
  if (!escposUSB) {
    return res.status(503).json({ error: "Printing service not available (USB not supported in this environment)" });
  }

  try {
    const device = new escpos.USB();
    const printer = new escpos.Printer(device);

    device.open((error) => {
      if (error) {
        return res.status(500).json({ error: error.message });
      }

      printer.text(text);
      printer.cut();
      printer.close((closeError) => {
        if (closeError) {
          return res.status(500).json({ error: closeError.message });
        }
        res.json({ status: "OK", message: "Printed" });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

