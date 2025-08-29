const express = require("express")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const Order = require("../models/Order")
const User = require("../models/User")
const sendEmail = require("../utils/sendEmail")

const router = express.Router()

// Stripe webhook endpoint
router.post("/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"]
  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object
      await handlePaymentSuccess(paymentIntent)
      break

    case "payment_intent.payment_failed":
      const failedPayment = event.data.object
      await handlePaymentFailure(failedPayment)
      break

    case "charge.dispute.created":
      const dispute = event.data.object
      await handleDispute(dispute)
      break

    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  res.json({ received: true })
})

// Handle successful payment
const handlePaymentSuccess = async (paymentIntent) => {
  try {
    const orderId = paymentIntent.metadata.orderId
    const order = await Order.findById(orderId).populate("user", "name email")

    if (order) {
      order.isPaid = true
      order.paymentInfo.transactionId = paymentIntent.id
      order.paymentInfo.paidAt = new Date()
      order.status = "confirmed"
      await order.save()

      // Send payment confirmation email
      if (order.user) {
        await sendPaymentConfirmationEmail(order.user, order)
      }

      console.log(`Payment confirmed for order ${order.orderNumber}`)
    }
  } catch (error) {
    console.error("Error handling payment success:", error)
  }
}

// Handle failed payment
const handlePaymentFailure = async (paymentIntent) => {
  try {
    const orderId = paymentIntent.metadata.orderId
    const order = await Order.findById(orderId).populate("user", "name email")

    if (order && order.user) {
      await sendPaymentFailureEmail(order.user, order, paymentIntent.last_payment_error?.message)
    }

    console.log(`Payment failed for order ${orderId}`)
  } catch (error) {
    console.error("Error handling payment failure:", error)
  }
}

// Handle dispute
const handleDispute = async (dispute) => {
  try {
    console.log(`Dispute created for charge ${dispute.charge}`)

    // Send notification to admin
    await sendEmail({
      email: process.env.ADMIN_EMAIL,
      subject: "Payment Dispute Created",
      html: `
        <h2>Payment Dispute Alert</h2>
        <p>A dispute has been created for charge: ${dispute.charge}</p>
        <p>Amount: $${(dispute.amount / 100).toFixed(2)}</p>
        <p>Reason: ${dispute.reason}</p>
        <p>Status: ${dispute.status}</p>
        <p>Please review this dispute in your Stripe dashboard.</p>
      `,
    })
  } catch (error) {
    console.error("Error handling dispute:", error)
  }
}

// Helper function to send payment confirmation email
const sendPaymentConfirmationEmail = async (user, order) => {
  const message = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h1 style="color: #333; text-align: center;">Payment Confirmed</h1>
      <p>Dear ${user.name},</p>
      <p>Your payment for order <strong>#${order.orderNumber}</strong> has been successfully processed.</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h2 style="color: #333; margin: 0;">Payment Details</h2>
        <p style="margin: 10px 0 0 0;">
          <strong>Amount:</strong> $${order.totalPrice.toFixed(2)}<br>
          <strong>Transaction ID:</strong> ${order.paymentInfo.transactionId}<br>
          <strong>Payment Date:</strong> ${new Date(order.paymentInfo.paidAt).toLocaleDateString()}
        </p>
      </div>
      
      <p>Your order is now confirmed and will be processed shortly.</p>
      <p>Thank you for choosing Meat Shop!</p>
    </div>
  `

  await sendEmail({
    email: user.email,
    subject: `Payment Confirmed - Order #${order.orderNumber}`,
    html: message,
  })
}

// Helper function to send payment failure email
const sendPaymentFailureEmail = async (user, order, errorMessage) => {
  const message = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <h1 style="color: #dc3545; text-align: center;">Payment Failed</h1>
      <p>Dear ${user.name},</p>
      <p>Unfortunately, your payment for order <strong>#${order.orderNumber}</strong> could not be processed.</p>
      
      <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
        <h2 style="color: #721c24; margin: 0;">Payment Error</h2>
        <p style="margin: 10px 0 0 0; color: #721c24;">
          ${errorMessage || "Your payment method was declined. Please try a different payment method."}
        </p>
      </div>
      
      <p>Please try again with a different payment method or contact your bank for assistance.</p>
      <p>Your order is still reserved and you can complete the payment at any time.</p>
    </div>
  `

  await sendEmail({
    email: user.email,
    subject: `Payment Failed - Order #${order.orderNumber}`,
    html: message,
  })
}

module.exports = router
