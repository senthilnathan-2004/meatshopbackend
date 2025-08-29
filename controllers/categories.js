const { validationResult } = require("express-validator")
const Category = require("../models/Category")
const Product = require("../models/Product")
const { uploadImage, deleteImage } = require("../config/cloudinary")

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort("sortOrder name")

    // Get product count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({
          category: category._id,
          isActive: true,
        })
        return {
          ...category.toObject(),
          productCount,
        }
      }),
    )

    res.status(200).json({
      success: true,
      count: categoriesWithCount.length,
      data: categoriesWithCount,
    })
  } catch (error) {
    console.error("Get categories error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
const getCategory = async (req, res) => {
  try {
    let category

    // Check if the parameter is a valid ObjectId or a slug
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      category = await Category.findById(req.params.id)
    } else {
      category = await Category.findOne({ slug: req.params.id })
    }

    if (!category || !category.isActive) {
      return res.status(404).json({
        success: false,
        error: "Category not found",
      })
    }

    // Get product count
    const productCount = await Product.countDocuments({
      category: category._id,
      isActive: true,
    })

    res.status(200).json({
      success: true,
      data: {
        ...category.toObject(),
        productCount,
      },
    })
  } catch (error) {
    console.error("Get category error:", error)
    res.status(500).json({
      success: false,
      error: "Server error",
    })
  }
}

// @desc    Create new category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
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

    // Check if category name already exists
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${req.body.name}$`, "i") },
    })

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        error: "Category with this name already exists",
      })
    }

    const category = await Category.create(req.body)

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    })
  } catch (error) {
    console.error("Create category error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during category creation",
    })
  }
}

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res) => {
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

    let category = await Category.findById(req.params.id)

    if (!category) {
      return res.status(404).json({
        success: false,
        error: "Category not found",
      })
    }

    // Check if category name already exists (if being updated)
    if (req.body.name && req.body.name.toLowerCase() !== category.name.toLowerCase()) {
      const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${req.body.name}$`, "i") },
      })

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          error: "Category with this name already exists",
        })
      }
    }

    category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    })
  } catch (error) {
    console.error("Update category error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during category update",
    })
  }
}

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)

    if (!category) {
      return res.status(404).json({
        success: false,
        error: "Category not found",
      })
    }

    // Check if category has products
    const productCount = await Product.countDocuments({ category: category._id })

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete category with products. Move products to another category first.",
      })
    }

    // Delete category image from cloudinary
    if (category.image && category.image.includes("cloudinary")) {
      const publicId = category.image.split("/").pop().split(".")[0]
      await deleteImage(publicId)
    }

    await category.remove()

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    })
  } catch (error) {
    console.error("Delete category error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during category deletion",
    })
  }
}

// @desc    Upload category image
// @route   POST /api/categories/:id/image
// @access  Private/Admin
const uploadCategoryImage = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)

    if (!category) {
      return res.status(404).json({
        success: false,
        error: "Category not found",
      })
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Please upload an image",
      })
    }

    try {
      // Delete old image if exists
      if (category.image && category.image.includes("cloudinary")) {
        const publicId = category.image.split("/").pop().split(".")[0]
        await deleteImage(publicId)
      }

      // Upload new image
      const result = await uploadImage(req.file.path, `categories/${category._id}`)

      category.image = result.url
      await category.save()

      res.status(200).json({
        success: true,
        message: "Image uploaded successfully",
        image: result.url,
      })
    } catch (error) {
      console.error("Image upload error:", error)
      res.status(500).json({
        success: false,
        error: "Failed to upload image",
      })
    }
  } catch (error) {
    console.error("Upload category image error:", error)
    res.status(500).json({
      success: false,
      error: "Server error during image upload",
    })
  }
}

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
}
