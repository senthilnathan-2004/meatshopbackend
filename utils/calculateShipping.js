const calculateShipping = (items, shippingAddress) => {
  // Basic shipping calculation
  const totalWeight = items.reduce((total, item) => {
    const weight = item.product.weight.value * item.quantity
    return total + weight
  }, 0)

  // Free shipping over $100
  const itemsTotal = items.reduce((total, item) => total + item.totalPrice, 0)
  if (itemsTotal >= 100) {
    return 0
  }

  // Base shipping rate
  let shippingCost = 10

  // Weight-based pricing
  if (totalWeight > 10) {
    shippingCost += Math.ceil((totalWeight - 10) / 5) * 5
  }

  // Express shipping (if requested)
  // This could be expanded based on shipping method selection

  return Math.min(shippingCost, 50) // Cap at $50
}

const calculateTax = (itemsPrice, shippingAddress) => {
  // Tax rates by state (simplified)
  const taxRates = {
    CA: 0.0875, // California
    NY: 0.08, // New York
    TX: 0.0625, // Texas
    FL: 0.06, // Florida
    // Add more states as needed
  }

  const taxRate = taxRates[shippingAddress.state] || 0.05 // Default 5%
  return Math.round(itemsPrice * taxRate * 100) / 100
}

module.exports = {
  calculateShipping,
  calculateTax,
}
