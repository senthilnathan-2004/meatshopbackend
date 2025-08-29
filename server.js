const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const helmet = require("helmet")
const compression = require("compression")
const rateLimit = require("express-rate-limit")
require("dotenv").config()

const app = express()

// Import routes
const authRoutes = require("./routes/auth")
const productRoutes = require("./routes/products")
const cartRoutes = require("./routes/cart")
const orderRoutes = require("./routes/orders")
const userRoutes = require("./routes/users")
const adminRoutes = require("./routes/admin")
const webhookRoutes = require("./routes/webhooks")
const docsRoutes = require("./routes/docs")
const categoryRoutes = require("./routes/categories")

// Import middleware
const errorHandler = require("./middleware/errorHandler")
const notFound = require("./middleware/notFound")
const logger = require("./middleware/logger")
const sanitizeInput = require("./middleware/sanitize")

// Security middleware
app.use(helmet())
app.use(compression())

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
})
app.use(limiter)

// CORS configuration
// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL || "http://localhost:3000",
//     credentials: true,
//   }),
// )
app.use(cors())

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Logging and sanitization middleware
if (process.env.NODE_ENV === "development") {
  app.use(logger)
}
app.use(sanitizeInput)

// Database connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err))

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/products", productRoutes)
app.use("/api/cart", cartRoutes)
app.use("/api/orders", orderRoutes)
app.use("/api/users", userRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/categories", categoryRoutes)
app.use("/api/docs", docsRoutes)
app.use("/api/webhooks", webhookRoutes)

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Meat Shopping API is running",
    timestamp: new Date().toISOString(),
  })
})

// Error handling middleware
app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`)
})

module.exports = app
