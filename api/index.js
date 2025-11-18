// Vercel serverless function entry point
import app from "../src/server.js";

// Export default handler for Vercel
export default app;

// Export named handler for better error handling
export const handler = async (req, res) => {
  try {
    return app(req, res);
  } catch (error) {
    console.error("💥 Serverless function error:", error);
    console.error("Stack:", error.stack);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
};

