const mongoose = require("mongoose")
require("dotenv").config()

// Import models
const User = require("../models/User")
const Category = require("../models/Category")
const Product = require("../models/Product")
const Order = require("../models/Order")
const Review = require("../models/Review")

// Connect to database
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

const createTestData = async () => {
  try {
    console.log("Creating test data...")

    // Create test customers
    const customers = await User.insertMany([
      {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        phone: "+1234567891",
        role: "customer",
        address: {
          street: "123 Main St",
          city: "New York",
          state: "NY",
          zipCode: "10001",
          country: "USA",
        },
      },
      {
        name: "Jane Smith",
        email: "jane@example.com",
        password: "password123",
        phone: "+1234567892",
        role: "customer",
        address: {
          street: "456 Oak Ave",
          city: "Los Angeles",
          state: "CA",
          zipCode: "90001",
          country: "USA",
        },
      },
      {
        name: "Mike Johnson",
        email: "mike@example.com",
        password: "password123",
        phone: "+1234567893",
        role: "customer",
        address: {
          street: "789 Pine Rd",
          city: "Chicago",
          state: "IL",
          zipCode: "60601",
          country: "USA",
        },
      },
    ])

    console.log("Test customers created")

    // Get admin user
    const adminUser = await User.findOne({ role: "admin" })
    if (!adminUser) {
      console.error("Admin user not found. Please run createAdmin.js first")
      return
    }

    // Create additional products
    const beefCategory = await Category.findOne({ name: "Beef" })
    const porkCategory = await Category.findOne({ name: "Pork" })
    const chickenCategory = await Category.findOne({ name: "Chicken" })

    if (beefCategory && porkCategory && chickenCategory) {
      const additionalProducts = [
        {
          name: "T-Bone Steak",
          description: "Premium T-bone steak with perfect marbling",
          shortDescription: "Premium T-bone steak",
          category: beefCategory._id,
          price: 24.99,
          comparePrice: 29.99,
          sku: "BEEF-TBN-001",
          weight: { value: 1.2, unit: "lb" },
          images: [{ url: "/t-bone-steak.png", alt: "T-Bone Steak", isPrimary: true }],
          inventory: { quantity: 40, lowStockThreshold: 8 },
          specifications: { cut: "t-bone", grade: "choice", origin: "USA", feedType: "grain-fed" },
          tags: ["steak", "beef", "premium"],
          createdBy: adminUser._id,
        },
        {
          name: "Pork Chops",
          description: "Thick cut pork chops, perfect for grilling",
          shortDescription: "Thick cut pork chops",
          category: porkCategory._id,
          price: 9.99,
          sku: "PORK-CHP-001",
          weight: { value: 1, unit: "lb" },
          images: [{ url: "/pork-chops.png", alt: "Pork Chops", isPrimary: true }],
          inventory: { quantity: 35, lowStockThreshold: 8 },
          specifications: { cut: "whole", grade: "choice", origin: "USA", feedType: "grain-fed" },
          tags: ["pork", "chops", "grill"],
          createdBy: adminUser._id,
        },
        {
          name: "Chicken Breast",
          description: "Boneless, skinless chicken breast",
          shortDescription: "Boneless chicken breast",
          category: chickenCategory._id,
          price: 7.99,
          sku: "CHKN-BRS-001",
          weight: { value: 1, unit: "lb" },
          images: [{ url: "/chicken-breast.png", alt: "Chicken Breast", isPrimary: true }],
          inventory: { quantity: 60, lowStockThreshold: 15 },
          specifications: { cut: "whole", grade: "organic", origin: "USA", feedType: "free-range" },
          tags: ["chicken", "breast", "lean", "organic"],
          createdBy: adminUser._id,
        },
      ]

      await Product.insertMany(additionalProducts)
      console.log("Additional products created")
    }

    // Create test orders
    const products = await Product.find().limit(3)
    if (products.length >= 3) {
      const testOrders = [
        {
          user: customers[0]._id,
          items: [
            {
              product: products[0]._id,
              name: products[0].name,
              image: products[0].images[0]?.url || "/placeholder.svg",
              price: products[0].price,
              quantity: 2,
              totalPrice: products[0].price * 2,
            },
          ],
          shippingAddress: customers[0].address,
          paymentInfo: { method: "stripe", paidAt: new Date() },
          itemsPrice: products[0].price * 2,
          taxPrice: Math.round(products[0].price * 2 * 0.08 * 100) / 100,
          shippingPrice: 0,
          totalPrice: products[0].price * 2 + Math.round(products[0].price * 2 * 0.08 * 100) / 100,
          status: "delivered",
          isPaid: true,
          isDelivered: true,
          deliveredAt: new Date(),
        },
        {
          user: customers[1]._id,
          items: [
            {
              product: products[1]._id,
              name: products[1].name,
              image: products[1].images[0]?.url || "/placeholder.svg",
              price: products[1].price,
              quantity: 1,
              totalPrice: products[1].price,
            },
            {
              product: products[2]._id,
              name: products[2].name,
              image: products[2].images[0]?.url || "/placeholder.svg",
              price: products[2].price,
              quantity: 3,
              totalPrice: products[2].price * 3,
            },
          ],
          shippingAddress: customers[1].address,
          paymentInfo: { method: "stripe", paidAt: new Date() },
          itemsPrice: products[1].price + products[2].price * 3,
          taxPrice: Math.round((products[1].price + products[2].price * 3) * 0.08 * 100) / 100,
          shippingPrice: 10,
          totalPrice:
            products[1].price +
            products[2].price * 3 +
            Math.round((products[1].price + products[2].price * 3) * 0.08 * 100) / 100 +
            10,
          status: "shipped",
          isPaid: true,
          trackingNumber: "1Z999AA1234567890",
        },
      ]

      await Order.insertMany(testOrders)
      console.log("Test orders created")

      // Create test reviews
      const testReviews = [
        {
          title: "Excellent quality!",
          text: "The ribeye steak was perfectly marbled and cooked beautifully. Will definitely order again!",
          rating: 5,
          product: products[0]._id,
          user: customers[0]._id,
          isVerifiedPurchase: true,
        },
        {
          title: "Good value",
          text: "Good quality meat for the price. Fast delivery and well packaged.",
          rating: 4,
          product: products[1]._id,
          user: customers[1]._id,
          isVerifiedPurchase: true,
        },
        {
          title: "Fresh and tasty",
          text: "The chicken was very fresh and had great flavor. Highly recommend!",
          rating: 5,
          product: products[2]._id,
          user: customers[2]._id,
          isVerifiedPurchase: false,
        },
      ]

      await Review.insertMany(testReviews)
      console.log("Test reviews created")
    }

    console.log("Test data created successfully!")
    process.exit(0)
  } catch (error) {
    console.error("Error creating test data:", error)
    process.exit(1)
  }
}

createTestData()
