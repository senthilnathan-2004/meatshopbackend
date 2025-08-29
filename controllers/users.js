const { validationResult } = require("express-validator")
const User = require("../models/User")
const Cart = require("../models/Cart")
const Order = require("../models/Order")

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      })
    }

    // Get user's order count
    const orderCount = await Order.countDocuments({ user: user._id })

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
        orderCount,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    })
  } catch (error) {
    console.error("Get user profile error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
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

    const { name, phone, address, avatar } = req.body

    // Build update object
    const updateData = {}
    if (name) updateData.name = name
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
    console.error("Update user profile error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during profile update",
    })
  }
}

// @desc    Delete user account
// @route   DELETE /api/users/account
// @access  Private
const deleteUserAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      })
    }

    // Check if user has pending orders
    const pendingOrders = await Order.countDocuments({
      user: user._id,
      status: { $in: ["pending", "confirmed", "processing", "shipped"] },
    })

    if (pendingOrders > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete account with pending orders. Please wait for orders to be completed or contact support.",
      })
    }

    // Delete user's cart
    await Cart.findOneAndDelete({ user: user._id })

    // Deactivate user instead of deleting (to preserve order history)
    user.isActive = false
    user.email = `deleted_${Date.now()}_${user.email}`
    await user.save()

    res.status(200).json({
      success: true,
      message: "Account deactivated successfully",
    })
  } catch (error) {
    console.error("Delete user account error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during account deletion",
    })
  }
}

module.exports = {
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
}
