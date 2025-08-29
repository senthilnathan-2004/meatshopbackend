const express = require("express")
const { body } = require("express-validator")
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
} = require("../controllers/categories")
const { protect, admin } = require("../middleware/auth")
const upload = require("../middleware/upload")

const router = express.Router()

// Validation rules
const categoryValidation = [
  body("name").trim().isLength({ min: 2, max: 50 }).withMessage("Category name must be between 2 and 50 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot be more than 500 characters"),
]

// Routes
router.get("/", getCategories)
router.get("/:id", getCategory)
router.post("/", protect, admin, categoryValidation, createCategory)
router.put("/:id", protect, admin, categoryValidation, updateCategory)
router.delete("/:id", protect, admin, deleteCategory)
router.post("/:id/image", protect, admin, upload.single("image"), uploadCategoryImage)

module.exports = router
