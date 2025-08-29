const { validationResult } = require("express-validator")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const Order = require("../models/Order")
const Cart = require("../models/Cart")
const Product = require("../models/Product")
const User = require("../models/User")
const sendEmail = require("../utils/sendEmail")

// @desc    Get user's orders
// @route   GET /api/orders
// @access  Private
const getOrders = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1
    const limit = Number.parseInt(req.query.limit, 10) || 10
    const status = req.query.status

    // Build query
    const query = { user: req.user.id }
    if (status) {
      query.status = status
    }

    const startIndex = (page - 1) * limit
    const total = await Order.countDocuments(query)

    const orders = await Order.find(query)
      .populate("items.product", "name slug images")
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
    console.error("Get orders error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.product", "name slug images")
      .populate("user", "name email phone")

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      })
    }

    // Make sure user owns order or is admin
    if (order.user._id.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Not authorized to access this order",
      })
    }

    res.status(200).json({
      success: true,
      data: order,
    })
  } catch (error) {
    console.error("Get order error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
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

    const { shippingAddress, paymentMethod, notes } = req.body

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user.id }).populate("items.product")

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Cart is empty",
      })
    }

    // Validate cart items and check inventory
    const orderItems = []
    let itemsPrice = 0

    for (const cartItem of cart.items) {
      const product = cartItem.product

      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          error: `Product ${product?.name || "unknown"} is no longer available`,
        })
      }

      // Check inventory
      if (product.inventory.trackQuantity && product.inventory.quantity < cartItem.quantity) {
        return res.status(400).json({
          success: false,
          error: `Only ${product.inventory.quantity} items available for ${product.name}`,
        })
      }

      const orderItem = {
        product: product._id,
        name: product.name,
        image: product.images[0]?.url || "/placeholder.svg",
        price: product.price,
        quantity: cartItem.quantity,
        totalPrice: product.price * cartItem.quantity,
      }

      orderItems.push(orderItem)
      itemsPrice += orderItem.totalPrice
    }

    // Calculate prices
    const taxRate = 0.08 // 8% tax
    const taxPrice = Math.round(itemsPrice * taxRate * 100) / 100
    const shippingPrice = itemsPrice > 100 ? 0 : 10 // Free shipping over $100
    const totalPrice = itemsPrice + taxPrice + shippingPrice

    // Create order
    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      shippingAddress,
      paymentInfo: {
        method: paymentMethod,
      },
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      notes,
    })

    // Update product inventory
    for (const cartItem of cart.items) {
      const product = cartItem.product
      if (product.inventory.trackQuantity) {
        product.inventory.quantity -= cartItem.quantity
        await product.save()
      }
    }

    // Clear user's cart
    cart.items = []
    await cart.save()

    // Send order confirmation email
    try {
      const user = await User.findById(req.user.id)
      await sendOrderConfirmationEmail(user, order)
    } catch (emailError) {
      console.error("Failed to send order confirmation email:", emailError)
    }

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    })
  } catch (error) {
    console.error("Create order error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during order creation",
    })
  }
}

// @desc    Update order status
// @route   PUT /api/orders/:id/status
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

    // Send status update email
    try {
      await sendOrderStatusEmail(order.user, order)
    } catch (emailError) {
      console.error("Failed to send order status email:", emailError)
    }

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

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("items.product")

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      })
    }

    // Make sure user owns order or is admin
    if (order.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Not authorized to cancel this order",
      })
    }

    // Check if order can be cancelled
    if (!["pending", "confirmed"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: "Order cannot be cancelled at this stage",
      })
    }

    // Update order status
    order.status = "cancelled"
    order.statusHistory.push({
      status: "cancelled",
      note: req.user.role === "admin" ? "Cancelled by admin" : "Cancelled by customer",
      date: new Date(),
    })

    // Restore product inventory
    for (const item of order.items) {
      const product = await Product.findById(item.product)
      if (product && product.inventory.trackQuantity) {
        product.inventory.quantity += item.quantity
        await product.save()
      }
    }

    await order.save()

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: order,
    })
  } catch (error) {
    console.error("Cancel order error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during order cancellation",
    })
  }
}

// @desc    Create payment intent
// @route   POST /api/orders/:id/payment-intent
// @access  Private
const createPaymentIntent = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      })
    }

    // Make sure user owns order
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to access this order",
      })
    }

    if (order.isPaid) {
      return res.status(400).json({
        success: false,
        error: "Order is already paid",
      })
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalPrice * 100), // Convert to cents
      currency: "usd",
      metadata: {
        orderId: order._id.toString(),
        userId: req.user.id,
      },
    })

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    })
  } catch (error) {
    console.error("Create payment intent error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during payment intent creation",
    })
  }
}

