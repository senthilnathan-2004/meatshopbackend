# Meat Shopping Backend - Setup Guide

## Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account
- Cloudinary account (for image uploads)
- Stripe account (for payments)
- Gmail account (for email notifications)

## Installation Steps

### 1. Clone and Install Dependencies

\`\`\`bash
git clone <your-repo-url>
cd meat-shopping-backend
npm install
\`\`\`

### 2. Environment Setup

Create a `.env` file in the root directory:

\`\`\`env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/meat-shopping?retryWrites=true&w=majority

# JWT
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
JWT_EXPIRE=7d

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (Gmail SMTP)
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

### 3. Database Setup

#### MongoDB Atlas Setup:
1. Create a MongoDB Atlas account at https://www.mongodb.com/atlas
2. Create a new cluster
3. Create a database user
4. Whitelist your IP address
5. Get your connection string and add it to `.env`

### 4. Third-Party Service Setup

#### Cloudinary Setup:
1. Create account at https://cloudinary.com
2. Get your cloud name, API key, and API secret from dashboard
3. Add credentials to `.env`

#### Stripe Setup:
1. Create account at https://stripe.com
2. Get your secret key from dashboard
3. Set up webhook endpoint for `/webhooks/stripe`
4. Add credentials to `.env`

#### Gmail Setup:
1. Enable 2-factor authentication on your Gmail account
2. Generate an app password
3. Add email and app password to `.env`

### 5. Initialize Database

\`\`\`bash
# Create admin user
npm run create-admin

# Seed initial data (categories and sample products)
npm run seed

# Create test data (optional - for development)
npm run test-data
\`\`\`

### 6. Start the Server

\`\`\`bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
\`\`\`

The server will start on `http://localhost:5000`

## API Documentation

Visit `http://localhost:5000/api/docs` for complete API documentation.

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

### Get Products
\`\`\`bash
curl http://localhost:5000/api/products
\`\`\`

## Admin Access

Default admin credentials:
- Email: admin@meatshop.com
- Password: admin123456

**Important:** Change the admin password after first login!

## Project Structure

\`\`\`
meat-shopping-backend/
├── config/
│   ├── database.js          # Database connection
│   └── cloudinary.js        # Cloudinary configuration
├── controllers/
│   ├── auth.js              # Authentication controllers
│   ├── products.js          # Product controllers
│   ├── categories.js        # Category controllers
│   ├── cart.js              # Cart controllers
│   ├── orders.js            # Order controllers
│   ├── users.js             # User controllers
│   └── admin.js             # Admin controllers
├── middleware/
│   ├── auth.js              # Authentication middleware
│   ├── errorHandler.js      # Error handling middleware
│   ├── notFound.js          # 404 handler
│   ├── upload.js            # File upload middleware
│   ├── logger.js            # Request logging
│   └── sanitize.js          # Input sanitization
├── models/
│   ├── User.js              # User model
│   ├── Product.js           # Product model
│   ├── Category.js          # Category model
│   ├── Cart.js              # Cart model
│   ├── Order.js             # Order model
│   └── Review.js            # Review model
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── products.js          # Product routes
│   ├── categories.js        # Category routes
│   ├── cart.js              # Cart routes
│   ├── orders.js            # Order routes
│   ├── users.js             # User routes
│   ├── admin.js             # Admin routes
│   ├── webhooks.js          # Webhook handlers
│   └── docs.js              # API documentation
├── scripts/
│   ├── createAdmin.js       # Create admin user
│   └── testData.js          # Create test data
├── utils/
│   ├── generateToken.js     # JWT token generation
│   ├── sendEmail.js         # Email utility
│   ├── seeder.js            # Database seeder
│   └── calculateShipping.js # Shipping calculations
├── server.js                # Main server file
├── package.json
├── .env.example
└── README.md
\`\`\`

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed` - Seed database with initial data
- `npm run create-admin` - Create admin user
- `npm run test-data` - Create test data for development
- `npm test` - Run tests

## Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin/Customer)
- Password hashing with bcrypt
- Password reset functionality

### Product Management
- CRUD operations for products
- Category management
- Image upload with Cloudinary
- Inventory tracking
- Product reviews and ratings

### Shopping Cart
- Add/remove items
- Update quantities
- Persistent cart storage
- Cart synchronization

### Order Management
- Order creation and tracking
- Multiple order statuses
- Payment integration with Stripe
- Email notifications
- Order history

### Admin Panel
- Dashboard with analytics
- User management
- Product management
- Order management
- Sales reports
- Inventory reports

### Security Features
- Helmet for security headers
- Rate limiting
- Input sanitization
- XSS protection
- MongoDB injection prevention
- CORS configuration

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check your MongoDB URI in `.env`
   - Ensure your IP is whitelisted in MongoDB Atlas
   - Verify database user credentials

2. **Email Not Sending**
   - Check Gmail credentials in `.env`
   - Ensure app password is used (not regular password)
   - Verify 2FA is enabled on Gmail account

3. **Image Upload Failing**
   - Check Cloudinary credentials in `.env`
   - Ensure upload folder exists
   - Verify file size limits

4. **Stripe Webhook Issues**
   - Check webhook endpoint URL
   - Verify webhook secret in `.env`
   - Ensure webhook is configured for correct events

### Logs

Check server logs for detailed error information. In development mode, detailed error stacks are included in responses.

## Production Deployment

1. Set `NODE_ENV=production` in environment variables
2. Use a process manager like PM2
3. Set up reverse proxy with Nginx
4. Configure SSL certificates
5. Set up monitoring and logging
6. Configure backup strategies for database

## Support

For issues and questions, please check the API documentation at `/api/docs` or review the error logs.
