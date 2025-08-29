const mongoSanitize = require("express-mongo-sanitize")
const xss = require("xss")

// Sanitize request data
const sanitizeInput = (req, res, next) => {
  // Remove any keys that start with '$' or contain '.'
  mongoSanitize.sanitize(req.body)
  mongoSanitize.sanitize(req.query)
  mongoSanitize.sanitize(req.params)

  // Sanitize string inputs against XSS
  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === "string") {
        obj[key] = xss(obj[key])
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        sanitizeObject(obj[key])
      }
    }
  }

  if (req.body) sanitizeObject(req.body)
  if (req.query) sanitizeObject(req.query)

  next()
}

module.exports = sanitizeInput
