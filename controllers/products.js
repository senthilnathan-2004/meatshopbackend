const { validationResult } = require("express-validator")
const Product = require("../models/Product")
const Category = require("../models/Category")
const Review = require("../models/Review")
const Order = require("../models/Order")
const { uploadImage, deleteImage } = require("../config/cloudinary")

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    // Build query
    let query = Product.find({ isActive: true })

    // Copy req.query
    const reqQuery = { ...req.query }

    // Fields to exclude from filtering
    const removeFields = ["select", "sort", "page", "limit"]
    removeFields.forEach((param) => delete reqQuery[param])

    // Create query string
    let queryStr = JSON.stringify(reqQuery)

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, (match) => `$${match}`)

    // Finding resource
    query = Product.find(JSON.parse(queryStr)).populate("category", "name slug")

    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(",").join(" ")
      query = query.select(fields)
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ")
      query = query.sort(sortBy)
    } else {
      query = query.sort("-createdAt")
    }

    // Pagination
    const page = Number.parseInt(req.query.page, 10) || 1
    const limit = Number.parseInt(req.query.limit, 10) || 12
    const startIndex = (page - 1) * limit
    const endIndex = page * limit
    const total = await Product.countDocuments(JSON.parse(queryStr))

    query = query.skip(startIndex).limit(limit)

    // Execute query
    const products = await query

    // Pagination result
    const pagination = {}

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
    console.error("Get products error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProduct = async (req, res) => {
  try {
    let product

    // Check if the parameter is a valid ObjectId or a slug
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(req.params.id).populate("category", "name slug description")
    } else {
      product = await Product.findOne({ slug: req.params.id }).populate("category", "name slug description")
    }

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      })
    }

    // Get related products from same category
    const relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
      isActive: true,
    })
      .limit(4)
      .select("name slug price images averageRating numOfReviews")

    res.status(200).json({
      success: true,
      data: product,
      relatedProducts,
    })
  } catch (error) {
    console.error("Get product error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
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

    // Check if category exists
    const category = await Category.findById(req.body.category)
    if (!category) {
      return res.status(400).json({
        success: false,
        error: "Category not found",
      })
    }

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku: req.body.sku.toUpperCase() })
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        error: "Product with this SKU already exists",
      })
    }

    // Add user to req.body
    req.body.createdBy = req.user.id

    const product = await Product.create(req.body)

    // Populate category
    await product.populate("category", "name slug")

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    })
  } catch (error) {
    console.error("Create product error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during product creation",
    })
  }
}

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
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

    let product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      })
    }

    // Check if category exists (if being updated)
    if (req.body.category) {
      const category = await Category.findById(req.body.category)
      if (!category) {
        return res.status(400).json({
          success: false,
          error: "Category not found",
        })
      }
    }

    // Check if SKU already exists (if being updated)
    if (req.body.sku && req.body.sku.toUpperCase() !== product.sku) {
      const existingProduct = await Product.findOne({ sku: req.body.sku.toUpperCase() })
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          error: "Product with this SKU already exists",
        })
      }
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("category", "name slug")

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    })
  } catch (error) {
    console.error("Update product error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during product update",
    })
  }
}

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      })
    }

    // Check if product is in any pending orders
    const pendingOrders = await Order.countDocuments({
      "items.product": product._id,
      status: { $in: ["pending", "confirmed", "processing"] },
    })

    if (pendingOrders > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete product with pending orders. Deactivate instead.",
      })
    }

    // Delete product images from cloudinary
    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        if (image.url && image.url.includes("cloudinary")) {
          const publicId = image.url.split("/").pop().split(".")[0]
          await deleteImage(publicId)
        }
      }
    }

    await product.remove()

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    })
  } catch (error) {
    console.error("Delete product error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during product deletion",
    })
  }
}

