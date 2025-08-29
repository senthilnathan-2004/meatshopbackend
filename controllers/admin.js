const { validationResult } = require("express-validator")
const User = require("../models/User")
const Order = require("../models/Order")
const Product = require("../models/Product")
const Category = require("../models/Category")
const Review = require("../models/Review")
const Cart = require("../models/Cart")

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Total counts
    const totalUsers = await User.countDocuments({ isActive: true })
    const totalProducts = await Product.countDocuments({ isActive: true })
    const totalOrders = await Order.countDocuments()
    const totalCategories = await Category.countDocuments({ isActive: true })

    // Monthly stats
    const thisMonthOrders = await Order.countDocuments({
      createdAt: { $gte: startOfMonth },
    })
    const lastMonthOrders = await Order.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    })

    const thisMonthUsers = await User.countDocuments({
      createdAt: { $gte: startOfMonth },
    })
    const lastMonthUsers = await User.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    })

    // Revenue stats
    const thisMonthRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth },
          isPaid: true,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalPrice" },
        },
      },
    ])

    const lastMonthRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
          isPaid: true,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalPrice" },
        },
      },
    ])

    // Order status distribution
    const orderStatusStats = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ])

    // Low stock products
    const lowStockProducts = await Product.find({
      "inventory.trackQuantity": true,
      $expr: { $lte: ["$inventory.quantity", "$inventory.lowStockThreshold"] },
      isActive: true,
    })
      .select("name sku inventory.quantity inventory.lowStockThreshold")
      .limit(10)

    // Recent orders
    const recentOrders = await Order.find()
      .populate("user", "name email")
      .select("orderNumber user totalPrice status createdAt")
      .sort("-createdAt")
      .limit(5)

    // Top selling products (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const topProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          status: { $in: ["delivered", "shipped", "processing"] },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalSold: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.totalPrice" },
          productName: { $first: "$items.name" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ])

    res.status(200).json({
      success: true,
      data: {
        totals: {
          users: totalUsers,
          products: totalProducts,
          orders: totalOrders,
          categories: totalCategories,
        },
        monthly: {
          orders: {
            current: thisMonthOrders,
            previous: lastMonthOrders,
            change: lastMonthOrders > 0 ? ((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100 : 0,
          },
          users: {
            current: thisMonthUsers,
            previous: lastMonthUsers,
            change: lastMonthUsers > 0 ? ((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100 : 0,
          },
          revenue: {
            current: thisMonthRevenue[0]?.total || 0,
            previous: lastMonthRevenue[0]?.total || 0,
            change:
              lastMonthRevenue[0]?.total > 0
                ? (((thisMonthRevenue[0]?.total || 0) - lastMonthRevenue[0].total) / lastMonthRevenue[0].total) * 100
                : 0,
          },
        },
        orderStatusStats,
        lowStockProducts,
        recentOrders,
        topProducts,
      },
    })
  } catch (error) {
    console.error("Get dashboard stats error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1
    const limit = Number.parseInt(req.query.limit, 10) || 20
    const search = req.query.search
    const role = req.query.role
    const status = req.query.status

    // Build query
    const query = {}
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ]
    }
    if (role) query.role = role
    if (status === "active") query.isActive = true
    if (status === "inactive") query.isActive = false

    const startIndex = (page - 1) * limit
    const total = await User.countDocuments(query)

    const users = await User.find(query).select("-password").skip(startIndex).limit(limit).sort("-createdAt")

    // Get order counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const orderCount = await Order.countDocuments({ user: user._id })
        const totalSpent = await Order.aggregate([
          {
            $match: { user: user._id, isPaid: true },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalPrice" },
            },
          },
        ])

        return {
          ...user.toObject(),
          orderCount,
          totalSpent: totalSpent[0]?.total || 0,
        }
      }),
    )

    // Pagination result
    const pagination = {}
    const endIndex = page * limit

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      }
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      }
    }

    res.status(200).json({
      success: true,
      count: usersWithStats.length,
      total,
      pagination,
      data: usersWithStats,
    })
  } catch (error) {
    console.error("Get all users error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Get user details
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password")

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      })
    }

    // Get user's orders
    const orders = await Order.find({ user: user._id })
      .select("orderNumber totalPrice status createdAt")
      .sort("-createdAt")
      .limit(10)

    // Get user's cart
    const cart = await Cart.findOne({ user: user._id }).populate("items.product", "name price")

    // Get user stats
    const orderCount = await Order.countDocuments({ user: user._id })
    const totalSpent = await Order.aggregate([
      {
        $match: { user: user._id, isPaid: true },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalPrice" },
        },
      },
    ])

    const reviewCount = await Review.countDocuments({ user: user._id })

    res.status(200).json({
      success: true,
      data: {
        user,
        stats: {
          orderCount,
          totalSpent: totalSpent[0]?.total || 0,
          reviewCount,
        },
        recentOrders: orders,
        cart,
      },
    })
  } catch (error) {
    console.error("Get user details error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res) => {
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

    const { role } = req.body

    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      })
    }

    // Prevent admin from changing their own role
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        error: "Cannot change your own role",
      })
    }

    user.role = role
    await user.save()

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Update user role error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during role update",
    })
  }
}

