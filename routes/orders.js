const express = require("express")
const { body } = require("express-validator")
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  createPaymentIntent,
  confirmPayment,
  getOrderTracking,
} = require("../controllers/orders")
const { protect, admin } = require("../middleware/auth")

const router = express.Router()

// Validation rules
const createOrderValidation = [
  body("shippingAddress.name").notEmpty().withMessage("Shipping name is required"),
  body("shippingAddress.street").notEmpty().withMessage("Shipping street is required"),
  body("shippingAddress.city").notEmpty().withMessage("Shipping city is required"),
  body("shippingAddress.state").notEmpty().withMessage("Shipping state is required"),
  body("shippingAddress.zipCode").notEmpty().withMessage("Shipping zip code is required"),
  body("shippingAddress.phone").isMobilePhone().withMessage("Valid phone number is required"),
  body("paymentMethod").isIn(["stripe", "paypal", "cash"]).withMessage("Invalid payment method"),
]

const updateStatusValidation = [
  body("status")
    .isIn(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"])
    .withMessage("Invalid order status"),
  body("note").optional().isLength({ max: 500 }).withMessage("Note cannot be more than 500 characters"),
]

// Routes
router.get("/", protect, getOrders)
router.get("/:id", protect, getOrder)
router.post("/", protect, createOrderValidation, createOrder)
router.put("/:id/status", protect, admin, updateStatusValidation, updateOrderStatus)
router.put("/:id/cancel", protect, cancelOrder)
router.post("/:id/payment-intent", protect, createPaymentIntent)
router.post("/:id/confirm-payment", protect, confirmPayment)
router.get("/:id/tracking", getOrderTracking)

module.exports = router
