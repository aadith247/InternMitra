const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireArtisan, optionalAuth } = require('../middleware/auth');
const Product = require('../models/Product');
const { uploadImage, deleteImage } = require('../utils/cloudinary');

const router = express.Router();

// Multer setup (memory storage expects base64 or remote URLs submitted; for simplicity, accept base64 in body too)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Validation
const productValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Product name 2-100 chars'),
  body('description').trim().isLength({ min: 10, max: 500 }).withMessage('Description 10-500 chars'),
  body('price').isFloat({ gt: 0 }).withMessage('Price must be > 0'),
  body('category').isIn(['fashion','jewelry','home','art','crafts','beauty','electronics','books','food','other']).withMessage('Invalid category')
];

// Create product
router.post('/', authenticateToken, requireArtisan, productValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { name, description, price, category, tags = [], images = [] } = req.body;

    const product = await productRepo.createProduct(req.user.id, {
      name, description, price, category, tags,
      images,
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error('Create product error', error);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
});

// Upload product image (base64 string in body.imageBase64)
router.post('/:id/images', authenticateToken, requireArtisan, async (req, res) => {
  try {
    const product = await productRepo.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (Number(product.artisanId) !== Number(req.user.id)) return res.status(403).json({ success: false, message: 'Not allowed' });

    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ success: false, message: 'imageBase64 required' });

    const uploaded = await uploadImage(imageBase64, 'auto-meme-commerce/products');
    if (!uploaded.success) return res.status(400).json({ success: false, message: uploaded.error || 'Upload failed' });

    const isPrimary = (product.images || []).length === 0;
    const images = [...(product.images || []), { url: uploaded.data.url, publicId: uploaded.data.publicId, isPrimary }];
    const updated = await productRepo.updateById(product.id, { images });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Upload image error', error);
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
});

// Set primary image
router.put('/:id/images/:imgIndex/primary', authenticateToken, requireArtisan, async (req, res) => {
  try {
    const product = await productRepo.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (Number(product.artisanId) !== Number(req.user.id)) return res.status(403).json({ success: false, message: 'Not allowed' });
    const index = Number(req.params.imgIndex);
    const images = product.images || [];
    if (Number.isNaN(index) || !images[index]) return res.status(400).json({ success: false, message: 'Invalid image index' });
    const updatedImages = images.map((img, i) => ({ ...img, isPrimary: i === index }));
    const updated = await productRepo.updateById(product.id, { images: updatedImages });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to set primary image' });
  }
});

// Delete image
router.delete('/:id/images/:imgIndex', authenticateToken, requireArtisan, async (req, res) => {
  try {
    const product = await productRepo.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (Number(product.artisanId) !== Number(req.user.id)) return res.status(403).json({ success: false, message: 'Not allowed' });
    const index = Number(req.params.imgIndex);
    const images = product.images || [];
    if (Number.isNaN(index) || !images[index]) return res.status(400).json({ success: false, message: 'Invalid image index' });
    const removed = images[index];
    const newImages = images.filter((_, i) => i !== index);
    if (removed.publicId) await deleteImage(removed.publicId);
    if (newImages.length > 0 && !newImages.some(i => i.isPrimary)) newImages[0].isPrimary = true;
    const updated = await productRepo.updateById(product.id, { images: newImages });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete image' });
  }
});

// Update product
router.put('/:id', authenticateToken, requireArtisan, productValidation.map(v => v.optional({ nullable: true })), async (req, res) => {
  try {
    const product = await productRepo.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (Number(product.artisanId) !== Number(req.user.id)) return res.status(403).json({ success: false, message: 'Not allowed' });
    const updates = {};
    ['name','description','price','category','tags','isActive','stock'].forEach(key => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });
    const updated = await productRepo.updateById(product.id, updates);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
});

// Get product by id (public)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const product = await productRepo.findById(req.params.id);
    if (!product || !product.isActive) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
});

// List artisan products
router.get('/', authenticateToken, requireArtisan, async (req, res) => {
  try {
    const products = await productRepo.listByArtisan(req.user.id);
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list products' });
  }
});

// Public search
router.get('/public/search/all', optionalAuth, async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice } = req.query;
    const products = await productRepo.searchPublic({ q, category, minPrice: Number(minPrice), maxPrice: Number(maxPrice) });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to search products' });
  }
});

// Delete product
router.delete('/:id', authenticateToken, requireArtisan, async (req, res) => {
  try {
    const product = await productRepo.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (Number(product.artisanId) !== Number(req.user.id)) return res.status(403).json({ success: false, message: 'Not allowed' });
    // Best effort: delete images from cloudinary
    const publicIds = (product.images || []).filter(i => i.publicId).map(i => i.publicId);
    await Promise.all(publicIds.map(pid => deleteImage(pid)));
    await productRepo.removeById(product.id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
});

module.exports = router;


