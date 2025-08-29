const mongoose = require("mongoose")

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: [true, "Please add quantity"],
    min: [1, "Quantity must be at least 1"],
    default: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
})

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    totalItems: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    lastModified: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Calculate totals before saving
cartSchema.pre("save", function (next) {
  this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0)
  this.totalAmount = this.items.reduce((total, item) => total + item.totalPrice, 0)
  this.lastModified = new Date()
  next()
})

// Update item total price when quantity or price changes
cartItemSchema.pre("save", function (next) {
  this.totalPrice = this.quantity * this.price
  next()
})

module.exports = mongoose.model("Cart", cartSchema)
