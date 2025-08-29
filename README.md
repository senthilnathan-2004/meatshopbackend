# Meat Shopping Backend API

A comprehensive backend API for a meat shopping application built with Node.js, Express, and MongoDB.

## Features

- **User Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (Admin/Customer)
  - Password hashing with bcrypt
  - Password reset functionality

- **Product Management**
  - CRUD operations for meat products
  - Category management
  - Image upload with Cloudinary
  - Inventory tracking
  - Product reviews and ratings

- **Shopping Cart**
  - Add/remove items
  - Update quantities
  - Persistent cart storage
  - Cart synchronization

- **Order Management**
  - Order creation and tracking
  - Multiple order statuses
  - Payment integration with Stripe
  - Email notifications
  - Order history

- **Payment Integration**
  - Stripe payment processing
  - Webhook handling
  - Payment intent creation

- **Admin Panel**
  - Dashboard with analytics
  - User management
  - Product management
  - Order management
  - Sales reports
  - Inventory reports

- **Security Features**
  - Helmet for security headers
  - Rate limiting
  - Input sanitization
  - XSS protection
  - MongoDB injection prevention

## Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <your-repo-url>
   cd meat-shopping-backend
   \`\`\`

2. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

3. **Create environment file**
   \`\`\`bash
   cp .env.example .env
   \`\`\`
   Then edit `.env` with your actual credentials.

4. **Set up MongoDB Atlas:**
   - Create a MongoDB Atlas account at https://www.mongodb.com/atlas
   - Create a new cluster
   - Create a database user
   - Whitelist your IP address
   - Get your connection string and add it to `.env`

5. **Set up Cloudinary (for image uploads):**
   - Create a Cloudinary account at https://cloudinary.com
   - Get your cloud name, API key, and API secret from dashboard
   - Add credentials to `.env`

6. **Set up Stripe (for payments):**
   - Create a Stripe account at https://stripe.com
   - Get your secret key from dashboard
   - Set up webhook endpoint for `/webhooks/stripe`
   - Add credentials to `.env`

7. **Set up Gmail (for email notifications):**
   - Enable 2-factor authentication on your Gmail account
   - Generate an app password
   - Add email and app password to `.env`

8. **Initialize the database:**
   \`\`\`bash
   # Create admin user
   npm run create-admin
   
   # Seed initial data (categories and sample products)
   npm run seed
   
   # Create test data (optional - for development)
   npm run test-data
   \`\`\`

## Running the Application

### Development Mode
\`\`\`bash
npm run dev
\`\`\`

### Production Mode
\`\`\`bash
npm start
\`\`\`

The server will start on `http://localhost:5000`

## API Documentation

Visit `http://localhost:5000/api/docs` for complete API documentation.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/updateprofile` - Update user profile
- `PUT /api/auth/updatepassword` - Update password
- `POST /api/auth/forgotpassword` - Request password reset
- `PUT /api/auth/resetpassword/:token` - Reset password with token

### Products
- `GET /api/products` - Get all products (with filtering, sorting, pagination)
- `GET /api/products/featured` - Get featured products
- `GET /api/products/search` - Search products
- `GET /api/products/category/:categoryId` - Get products by category
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)
- `POST /api/products/:id/images` - Upload product images (Admin only)

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get single category
- `POST /api/categories` - Create category (Admin only)
- `PUT /api/categories/:id` - Update category (Admin only)
- `DELETE /api/categories/:id` - Delete category (Admin only)

### Cart
- `GET /api/cart` - Get user's cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update` - Update cart item quantity
- `DELETE /api/cart/remove/:productId` - Remove item from cart
- `DELETE /api/cart/clear` - Clear entire cart
- `POST /api/cart/sync` - Sync cart with client-side cart

### Orders
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get single order
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id/status` - Update order status (Admin only)
- `PUT /api/orders/:id/cancel` - Cancel order
- `POST /api/orders/:id/payment-intent` - Create payment intent
- `POST /api/orders/:id/confirm-payment` - Confirm payment
- `GET /api/orders/:id/tracking` - Get order tracking (Public)

### Reviews
- `GET /api/products/:id/reviews` - Get product reviews
- `POST /api/products/:id/reviews` - Add product review
- `PUT /api/products/:id/reviews/:reviewId` - Update product review
- `DELETE /api/products/:id/reviews/:reviewId` - Delete product review

### Admin
- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/analytics/sales` - Get sales analytics
- `GET /api/admin/analytics/customers` - Get customer analytics
- `GET /api/admin/reports/inventory` - Get inventory report
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/role` - Update user role
- `GET /api/admin/orders` - Get all orders
- `PUT /api/admin/orders/:id/status` - Update order status

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `DELETE /api/users/account` - Delete user account

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed` - Seed database with initial data
- `npm run create-admin` - Create admin user
- `npm run test-data` - Create test data for development
- `npm test` - Run tests

## Environment Variables

Create a `.env` file with the following variables:

\`\`\`env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/meat-shopping?retryWrites=true&w=majority

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Payment (Stripe)
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Admin
ADMIN_EMAIL=admin@meatshop.com
ADMIN_PASSWORD=admin123456
\`\`\`

## Admin Access

Default admin credentials:
- Email: admin@meatshop.com
- Password: admin123456

**Important:** Change the admin password after first login!

## Testing the API

### Health Check
\`\`\`bash
curl http://localhost:5000/api/health
\`\`\`

### Register a User
\`\`\`bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "phone": "+1234567890",
    "address": {
      "street": "123 Test St",
      "city": "Test City",
      "state": "TS",
      "zipCode": "12345",
      "country": "USA"
    }
  }'
\`\`\`

### Login
\`\`\`bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
\`\`\`

## Project Structure

\`\`\`
meat-shopping-backend/
├── config/
│   ├── database.js          # Database connection
│   └── cloudinary.js        # Cloudinary configuration
├── controllers/             # Route controllers
├── middleware/              # Custom middleware
├── models/                  # MongoDB models
├── routes/                  # API routes
├── scripts/                 # Utility scripts
├── utils/                   # Helper utilities
├── server.js                # Main server file
├── package.json
└── .env.example
\`\`\`

## Testing

Run tests with:
\`\`\`bash
npm test
\`\`\`

## License

MIT License
# meatshopbackend
