const express = require("express")
const router = express.Router()

// API Documentation endpoint
router.get("/", (req, res) => {
  const apiDocs = {
    name: "Meat Shopping API",
    version: "1.0.0",
    description: "Complete backend API for meat shopping application",
    baseUrl: `${req.protocol}://${req.get("host")}/api`,
    endpoints: {
      authentication: {
        "POST /auth/register": "Register new user",
        "POST /auth/login": "Login user",
        "POST /auth/logout": "Logout user",
        "GET /auth/me": "Get current user profile",
        "PUT /auth/updateprofile": "Update user profile",
        "PUT /auth/updatepassword": "Update password",
        "POST /auth/forgotpassword": "Request password reset",
        "PUT /auth/resetpassword/:token": "Reset password with token",
      },
      products: {
        "GET /products": "Get all products (with filtering, sorting, pagination)",
        "GET /products/featured": "Get featured products",
        "GET /products/search": "Search products",
        "GET /products/category/:categoryId": "Get products by category",
        "GET /products/:id": "Get single product",
        "POST /products": "Create product (Admin only)",
        "PUT /products/:id": "Update product (Admin only)",
        "DELETE /products/:id": "Delete product (Admin only)",
        "POST /products/:id/images": "Upload product images (Admin only)",
      },
      categories: {
        "GET /categories": "Get all categories",
        "GET /categories/:id": "Get single category",
        "POST /categories": "Create category (Admin only)",
        "PUT /categories/:id": "Update category (Admin only)",
        "DELETE /categories/:id": "Delete category (Admin only)",
        "POST /categories/:id/image": "Upload category image (Admin only)",
      },
      cart: {
        "GET /cart": "Get user's cart",
        "POST /cart/add": "Add item to cart",
        "PUT /cart/update": "Update cart item quantity",
        "DELETE /cart/remove/:productId": "Remove item from cart",
        "DELETE /cart/clear": "Clear entire cart",
        "POST /cart/sync": "Sync cart with client-side cart",
      },
      orders: {
        "GET /orders": "Get user's orders",
        "GET /orders/:id": "Get single order",
        "POST /orders": "Create new order",
        "PUT /orders/:id/status": "Update order status (Admin only)",
        "PUT /orders/:id/cancel": "Cancel order",
        "POST /orders/:id/payment-intent": "Create payment intent",
        "POST /orders/:id/confirm-payment": "Confirm payment",
        "GET /orders/:id/tracking": "Get order tracking (Public)",
      },
      reviews: {
        "GET /products/:id/reviews": "Get product reviews",
        "POST /products/:id/reviews": "Add product review",
        "PUT /products/:id/reviews/:reviewId": "Update product review",
        "DELETE /products/:id/reviews/:reviewId": "Delete product review",
      },
      admin: {
        "GET /admin/dashboard": "Get dashboard statistics",
        "GET /admin/analytics/sales": "Get sales analytics",
        "GET /admin/analytics/customers": "Get customer analytics",
        "GET /admin/reports/inventory": "Get inventory report",
        "GET /admin/users": "Get all users",
        "GET /admin/users/:id": "Get user details",
        "PUT /admin/users/:id/role": "Update user role",
        "PUT /admin/users/:id/deactivate": "Deactivate/activate user",
        "GET /admin/orders": "Get all orders",
        "GET /admin/orders/:id": "Get order details",
        "PUT /admin/orders/:id/status": "Update order status",
        "GET /admin/products": "Get all products (admin view)",
        "GET /admin/products/:id": "Get product details (admin view)",
        "PUT /admin/products/:id/toggle-status": "Toggle product status",
        "GET /admin/reviews": "Get all reviews",
        "PUT /admin/reviews/:id/status": "Update review status",
        "DELETE /admin/reviews/:id": "Delete review",
      },
      users: {
        "GET /users/profile": "Get user profile",
        "PUT /users/profile": "Update user profile",
        "DELETE /users/account": "Delete user account",
      },
    },
    authentication: {
      type: "Bearer Token",
      header: "Authorization: Bearer <token>",
      description: "Include JWT token in Authorization header for protected routes",
    },
    errorHandling: {
      format: {
        success: false,
        error: "Error message",
        details: "Additional error details (validation errors, etc.)",
      },
      statusCodes: {
        200: "Success",
        201: "Created",
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        500: "Internal Server Error",
      },
    },
    pagination: {
      format: {
        success: true,
        count: "Number of items in current page",
        total: "Total number of items",
        pagination: {
          next: { page: 2, limit: 10 },
          prev: { page: 1, limit: 10 },
        },
        data: "Array of items",
      },
    },
  }

  res.status(200).json(apiDocs)
})

module.exports = router
