const { validationResult } = require("express-validator")
const Cart = require("../models/Cart")
const Product = require("../models/Product")

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate({
      path: "items.product",
      select: "name slug price images inventory isActive",
    })

    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] })
    }

    // Filter out inactive products and update cart
    const activeItems = cart.items.filter((item) => item.product && item.product.isActive)

    if (activeItems.length !== cart.items.length) {
      cart.items = activeItems
      await cart.save()
    }

    res.status(200).json({
      success: true,
      data: cart,
    })
  } catch (error) {
    console.error("Get cart error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
const addToCart = async (req, res) => {
  try {
    // Check for validation errors
    const validationErrors = validationResult(req)
    if (!validationErrors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validationErrors.array(),
      })
    }

    const { productId, quantity } = req.body

    // Check if product exists and is active
    const product = await Product.findById(productId)
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        error: "Product not found or inactive",
      })
    }

    // Check inventory
    if (product.inventory.trackQuantity && product.inventory.quantity < quantity) {
      return res.status(400).json({
        success: false,
        error: `Only ${product.inventory.quantity} items available in stock`,
      })
    }

    // Get or create cart
    let cart = await Cart.findOne({ user: req.user.id })
    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] })
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex((item) => item.product.toString() === productId)

    if (existingItemIndex > -1) {
      // Update existing item
      const newQuantity = cart.items[existingItemIndex].quantity + quantity

      // Check inventory for new quantity
      if (product.inventory.trackQuantity && product.inventory.quantity < newQuantity) {
        return res.status(400).json({
          success: false,
          error: `Only ${product.inventory.quantity} items available in stock`,
        })
      }

      cart.items[existingItemIndex].quantity = newQuantity
      cart.items[existingItemIndex].price = product.price
      cart.items[existingItemIndex].totalPrice = newQuantity * product.price
    } else {
      // Add new item
      cart.items.push({
        product: productId,
        quantity,
        price: product.price,
        totalPrice: quantity * product.price,
      })
    }

    await cart.save()

    // Populate product details
    await cart.populate({
      path: "items.product",
      select: "name slug price images inventory isActive",
    })

    res.status(200).json({
      success: true,
      message: "Item added to cart successfully",
      data: cart,
    })
  } catch (error) {
    console.error("Add to cart error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during cart update",
    })
  }
}

// @desc    Update cart item quantity
// @route   PUT /api/cart/update
// @access  Private
const updateCartItem = async (req, res) => {
  try {
    // Check for validation errors
    const validationErrors = validationResult(req)
    if (!validationErrors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validationErrors.array(),
      })
    }

    const { productId, quantity } = req.body

    // Get cart
    const cart = await Cart.findOne({ user: req.user.id })
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: "Cart not found",
      })
    }

    // Find item in cart
    const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId)
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Item not found in cart",
      })
    }

    // Check if product exists and is active
    const product = await Product.findById(productId)
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        error: "Product not found or inactive",
      })
    }

    // Check inventory
    if (product.inventory.trackQuantity && product.inventory.quantity < quantity) {
      return res.status(400).json({
        success: false,
        error: `Only ${product.inventory.quantity} items available in stock`,
      })
    }

    // Update item
    cart.items[itemIndex].quantity = quantity
    cart.items[itemIndex].price = product.price
    cart.items[itemIndex].totalPrice = quantity * product.price

    await cart.save()

    // Populate product details
    await cart.populate({
      path: "items.product",
      select: "name slug price images inventory isActive",
    })

    res.status(200).json({
      success: true,
      message: "Cart item updated successfully",
      data: cart,
    })
  } catch (error) {
    console.error("Update cart item error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during cart update",
    })
  }
}

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:productId
// @access  Private
const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params

    // Get cart
    const cart = await Cart.findOne({ user: req.user.id })
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: "Cart not found",
      })
    }

    // Remove item from cart
    cart.items = cart.items.filter((item) => item.product.toString() !== productId)

    await cart.save()

    // Populate product details
    await cart.populate({
      path: "items.product",
      select: "name slug price images inventory isActive",
    })

    res.status(200).json({
      success: true,
      message: "Item removed from cart successfully",
      data: cart,
    })
  } catch (error) {
    console.error("Remove from cart error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during cart update",
    })
  }
}

// @desc    Clear entire cart
// @route   DELETE /api/cart/clear
// @access  Private
const clearCart = async (req, res) => {
  try {
    // Get cart
    let cart = await Cart.findOne({ user: req.user.id })
    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] })
    }

    // Clear all items
    cart.items = []
    await cart.save()

    res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      data: cart,
    })
  } catch (error) {
    console.error("Clear cart error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during cart clear",
    })
  }
}

// @desc    Sync cart with client-side cart
// @route   POST /api/cart/sync
// @access  Private
const syncCart = async (req, res) => {
  try {
    // Check for validation errors
    const validationErrors = validationResult(req)
    if (!validationErrors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validationErrors.array(),
      })
    }

    const { items } = req.body

    // Get or create cart
    let cart = await Cart.findOne({ user: req.user.id })
    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] })
    }

    // Validate all products and build new cart items
    const newCartItems = []
    const syncErrors = []

    for (const item of items) {
      const product = await Product.findById(item.productId)

      if (!product || !product.isActive) {
        syncErrors.push(`Product ${item.productId} not found or inactive`)
        continue
      }

      // Check inventory
      if (product.inventory.trackQuantity && product.inventory.quantity < item.quantity) {
        syncErrors.push(`Only ${product.inventory.quantity} items available for ${product.name}`)
        continue
      }

      newCartItems.push({
        product: item.productId,
        quantity: item.quantity,
        price: product.price,
        totalPrice: item.quantity * product.price,
      })
    }

    // Update cart with valid items
    cart.items = newCartItems
    await cart.save()

    // Populate product details
    await cart.populate({
      path: "items.product",
      select: "name slug price images inventory isActive",
    })

    res.status(200).json({
      success: true,
      message: "Cart synced successfully",
      data: cart,
      errors: syncErrors.length > 0 ? syncErrors : undefined,
    })
  } catch (error) {
    console.error("Sync cart error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during cart sync",
    })
  }
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  syncCart,
}
