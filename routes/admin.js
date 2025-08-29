const express = require("express")
const { body } = require("express-validator")
const {
  getDashboardStats,
  getAllUsers,
  getUserDetails,
  updateUserRole,
  deactivateUser,
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
  getAllProducts,
  getProductDetails,
  toggleProductStatus,
  getAllReviews,
  updateReviewStatus,
  deleteReview,
  getSalesAnalytics,
  getInventoryReport,
  getCustomerAnalytics,
} = require("../controllers/admin")
const { protect, admin } = require("../middleware/auth")

const router = express.Router()

// Apply admin middleware to all routes
router.use(protect, admin)

// Validation rules
const updateUserRoleValidation = [
  body("role").isIn(["customer", "admin"]).withMessage("Role must be either customer or admin"),
]

const updateOrderStatusValidation = [
  body("status")
    .isIn(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"])
    .withMessage("Invalid order status"),
  body("note").optional().isLength({ max: 500 }).withMessage("Note cannot be more than 500 characters"),
  body("trackingNumber").optional().isLength({ max: 100 }).withMessage("Tracking number too long"),
]

const updateReviewStatusValidation = [body("isApproved").isBoolean().withMessage("isApproved must be a boolean")]

// Dashboard and Analytics
router.get("/dashboard", getDashboardStats)
router.get("/analytics/sales", getSalesAnalytics)
router.get("/analytics/customers", getCustomerAnalytics)
router.get("/reports/inventory", getInventoryReport)

// User Management
router.get("/users", getAllUsers)
router.get("/users/:id", getUserDetails)
router.put("/users/:id/role", updateUserRoleValidation, updateUserRole)
router.put("/users/:id/deactivate", deactivateUser)

// Order Management
router.get("/orders", getAllOrders)
router.get("/orders/:id", getOrderDetails)
router.put("/orders/:id/status", updateOrderStatusValidation, updateOrderStatus)

// Product Management
router.get("/products", getAllProducts)
router.get("/products/:id", getProductDetails)
router.put("/products/:id/toggle-status", toggleProductStatus)

// Review Management
router.get("/reviews", getAllReviews)
router.put("/reviews/:id/status", updateReviewStatusValidation, updateReviewStatus)
router.delete("/reviews/:id", deleteReview)

module.exports = router
