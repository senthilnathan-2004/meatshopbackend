const mongoose = require("mongoose")

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a product name"],
      trim: true,
      maxlength: [100, "Product name cannot be more than 100 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, "Please add a description"],
      maxlength: [2000, "Description cannot be more than 2000 characters"],
    },
    shortDescription: {
      type: String,
      maxlength: [200, "Short description cannot be more than 200 characters"],
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
      required: [true, "Please add a category"],
    },
    price: {
      type: Number,
      required: [true, "Please add a price"],
      min: [0, "Price cannot be negative"],
    },
    comparePrice: {
      type: Number,
      min: [0, "Compare price cannot be negative"],
    },
    cost: {
      type: Number,
      min: [0, "Cost cannot be negative"],
    },
    sku: {
      type: String,
      required: [true, "Please add a SKU"],
      unique: true,
      uppercase: true,
    },
    weight: {
      value: {
        type: Number,
        required: [true, "Please add weight value"],
        min: [0, "Weight cannot be negative"],
      },
      unit: {
        type: String,
        required: [true, "Please add weight unit"],
        enum: ["lb", "oz", "kg", "g"],
        default: "lb",
      },
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        alt: {
          type: String,
          default: "",
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],
    inventory: {
      quantity: {
        type: Number,
        required: [true, "Please add inventory quantity"],
        min: [0, "Inventory cannot be negative"],
        default: 0,
      },
      lowStockThreshold: {
        type: Number,
        default: 10,
      },
      trackQuantity: {
        type: Boolean,
        default: true,
      },
    },
    specifications: {
      cut: {
        type: String,
        enum: [
          "ribeye",
          "sirloin",
          "filet-mignon",
          "t-bone",
          "porterhouse",
          "strip",
          "chuck",
          "brisket",
          "ground",
          "whole",
          "other",
        ],
      },
      grade: {
        type: String,
        enum: ["prime", "choice", "select", "standard", "organic", "grass-fed"],
      },
      origin: {
        type: String,
        maxlength: [100, "Origin cannot be more than 100 characters"],
      },
      feedType: {
        type: String,
        enum: ["grain-fed", "grass-fed", "organic", "free-range"],
      },
    },
    nutritionFacts: {
      calories: Number,
      protein: Number,
      fat: Number,
      saturatedFat: Number,
      cholesterol: Number,
      sodium: Number,
      carbohydrates: Number,
      fiber: Number,
      sugar: Number,
    },
    tags: [
      {
        type: String,
        lowercase: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    averageRating: {
      type: Number,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating must can not be more than 5"],
      default: 0,
    },
    numOfReviews: {
      type: Number,
      default: 0,
    },
    seoTitle: {
      type: String,
      maxlength: [60, "SEO title cannot be more than 60 characters"],
    },
    seoDescription: {
      type: String,
      maxlength: [160, "SEO description cannot be more than 160 characters"],
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Create product slug from name
productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, "-")
  }
  next()
})

// Calculate discount percentage
productSchema.virtual("discountPercentage").get(function () {
  if (this.comparePrice && this.comparePrice > this.price) {
    return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100)
  }
  return 0
})

// Check if product is in stock
productSchema.virtual("inStock").get(function () {
  if (!this.inventory.trackQuantity) return true
  return this.inventory.quantity > 0
})

// Check if product is low stock
productSchema.virtual("isLowStock").get(function () {
  if (!this.inventory.trackQuantity) return false
  return this.inventory.quantity <= this.inventory.lowStockThreshold
})

// Cascade delete reviews when a product is deleted
productSchema.pre("remove", async function (next) {
  await this.model("Review").deleteMany({ product: this._id })
  next()
})

module.exports = mongoose.model("Product", productSchema)
