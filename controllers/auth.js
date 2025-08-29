const { validationResult } = require("express-validator")
const User = require("../models/User")
const generateToken = require("../utils/generateToken")
const sendEmail = require("../utils/sendEmail")
const crypto = require("crypto")

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      })
    }

    const { name, email, password, phone, address } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User already exists with this email",
      })
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      address,
    })

    // Update last login
    await user.updateLastLogin()

    // Generate token
    const token = generateToken(user._id)

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: user.address,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during registration",
    })
  }
}

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      })
    }

    const { email, password } = req.body

    // Check for user and include password
    const user = await User.findOne({ email }).select("+password")

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      })
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: "Account has been deactivated",
      })
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password)

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      })
    }

    // Update last login
    await user.updateLastLogin()

    // Generate token
    const token = await generateToken(user._id)

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: user.address,
        avatar: user.avatar,
        lastLogin: user.lastLogin,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during login",
    })
  }
}

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
const logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  })
}

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      })
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: user.address,
        avatar: user.avatar,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    })
  } catch (error) {
    console.error("Get user error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Update user profile
// @route   PUT /api/auth/updateprofile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      })
    }

    const { name, email, phone, address, avatar } = req.body

    // Check if email is being changed and if it's already taken
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: "Email is already taken",
        })
      }
    }

    // Build update object
    const updateData = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (phone) updateData.phone = phone
    if (address) updateData.address = { ...req.user.address, ...address }
    if (avatar) updateData.avatar = avatar

    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true,
    })

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: user.address,
        avatar: user.avatar,
        updatedAt: user.updatedAt,
      },
    })
  } catch (error) {
    console.error("Update profile error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during profile update",
    })
  }
}

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
const updatePassword = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      })
    }

    const { currentPassword, newPassword } = req.body

    // Get user with password
    const user = await User.findById(req.user.id).select("+password")

    // Check current password
    const isMatch = await user.matchPassword(currentPassword)

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: "Current password is incorrect",
      })
    }

    // Update password
    user.password = newPassword
    await user.save()

    // Generate new token
    const token = generateToken(user._id)

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
      token,
    })
  } catch (error) {
    console.error("Update password error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during password update",
    })
  }
}

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Please provide an email address",
      })
    }

    const user = await User.findOne({ email })

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "No user found with this email address",
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex")

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex")

    // Set expire time (10 minutes)
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000

    await user.save({ validateBeforeSave: false })

    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get("host")}/api/auth/resetpassword/${resetToken}`

    const message = `
      <h1>Password Reset Request</h1>
      <p>You have requested a password reset for your Meat Shop account.</p>
      <p>Please click the link below to reset your password:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>This link will expire in 10 minutes.</p>
      <p>If you did not request this password reset, please ignore this email.</p>
    `

    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset Request - Meat Shop",
        html: message,
      })

      res.status(200).json({
        success: true,
        message: "Password reset email sent",
      })
    } catch (error) {
      console.error("Email send error:", error)
      user.resetPasswordToken = undefined
      user.resetPasswordExpire = undefined

      await user.save({ validateBeforeSave: false })

      return res.status(500).json({
        success: false,
        error: "Email could not be sent",
      })
    }
  } catch (error) {
    console.error("Forgot password error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { password } = req.body

    if (!password) {
      return res.status(400).json({
        success: false,
        error: "Please provide a new password",
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long",
      })
    }

    // Get hashed token
    const resetPasswordToken = crypto.createHash("sha256").update(req.params.resettoken).digest("hex")

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    })

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset token",
      })
    }

    // Set new password
    user.password = password
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined
    await user.save()

    // Generate token
    const token = generateToken(user._id)

    res.status(200).json({
      success: true,
      message: "Password reset successful",
      token,
    })
  } catch (error) {
    console.error("Reset password error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during password reset",
    })
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
}
