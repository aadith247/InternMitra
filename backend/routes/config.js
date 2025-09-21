const express = require('express');
const router = express.Router();

// Public config: Only expose NON-SECRET values
router.get('/public', (req, res) => {
  res.json({
    success: true,
    data: {
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      instagramRedirectUri: process.env.INSTAGRAM_REDIRECT_URI || '',
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      brand: {
        primary: process.env.BRAND_PRIMARY || '#32CD32',
        accent: process.env.BRAND_ACCENT || '#111111',
      },
      apiVersion: 'v1'
    }
  });
});

module.exports = router;