// @desc    Deactivate user
// @route   PUT /api/admin/users/:id/deactivate
// @access  Private/Admin
const deactivateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      })
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        error: "Cannot deactivate your own account",
      })
    }

    // Check for pending orders
    const pendingOrders = await Order.countDocuments({
      user: user._id,
      status: { $in: ["pending", "confirmed", "processing", "shipped"] },
    })

    if (pendingOrders > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot deactivate user with pending orders",
      })
    }

    user.isActive = !user.isActive
    await user.save()

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
      },
    })
  } catch (error) {
    console.error("Deactivate user error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during user deactivation",
    })
  }
}

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrders = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1
    const limit = Number.parseInt(req.query.limit, 10) || 20
    const status = req.query.status
    const search = req.query.search
    const startDate = req.query.startDate
    const endDate = req.query.endDate

    // Build query
    const query = {}
    if (status) query.status = status
    if (search) {
      query.$or = [{ orderNumber: { $regex: search, $options: "i" } }]
    }
    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) query.createdAt.$gte = new Date(startDate)
      if (endDate) query.createdAt.$lte = new Date(endDate)
    }

    const startIndex = (page - 1) * limit
    const total = await Order.countDocuments(query)

    const orders = await Order.find(query)
      .populate("user", "name email phone")
      .populate("items.product", "name images")
      .skip(startIndex)
      .limit(limit)
      .sort("-createdAt")

    // Pagination result
    const pagination = {}
    const endIndex = page * limit

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      }
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      }
    }

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      pagination,
      data: orders,
    })
  } catch (error) {
    console.error("Get all orders error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Get order details
// @route   GET /api/admin/orders/:id
// @access  Private/Admin
const getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email phone address")
      .populate("items.product", "name slug images sku")

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      })
    }

    res.status(200).json({
      success: true,
      data: order,
    })
  } catch (error) {
    console.error("Get order details error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
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

    const { status, note, trackingNumber, estimatedDelivery } = req.body

    const order = await Order.findById(req.params.id).populate("user", "name email")

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      })
    }

    // Update order
    order.status = status
    if (note) {
      order.statusHistory.push({
        status,
        note,
        date: new Date(),
      })
    }
    if (trackingNumber) order.trackingNumber = trackingNumber
    if (estimatedDelivery) order.estimatedDelivery = estimatedDelivery

    await order.save()

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: order,
    })
  } catch (error) {
    console.error("Update order status error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during order status update",
    })
  }
}

