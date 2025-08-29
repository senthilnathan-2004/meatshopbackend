const express = require("express")
const { body } = require("express-validator")
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  getFeaturedProducts,
  getProductsByCategory,
  searchProducts,
  getProductReviews,
  addProductReview,
  updateProductReview,
  deleteProductReview,
} = require("../controllers/products")
const { protect, admin, optionalAuth } = require("../middleware/auth")
const upload = require("../middleware/upload")

const router = express.Router()

// Validation rules
const productValidation = [
  body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Product name must be between 2 and 100 characters"),
  body("description")
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters"),
  body("category").isMongoId().withMessage("Please provide a valid category ID"),
  body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  body("sku").trim().isLength({ min: 3, max: 20 }).withMessage("SKU must be between 3 and 20 characters"),
  body("weight.value").isFloat({ min: 0 }).withMessage("Weight value must be a positive number"),
  body("weight.unit").isIn(["lb", "oz", "kg", "g"]).withMessage("Weight unit must be lb, oz, kg, or g"),
]

const reviewValidation = [
  body("title").trim().isLength({ min: 5, max: 100 }).withMessage("Review title must be between 5 and 100 characters"),
  body("text")
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Review text must be between 10 and 1000 characters"),
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
]

// Product routes
router.get("/", optionalAuth, getProducts)
router.get("/featured", getFeaturedProducts)
router.get("/search", searchProducts)
router.get("/category/:categoryId", getProductsByCategory)
router.get("/:id", optionalAuth, getProduct)
router.post("/", protect, admin, productValidation, createProduct)
router.put("/:id", protect, admin, productValidation, updateProduct)
router.delete("/:id", protect, admin, deleteProduct)
router.post("/:id/images", protect, admin, upload.array("images", 5), uploadProductImages)

// Review routes
router.get("/:id/reviews", getProductReviews)
router.post("/:id/reviews", protect, reviewValidation, addProductReview)
router.put("/:id/reviews/:reviewId", protect, reviewValidation, updateProductReview)
router.delete("/:id/reviews/:reviewId", protect, deleteProductReview)

module.exports = router