// @desc    Confirm payment
// @route   POST /api/orders/:id/confirm-payment
// @access  Private
const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body

    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      })
    }

    // Make sure user owns order
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to access this order",
      })
    }

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status === "succeeded") {
      order.isPaid = true
      order.paymentInfo.transactionId = paymentIntentId
      order.paymentInfo.paidAt = new Date()
      order.status = "confirmed"

      await order.save()

      res.status(200).json({
        success: true,
        message: "Payment confirmed successfully",
        data: order,
      })
    } else {
      res.status(400).json({
        success: false,
        error: "Payment not successful",
      })
    }
  } catch (error) {
    console.error("Confirm payment error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during payment confirmation",
    })
  }
}

// @desc    Get order tracking
// @route   GET /api/orders/:id/tracking
// @access  Public
const getOrderTracking = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).select(
      "orderNumber status statusHistory trackingNumber estimatedDelivery createdAt",
    )

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      })
    }

    res.status(200).json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        statusHistory: order.statusHistory,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery,
        orderDate: order.createdAt,
      },
    })
  } catch (error) {
    console.error("Get order tracking error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// Helper function to send order confirmation email
const sendOrderConfirmationEmail = async (user, order) => {
  const itemsList = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.totalPrice.toFixed(2)}</td>
    </tr>
  `,
    )
    .join("")

  const message = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h1 style="color: #333; text-align: center;">Order Confirmation</h1>
      <p>Dear ${user.name},</p>
      <p>Thank you for your order! Your order <strong>#${order.orderNumber}</strong> has been received and is being processed.</p>
      
      <h2 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 10px;">Order Details</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #333;">Product</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #333;">Quantity</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #333;">Price</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #333;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
        </tbody>
      </table>
      
      <div style="text-align: right; margin: 20px 0;">
        <p><strong>Subtotal: $${order.itemsPrice.toFixed(2)}</strong></p>
        <p><strong>Tax: $${order.taxPrice.toFixed(2)}</strong></p>
        <p><strong>Shipping: $${order.shippingPrice.toFixed(2)}</strong></p>
        <p style="font-size: 18px; color: #333;"><strong>Total: $${order.totalPrice.toFixed(2)}</strong></p>
      </div>
      
      <h2 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 10px;">Shipping Address</h2>
      <p>
        ${order.shippingAddress.name}<br>
        ${order.shippingAddress.street}<br>
        ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}<br>
        ${order.shippingAddress.country}<br>
        Phone: ${order.shippingAddress.phone}
      </p>
      
      <p style="margin-top: 30px;">We'll send you another email when your order ships.</p>
      <p>Thank you for choosing Meat Shop!</p>
    </div>
  `

  await sendEmail({
    email: user.email,
    subject: `Order Confirmation - #${order.orderNumber}`,
    html: message,
  })
}

// Helper function to send order status update email
const sendOrderStatusEmail = async (user, order) => {
  const statusMessages = {
    confirmed: "Your order has been confirmed and is being prepared.",
    processing: "Your order is currently being processed.",
    shipped: "Your order has been shipped and is on its way to you.",
    delivered: "Your order has been delivered. We hope you enjoy your purchase!",
    cancelled: "Your order has been cancelled.",
    refunded: "Your order has been refunded.",
  }

  const message = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h1 style="color: #333; text-align: center;">Order Status Update</h1>
      <p>Dear ${user.name},</p>
      <p>Your order <strong>#${order.orderNumber}</strong> status has been updated.</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h2 style="color: #333; margin: 0;">Status: ${order.status.toUpperCase()}</h2>
        <p style="margin: 10px 0 0 0;">${statusMessages[order.status] || "Your order status has been updated."}</p>
      </div>
      
      ${order.trackingNumber ? `<p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>` : ""}
      
      ${
        order.estimatedDelivery
          ? `<p><strong>Estimated Delivery:</strong> ${new Date(order.estimatedDelivery).toLocaleDateString()}</p>`
          : ""
      }
      
      <p style="margin-top: 30px;">Thank you for choosing Meat Shop!</p>
    </div>
  `

  await sendEmail({
    email: user.email,
    subject: `Order Status Update - #${order.orderNumber}`,
    html: message,
  })
}

module.exports = {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  createPaymentIntent,
  confirmPayment,
  getOrderTracking,
}
