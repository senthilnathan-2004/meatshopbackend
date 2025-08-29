const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
      trim: true,
      maxlength: [50, "Name cannot be more than 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please add a valid email"],
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    phone: {
      type: String,
      required: [true, "Please add a phone number"],
      match: [/^\+?[\d\s-()]+$/, "Please add a valid phone number"],
    },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    address: {
      street: {
        type: String,
        required: [true, "Please add a street address"],
      },
      city: {
        type: String,
        required: [true, "Please add a city"],
      },
      state: {
        type: String,
        required: [true, "Please add a state"],
      },
      zipCode: {
        type: String,
        required: [true, "Please add a zip code"],
      },
      country: {
        type: String,
        required: [true, "Please add a country"],
        default: "USA",
      },
    },
    avatar: {
      type: String,
      default: "default-avatar.jpg",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  },
)

// Encrypt password using bcrypt
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next()
  }

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

// Update last login
userSchema.methods.updateLastLogin = function () {
  this.lastLogin = new Date()
  return this.save()
}

module.exports = mongoose.model("User", userSchema)
