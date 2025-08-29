const logger = (req, res, next) => {
  const start = Date.now()

  // Log request
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - IP: ${req.ip}`)

  // Log user if authenticated
  if (req.user) {
    console.log(`User: ${req.user.name} (${req.user.email}) - Role: ${req.user.role}`)
  }

  // Override res.json to log response
  const originalJson = res.json
  res.json = function (data) {
    const duration = Date.now() - start
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`)

    if (res.statusCode >= 400) {
      console.error(`Error Response: ${JSON.stringify(data, null, 2)}`)
    }

    return originalJson.call(this, data)
  }

  next()
}

module.exports = logger
