import { Router } from "express";
import escpos from "escpos";
import escposUSB from "escpos-usb";

escpos.USB = escposUSB;

const router = Router();

router.post("/print", (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text is required" });
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

