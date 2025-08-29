const express = require("express")
const { body } = require("express-validator")
const { getUserProfile, updateUserProfile, deleteUserAccount } = require("../controllers/users")
const { protect } = require("../middleware/auth")

const router = express.Router()

// Validation rules
const updateProfileValidation = [
  body("name").optional().trim().isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters"),
  body("phone").optional().isMobilePhone().withMessage("Please provide a valid phone number"),
]

// Routes
router.get("/profile", protect, getUserProfile)
router.put("/profile", protect, updateProfileValidation, updateUserProfile)
router.delete("/account", protect, deleteUserAccount)

module.exports = router
