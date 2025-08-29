const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
require("dotenv").config()

const User = require("../models/User")

const createAdmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    console.log("Connected to MongoDB")

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL })

    if (existingAdmin) {
      console.log("Admin user already exists")
      process.exit(0)
    }

    // Create admin user
    const adminUser = await User.create({
      name: "Admin User",
      email: process.env.ADMIN_EMAIL || "admin@meatshop.com",
      password: process.env.ADMIN_PASSWORD || "admin123456",
      phone: "+1234567890",
      role: "admin",
      address: {
        street: "123 Admin Street",
        city: "Admin City",
        state: "AC",
        zipCode: "12345",
        country: "USA",
      },
    })

    console.log("Admin user created successfully:")
    console.log(`Email: ${adminUser.email}`)
    console.log(`Password: ${process.env.ADMIN_PASSWORD || "admin123456"}`)
    console.log("Please change the password after first login!")

    process.exit(0)
  } catch (error) {
    console.error("Error creating admin user:", error)
    process.exit(1)
  }
}

createAdmin()
