const express = require("express")
const { body } = require("express-validator")
const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
} = require("../controllers/auth")
const { protect } = require("../middleware/auth")

const router = express.Router()

// Validation rules
const registerValidation = [
  body("name").trim().isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters"),
  body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
  body("phone").isMobilePhone().withMessage("Please provide a valid phone number"),
  body("address.street").notEmpty().withMessage("Street address is required"),
  body("address.city").notEmpty().withMessage("City is required"),
  body("address.state").notEmpty().withMessage("State is required"),
  body("address.zipCode").notEmpty().withMessage("Zip code is required"),
]

const loginValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
]

const updateProfileValidation = [
  body("name").optional().trim().isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters"),
  body("email").optional().isEmail().normalizeEmail().withMessage("Please provide a valid email"),
  body("phone").optional().isMobilePhone().withMessage("Please provide a valid phone number"),
]

const updatePasswordValidation = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters long"),
]

// Routes
router.post("/register", registerValidation, register)
router.post("/login", loginValidation, login)
router.post("/logout", logout)
router.get("/me", protect, getMe)
router.put("/updateprofile", protect, updateProfileValidation, updateProfile)
router.put("/updatepassword", protect, updatePasswordValidation, updatePassword)
router.post("/forgotpassword", forgotPassword)
router.put("/resetpassword/:resettoken", resetPassword)

module.exports = router