// @desc    Get all products (admin view)
// @route   GET /api/admin/products
// @access  Private/Admin
const getAllProducts = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1
    const limit = Number.parseInt(req.query.limit, 10) || 20
    const search = req.query.search
    const category = req.query.category
    const status = req.query.status

    // Build query
    const query = {}
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ]
    }
    if (category) query.category = category
    if (status === "active") query.isActive = true
    if (status === "inactive") query.isActive = false

    const startIndex = (page - 1) * limit
    const total = await Product.countDocuments(query)

    const products = await Product.find(query)
      .populate("category", "name")
      .populate("createdBy", "name")
      .skip(startIndex)
      .limit(limit)
      .sort("-createdAt")

    // Pagination result
    const pagination = {}
    const endIndex = page * limit

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      }
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      }
    }

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      pagination,
      data: products,
    })
  } catch (error) {
    console.error("Get all products error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Get product details (admin view)
// @route   GET /api/admin/products/:id
// @access  Private/Admin
const getProductDetails = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name slug")
      .populate("createdBy", "name email")

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      })
    }

    // Get product reviews
    const reviews = await Review.find({ product: product._id }).populate("user", "name").sort("-createdAt").limit(5)

    // Get sales stats
    const salesStats = await Order.aggregate([
      { $unwind: "$items" },
      {
        $match: {
          "items.product": product._id,
          status: { $in: ["delivered", "shipped", "processing"] },
        },
      },
      {
        $group: {
          _id: null,
          totalSold: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.totalPrice" },
        },
      },
    ])

    res.status(200).json({
      success: true,
      data: {
        product,
        reviews,
        salesStats: salesStats[0] || { totalSold: 0, revenue: 0 },
      },
    })
  } catch (error) {
    console.error("Get product details error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Toggle product status
// @route   PUT /api/admin/products/:id/toggle-status
// @access  Private/Admin
const toggleProductStatus = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      })
    }

    product.isActive = !product.isActive
    await product.save()

    res.status(200).json({
      success: true,
      message: `Product ${product.isActive ? "activated" : "deactivated"} successfully`,
      data: {
        id: product._id,
        name: product.name,
        isActive: product.isActive,
      },
    })
  } catch (error) {
    console.error("Toggle product status error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during product status update",
    })
  }
}

// @desc    Get all reviews
// @route   GET /api/admin/reviews
// @access  Private/Admin
const getAllReviews = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1
    const limit = Number.parseInt(req.query.limit, 10) || 20
    const status = req.query.status
    const rating = req.query.rating

    // Build query
    const query = {}
    if (status === "approved") query.isApproved = true
    if (status === "pending") query.isApproved = false
    if (rating) query.rating = Number.parseInt(rating, 10)

    const startIndex = (page - 1) * limit
    const total = await Review.countDocuments(query)

    const reviews = await Review.find(query)
      .populate("user", "name email")
      .populate("product", "name slug images")
      .skip(startIndex)
      .limit(limit)
      .sort("-createdAt")

    // Pagination result
    const pagination = {}
    const endIndex = page * limit

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      }
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      }
    }

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      pagination,
      data: reviews,
    })
  } catch (error) {
    console.error("Get all reviews error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Update review status
// @route   PUT /api/admin/reviews/:id/status
// @access  Private/Admin
const updateReviewStatus = async (req, res) => {
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

    const { isApproved } = req.body

    const review = await Review.findById(req.params.id)

    if (!review) {
      return res.status(404).json({
        success: false,
        error: "Review not found",
      })
    }

    review.isApproved = isApproved
    await review.save()

    res.status(200).json({
      success: true,
      message: `Review ${isApproved ? "approved" : "rejected"} successfully`,
      data: review,
    })
  } catch (error) {
    console.error("Update review status error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during review status update",
    })
  }
}

// @desc    Delete review
// @route   DELETE /api/admin/reviews/:id
// @access  Private/Admin
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)

    if (!review) {
      return res.status(404).json({
        success: false,
        error: "Review not found",
      })
    }

    await review.remove()

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    })
  } catch (error) {
    console.error("Delete review error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during review deletion",
    })
  }
}

