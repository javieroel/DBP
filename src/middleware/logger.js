function requestLogger(req, res, next) {
  const startedAt = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startedAt;
    const stamp = new Date().toISOString();
    console.log(
      `[${stamp}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration} ms)`
    );
  });

  next();
}

module.exports = { requestLogger };
