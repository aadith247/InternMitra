const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireCustomer, requireArtisan } = require('../middleware/auth');
const orderRepo = require('../repositories/orderRepository');
const productRepo = require('../repositories/productRepository');
const router = express.Router();
router.post('/', authenticateToken, requireCustomer, [
  body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  body('items.*.product').isString().withMessage('Product id required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be >= 1'),
  body('shippingAddress').isObject().withMessage('Shipping address required'),
  body('payment.method').isIn(['razorpay','stripe','cod','bank_transfer']).withMessage('Invalid payment method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const { items, shippingAddress, payment, source = 'direct', utm = {} } = req.body;
    const productIds = items.map(i => i.product);
    const prods = await productRepo.findManyByIds(productIds);
    if (prods.length !== items.length) return res.status(400).json({ success: false, message: 'Some products not found' });

    const firstProduct = prods[0];
    const artisanId = firstProduct.artisanId;

    const orderItems = items.map(i => {
      const p = prods.find(pp => String(pp.id) === String(i.product));
      const price = Number(p.price);
      return {
        product: Number(p.id),
        productName: p.name,
        quantity: Number(i.quantity),
        price,
        total: price * Number(i.quantity)
      };
    });
    const subtotal = orderItems.reduce((s, i) => s + i.total, 0);
    const shipping = 0;
    const tax = 0;
    const discount = 0;
    const total = subtotal + shipping + tax - discount;
    const order = await orderRepo.createOrder({
      customerId: req.user.id,
      artisanId,
      items: orderItems,
      shippingAddress,
      pricing: { subtotal, shipping, tax, discount, total, currency: 'INR' },
      payment: { method: payment.method, status: 'pending' },
      source,
      utm,
    });
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error('Create order error', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

router.get('/me', authenticateToken, requireCustomer, async (req, res) => {
  try {
    const orders = await orderRepo.listByCustomer(req.user.id);
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list orders' });
  }
});


router.get('/artisan', authenticateToken, requireArtisan, async (req, res) => {
  try {
    const orders = await orderRepo.listByArtisan(req.user.id);
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list artisan orders' });
  }
});

// Get order by id (owner only: customer or artisan)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await orderRepo.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const isOwner = Number(order.customerId) === Number(req.user.id) || Number(order.artisanId) === Number(req.user.id);
    if (!isOwner) return res.status(403).json({ success: false, message: 'Not allowed' });
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
});

// Update order status (artisan)
router.put('/:id/status', authenticateToken, requireArtisan, [
  body('status').isIn(['pending','confirmed','processing','shipped','delivered','cancelled','refunded','returned']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const order = await orderRepo.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (Number(order.artisanId) !== Number(req.user.id)) return res.status(403).json({ success: false, message: 'Not allowed' });
    const updated = await orderRepo.updateStatus(order.id, req.body.status, req.body.message, req.user.id);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

module.exports = router;


