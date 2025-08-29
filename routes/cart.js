const express = require("express")
const { body } = require("express-validator")
const { getCart, addToCart, updateCartItem, removeFromCart, clearCart, syncCart } = require("../controllers/cart")
const { protect } = require("../middleware/auth")

const router = express.Router()

// Validation rules
const addToCartValidation = [
  body("productId").isMongoId().withMessage("Please provide a valid product ID"),
  body("quantity").isInt({ min: 1, max: 100 }).withMessage("Quantity must be between 1 and 100"),
]

const updateCartValidation = [
  body("productId").isMongoId().withMessage("Please provide a valid product ID"),
  body("quantity").isInt({ min: 1, max: 100 }).withMessage("Quantity must be between 1 and 100"),
]

const syncCartValidation = [
  body("items").isArray().withMessage("Items must be an array"),
  body("items.*.productId").isMongoId().withMessage("Please provide valid product IDs"),
  body("items.*.quantity").isInt({ min: 1, max: 100 }).withMessage("Quantity must be between 1 and 100"),
]

// Routes
router.get("/", protect, getCart)
router.post("/add", protect, addToCartValidation, addToCart)
router.put("/update", protect, updateCartValidation, updateCartItem)
router.delete("/remove/:productId", protect, removeFromCart)
router.delete("/clear", protect, clearCart)
router.post("/sync", protect, syncCartValidation, syncCart)

module.exports = router
