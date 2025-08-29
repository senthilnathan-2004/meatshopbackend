const jwt = require("jsonwebtoken")
const User = require("../models/User")

// Protect routes - authentication required
const protect = async (req, res, next) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1]

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      // Get user from token
      req.user = await User.findById(decoded.id).select("-password")

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "User not found",
        })
      }

      next()
    } catch (error) {
      console.error(error)
      return res.status(401).json({
        success: false,
        error: "Not authorized, token failed",
      })
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Not authorized, no token",
    })
  }
}

// Admin only access
const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next()
  } else {
    res.status(403).json({
      success: false,
      error: "Access denied. Admin only.",
    })
  }
}

// Optional auth - user can be authenticated or not
const optionalAuth = async (req, res, next) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1]
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      req.user = await User.findById(decoded.id).select("-password")
    } catch (error) {
      // Token invalid, but continue without user
      req.user = null
    }
  }

  next()
}

module.exports = { protect, admin, optionalAuth }
