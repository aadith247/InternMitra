const express = require('express');
const Razorpay = require('razorpay');
const Stripe = require('stripe');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const orderRepo = require('../repositories/orderRepository');

const router = express.Router();


const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET ? new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
}) : null;


const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

router.post('/razorpay/create-order', authenticateToken, async (req, res) => {
  try {
    if (!razorpay) return res.status(400).json({ success: false, message: 'Razorpay not configured' });
    const { orderId } = req.body;
    const order = await orderRepo.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (Number(order.customerId) !== Number(req.user.id)) return res.status(403).json({ success: false, message: 'Not allowed' });

    const options = {
      amount: Math.round(order.pricing.total * 100),
      currency: order.pricing.currency || 'INR',
      receipt: order.orderNumber,
    };
    const rpOrder = await razorpay.orders.create(options);
    res.json({ success: true, data: rpOrder });
  } catch (error) {
    console.error('Razorpay create error', error);
    res.status(500).json({ success: false, message: 'Failed to create Razorpay order' });
  }
});


router.post('/razorpay/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
    const sign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
    if (sign !== razorpay_signature) return res.status(400).json({ success: false, message: 'Invalid signature' });

    const order = await orderRepo.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const updatedPayment = await orderRepo.updatePaymentCompleted(order.id, { paymentId: razorpay_payment_id, transactionId: razorpay_order_id });
    const updated = await orderRepo.updateStatus(order.id, 'confirmed', 'Payment confirmed');
    res.json({ success: true, message: 'Payment verified', data: updated });
  } catch (error) {
    console.error('Razorpay verify error', error);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});


router.post('/stripe/create-session', authenticateToken, async (req, res) => {
  try {
    if (!stripe) return res.status(400).json({ success: false, message: 'Stripe not configured' });
    const { orderId, successUrl, cancelUrl } = req.body;
    const order = await orderRepo.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (Number(order.customerId) !== Number(req.user.id)) return res.status(403).json({ success: false, message: 'Not allowed' });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: order.items.map(item => ({
        price_data: {
          currency: (order.pricing.currency || 'usd').toLowerCase(),
          product_data: { name: item.productName || 'Product' },
          unit_amount: Math.round(item.price * 100)
        },
        quantity: item.quantity
      })),
      metadata: { orderId: String(order.id) }
    });
    res.json({ success: true, data: { id: session.id, url: session.url } });
  } catch (error) {
    console.error('Stripe session error', error);
    res.status(500).json({ success: false, message: 'Failed to create Stripe session' });
  }
});


router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    let event = req.body;
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    }
    if (event.type === 'checkout.session.completed') {
      const orderId = event.data.object.metadata.orderId;
      const order = await orderRepo.findById(orderId);
      if (order) {
        await orderRepo.updatePaymentCompleted(order.id, { paymentId: event.data.object.payment_intent, transactionId: event.id });
        await orderRepo.updateStatus(order.id, 'confirmed', 'Payment confirmed');
      }
    }
    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});
module.exports = router;


