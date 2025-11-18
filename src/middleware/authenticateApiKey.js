const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.query.apiKey;
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    console.warn("⚠️  WARNING: API_KEY not set in environment. Server is running without authentication!");
    return next();
  }

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: "API key is required. Provide it via X-API-Key header or apiKey query parameter.",
    });
  }

  if (apiKey !== validApiKey) {
    return res.status(403).json({
      success: false,
      error: "Invalid API key.",
    });
  }

  return next();
};

export default authenticateApiKey;

