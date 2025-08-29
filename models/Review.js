const mongoose = require("mongoose")

const reviewSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a review title"],
      maxlength: [100, "Title cannot be more than 100 characters"],
    },
    text: {
      type: String,
      required: [true, "Please add review text"],
      maxlength: [1000, "Review cannot be more than 1000 characters"],
    },
    rating: {
      type: Number,
      required: [true, "Please add a rating between 1 and 5"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot be more than 5"],
    },
    product: {
      type: mongoose.Schema.ObjectId,
      ref: "Product",
      required: true,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    helpfulVotes: {
      type: Number,
      default: 0,
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

// Prevent user from submitting more than one review per product
reviewSchema.index({ product: 1, user: 1 }, { unique: true })

// Static method to get average rating and save
reviewSchema.statics.getAverageRating = async function (productId) {
  const obj = await this.aggregate([
    {
      $match: { product: productId, isApproved: true },
    },
    {
      $group: {
        _id: "$product",
        averageRating: { $avg: "$rating" },
        numOfReviews: { $sum: 1 },
      },
    },
  ])

  try {
    await this.model("Product").findByIdAndUpdate(productId, {
      averageRating: obj[0] ? Math.round(obj[0].averageRating * 10) / 10 : 0,
      numOfReviews: obj[0] ? obj[0].numOfReviews : 0,
    })
  } catch (err) {
    console.error(err)
  }
}

// Call getAverageRating after save
reviewSchema.post("save", function () {
  this.constructor.getAverageRating(this.product)
})

// Call getAverageRating before remove
reviewSchema.pre("remove", function () {
  this.constructor.getAverageRating(this.product)
})

module.exports = mongoose.model("Review", reviewSchema)
