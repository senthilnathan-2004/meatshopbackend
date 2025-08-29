const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
require("dotenv").config()

// Import models
const User = require("../models/User")
const Category = require("../models/Category")
const Product = require("../models/Product")

// Connect to database
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

// Sample data
const categories = [
  {
    name: "Beef",
    description: "Premium quality beef cuts",
    image: "beef-category.jpg",
  },
  {
    name: "Pork",
    description: "Fresh pork products",
    image: "pork-category.jpg",
  },
  {
    name: "Chicken",
    description: "Farm-fresh chicken",
    image: "chicken-category.jpg",
  },
  {
    name: "Lamb",
    description: "Tender lamb cuts",
    image: "lamb-category.jpg",
  },
  {
    name: "Seafood",
    description: "Fresh seafood selection",
    image: "seafood-category.jpg",
  },
]

const seedDatabase = async () => {
  try {
    // Clear existing data
    await User.deleteMany()
    await Category.deleteMany()
    await Product.deleteMany()

    console.log("Data cleared...")

    // Create admin user
    const adminUser = await User.create({
      name: "Admin User",
      email: process.env.ADMIN_EMAIL || "admin@meatshop.com",
      password: process.env.ADMIN_PASSWORD || "admin123456",
      phone: "+1234567890",
      role: "admin",
      address: {
        street: "123 Admin St",
        city: "Admin City",
        state: "AC",
        zipCode: "12345",
        country: "USA",
      },
    })

    console.log("Admin user created...")

    // Create categories
    const createdCategories = await Category.insertMany(categories)
    console.log("Categories created...")

    // Create sample products
    const beefCategory = createdCategories.find((cat) => cat.name === "Beef")
    const porkCategory = createdCategories.find((cat) => cat.name === "Pork")
    const chickenCategory = createdCategories.find((cat) => cat.name === "Chicken")

    const products = [
      {
        name: "Premium Ribeye Steak",
        description: "Grade A ribeye steak, perfectly marbled for maximum flavor",
        shortDescription: "Premium grade A ribeye steak",
        category: beefCategory._id,
        price: 29.99,
        comparePrice: 34.99,
        sku: "BEEF-RIB-001",
        weight: { value: 1, unit: "lb" },
        images: [
          {
            url: "/grilled-ribeye.png",
            alt: "Premium Ribeye Steak",
            isPrimary: true,
          },
        ],
        inventory: { quantity: 50, lowStockThreshold: 10 },
        specifications: {
          cut: "ribeye",
          grade: "prime",
          origin: "USA",
          feedType: "grain-fed",
        },
        tags: ["premium", "steak", "beef"],
        isFeatured: true,
        createdBy: adminUser._id,
      },
      {
        name: "Ground Beef 80/20",
        description: "Fresh ground beef, 80% lean, perfect for burgers and cooking",
        shortDescription: "Fresh 80/20 ground beef",
        category: beefCategory._id,
        price: 8.99,
        sku: "BEEF-GRD-001",
        weight: { value: 1, unit: "lb" },
        images: [
          {
            url: "/ground-beef.png",
            alt: "Ground Beef 80/20",
            isPrimary: true,
          },
        ],
        inventory: { quantity: 100, lowStockThreshold: 20 },
        specifications: {
          cut: "ground",
          grade: "choice",
          origin: "USA",
          feedType: "grain-fed",
        },
        tags: ["ground", "beef", "burger"],
        createdBy: adminUser._id,
      },
      {
        name: "Pork Tenderloin",
        description: "Lean and tender pork tenderloin, perfect for roasting",
        shortDescription: "Lean pork tenderloin",
        category: porkCategory._id,
        price: 12.99,
        sku: "PORK-TND-001",
        weight: { value: 1.5, unit: "lb" },
        images: [
          {
            url: "/grilled-pork-tenderloin.png",
            alt: "Pork Tenderloin",
            isPrimary: true,
          },
        ],
        inventory: { quantity: 30, lowStockThreshold: 5 },
        specifications: {
          cut: "whole",
          grade: "choice",
          origin: "USA",
          feedType: "grain-fed",
        },
        tags: ["pork", "tenderloin", "lean"],
        createdBy: adminUser._id,
      },
      {
        name: "Whole Chicken",
        description: "Fresh whole chicken, free-range and hormone-free",
        shortDescription: "Fresh free-range whole chicken",
        category: chickenCategory._id,
        price: 6.99,
        sku: "CHKN-WHL-001",
        weight: { value: 3, unit: "lb" },
        images: [
          {
            url: "/whole-roasted-chicken.png",
            alt: "Whole Chicken",
            isPrimary: true,
          },
        ],
        inventory: { quantity: 25, lowStockThreshold: 5 },
        specifications: {
          cut: "whole",
          grade: "organic",
          origin: "USA",
          feedType: "free-range",
        },
        tags: ["chicken", "whole", "free-range", "organic"],
        createdBy: adminUser._id,
      },
    ]

    await Product.insertMany(products)
    console.log("Products created...")

    console.log("Database seeded successfully!")
    process.exit()
  } catch (error) {
    console.error("Error seeding database:", error)
    process.exit(1)
  }
}

seedDatabase()