// @desc    Upload product images
// @route   POST /api/products/:id/images
// @access  Private/Admin
const uploadProductImages = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      })
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Please upload at least one image",
      })
    }

    const uploadedImages = []

    for (const file of req.files) {
      try {
        const result = await uploadImage(file.path, `products/${product._id}`)
        uploadedImages.push({
          url: result.url,
          alt: `${product.name} image`,
          isPrimary: product.images.length === 0 && uploadedImages.length === 0,
        })
      } catch (error) {
        console.error("Image upload error:", error)
      }
    }

    if (uploadedImages.length === 0) {
      return res.status(500).json({
        success: false,
        error: "Failed to upload images",
      })
    }

    // Add new images to product
    product.images.push(...uploadedImages)
    await product.save()

    res.status(200).json({
      success: true,
      message: `${uploadedImages.length} image(s) uploaded successfully`,
      images: uploadedImages,
    })
  } catch (error) {
    console.error("Upload product images error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during image upload",
    })
  }
}

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = async (req, res) => {
  try {
    const limit = Number.parseInt(req.query.limit, 10) || 8

    const products = await Product.find({
      isFeatured: true,
      isActive: true,
    })
      .populate("category", "name slug")
      .limit(limit)
      .sort("-createdAt")

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    })
  } catch (error) {
    console.error("Get featured products error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Get products by category
// @route   GET /api/products/category/:categoryId
// @access  Public
const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params
    const page = Number.parseInt(req.query.page, 10) || 1
    const limit = Number.parseInt(req.query.limit, 10) || 12

    // Check if category exists
    let category
    if (categoryId.match(/^[0-9a-fA-F]{24}$/)) {
      category = await Category.findById(categoryId)
    } else {
      category = await Category.findOne({ slug: categoryId })
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        error: "Category not found",
      })
    }

    const startIndex = (page - 1) * limit
    const total = await Product.countDocuments({
      category: category._id,
      isActive: true,
    })

    const products = await Product.find({
      category: category._id,
      isActive: true,
    })
      .populate("category", "name slug")
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
      category,
      data: products,
    })
  } catch (error) {
    console.error("Get products by category error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Search products
// @route   GET /api/products/search
// @access  Public
const searchProducts = async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, sort } = req.query
    const page = Number.parseInt(req.query.page, 10) || 1
    const limit = Number.parseInt(req.query.limit, 10) || 12

    if (!q) {
      return res.status(400).json({
        success: false,
        error: "Search query is required",
      })
    }

    // Build search query
    const searchQuery = {
      isActive: true,
      $or: [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { shortDescription: { $regex: q, $options: "i" } },
        { tags: { $in: [new RegExp(q, "i")] } },
      ],
    }

    // Add category filter
    if (category) {
      searchQuery.category = category
    }

    // Add price range filter
    if (minPrice || maxPrice) {
      searchQuery.price = {}
      if (minPrice) searchQuery.price.$gte = Number.parseFloat(minPrice)
      if (maxPrice) searchQuery.price.$lte = Number.parseFloat(maxPrice)
    }

    const startIndex = (page - 1) * limit
    const total = await Product.countDocuments(searchQuery)

    let query = Product.find(searchQuery).populate("category", "name slug")

    // Sort
    if (sort) {
      const sortBy = sort.split(",").join(" ")
      query = query.sort(sortBy)
    } else {
      query = query.sort("-createdAt")
    }

    const products = await query.skip(startIndex).limit(limit)

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
      searchQuery: q,
      data: products,
    })
  } catch (error) {
    console.error("Search products error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Get product reviews
// @route   GET /api/products/:id/reviews
// @access  Public
const getProductReviews = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1
    const limit = Number.parseInt(req.query.limit, 10) || 10

    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      })
    }

    const startIndex = (page - 1) * limit
    const total = await Review.countDocuments({
      product: req.params.id,
      isApproved: true,
    })

    const reviews = await Review.find({
      product: req.params.id,
      isApproved: true,
    })
      .populate("user", "name avatar")
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
    console.error("Get product reviews error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Add product review
// @route   POST /api/products/:id/reviews
// @access  Private
const addProductReview = async (req, res) => {
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

    const { title, text, rating } = req.body

    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      })
    }

    // Check if user has already reviewed this product
    const existingReview = await Review.findOne({
      product: req.params.id,
      user: req.user.id,
    })

    if (existingReview) {
      return res.status(400).json({
        success: false,
        error: "You have already reviewed this product",
      })
    }

    // Check if user has purchased this product
    const hasPurchased = await Order.findOne({
      user: req.user.id,
      "items.product": req.params.id,
      status: "delivered",
    })

    const review = await Review.create({
      title,
      text,
      rating,
      product: req.params.id,
      user: req.user.id,
      isVerifiedPurchase: !!hasPurchased,
    })

    await review.populate("user", "name avatar")

    res.status(201).json({
      success: true,
      message: "Review added successfully",
      data: review,
    })
  } catch (error) {
    console.error("Add product review error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during review creation",
    })
  }
}

// @desc    Update product review
// @route   PUT /api/products/:id/reviews/:reviewId
// @access  Private
const updateProductReview = async (req, res) => {
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

    const review = await Review.findById(req.params.reviewId)

    if (!review) {
      return res.status(404).json({
        success: false,
        error: "Review not found",
      })
    }

    // Make sure user owns review
    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to update this review",
      })
    }

    const { title, text, rating } = req.body

    review.title = title || review.title
    review.text = text || review.text
    review.rating = rating || review.rating

    await review.save()
    await review.populate("user", "name avatar")

    res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: review,
    })
  } catch (error) {
    console.error("Update product review error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during review update",
    })
  }
}

// @desc    Delete product review
// @route   DELETE /api/products/:id/reviews/:reviewId
// @access  Private
const deleteProductReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId)

    if (!review) {
      return res.status(404).json({
        success: false,
        error: "Review not found",
      })
    }

    // Make sure user owns review or is admin
    if (review.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Not authorized to delete this review",
      })
    }

    await review.remove()

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    })
  } catch (error) {
    console.error("Delete product review error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during review deletion",
    })
  }
}

module.exports = {
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
}