// @desc    Get sales analytics
// @route   GET /api/admin/analytics/sales
// @access  Private/Admin
const getSalesAnalytics = async (req, res) => {
  try {
    const { period = "30d" } = req.query

    let startDate
    const now = new Date()

    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Daily sales data
    const dailySales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          isPaid: true,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          revenue: { $sum: "$totalPrice" },
          orders: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
      },
    ])

    // Top selling products
    const topProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ["delivered", "shipped", "processing"] },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalSold: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.totalPrice" },
          productName: { $first: "$items.name" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ])

    // Revenue by category
    const revenueByCategory = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          isPaid: true,
        },
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: "categories",
          localField: "product.category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $group: {
          _id: "$category._id",
          categoryName: { $first: "$category.name" },
          revenue: { $sum: "$items.totalPrice" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
    ])

    res.status(200).json({
      success: true,
      data: {
        dailySales,
        topProducts,
        revenueByCategory,
        period,
      },
    })
  } catch (error) {
    console.error("Get sales analytics error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Get inventory report
// @route   GET /api/admin/reports/inventory
// @access  Private/Admin
const getInventoryReport = async (req, res) => {
  try {
    // Low stock products
    const lowStockProducts = await Product.find({
      "inventory.trackQuantity": true,
      $expr: { $lte: ["$inventory.quantity", "$inventory.lowStockThreshold"] },
      isActive: true,
    })
      .populate("category", "name")
      .select("name sku category inventory price")

    // Out of stock products
    const outOfStockProducts = await Product.find({
      "inventory.trackQuantity": true,
      "inventory.quantity": 0,
      isActive: true,
    })
      .populate("category", "name")
      .select("name sku category inventory price")

    // Inventory value by category
    const inventoryByCategory = await Product.aggregate([
      {
        $match: { isActive: true },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $group: {
          _id: "$category._id",
          categoryName: { $first: "$category.name" },
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: "$inventory.quantity" },
          totalValue: {
            $sum: {
              $multiply: ["$inventory.quantity", "$cost"],
            },
          },
        },
      },
      { $sort: { totalValue: -1 } },
    ])

    res.status(200).json({
      success: true,
      data: {
        lowStockProducts,
        outOfStockProducts,
        inventoryByCategory,
        summary: {
          lowStockCount: lowStockProducts.length,
          outOfStockCount: outOfStockProducts.length,
        },
      },
    })
  } catch (error) {
    console.error("Get inventory report error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Get customer analytics
// @route   GET /api/admin/analytics/customers
// @access  Private/Admin
const getCustomerAnalytics = async (req, res) => {
  try {
    const { period = "30d" } = req.query

    let startDate
    const now = new Date()

    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // New customers over time
    const newCustomers = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          role: "customer",
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
      },
    ])

    // Top customers by spending
    const topCustomers = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          isPaid: true,
        },
      },
      {
        $group: {
          _id: "$user",
          totalSpent: { $sum: "$totalPrice" },
          orderCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 1,
          totalSpent: 1,
          orderCount: 1,
          name: "$user.name",
          email: "$user.email",
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
    ])

    // Customer retention (customers who made more than one order)
    const customerRetention = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$user",
          orderCount: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          returningCustomers: {
            $sum: { $cond: [{ $gt: ["$orderCount", 1] }, 1, 0] },
          },
        },
      },
    ])

    const retentionRate =
      customerRetention[0]?.totalCustomers > 0
        ? (customerRetention[0].returningCustomers / customerRetention[0].totalCustomers) * 100
        : 0

    res.status(200).json({
      success: true,
      data: {
        newCustomers,
        topCustomers,
        retentionRate: Math.round(retentionRate * 100) / 100,
        period,
      },
    })
  } catch (error) {
    console.error("Get customer analytics error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

module.exports = {
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
}
