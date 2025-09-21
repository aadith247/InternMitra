const express = require('express');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireArtisan } = require('../middleware/auth');
const productRepo = require('../repositories/productRepository');
const { GoogleGenerativeAI } = require('@google/genai');
const { uploadMemeImage } = require('../utils/cloudinary');
const { createCanvas, loadImage, registerFont } = require('canvas');

const router = express.Router();


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Generate caption using OpenAI
router.post('/generate-caption', authenticateToken, requireArtisan, [
  body('productId').isString().withMessage('productId required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const product = await productRepo.findById(req.body.productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (Number(product.artisanId) !== Number(req.user.id)) return res.status(403).json({ success: false, message: 'Not allowed' });

    const prompt = `Write a short, witty, meme-style caption (max 20 words) for a product named "${product.name}". The tone should be fun, relatable, and brand-safe. Return only the caption.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const completion = await model.generateContent(prompt);
    const caption = completion?.response?.text?.().trim?.() || 'When your cart has taste.';
    res.json({ success: true, data: { caption } });
  } catch (error) {
    console.error('Caption gen error', error?.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Failed to generate caption' });
  }
});

// Create meme using Imgflip API or Canvas fallback
router.post('/create', authenticateToken, requireArtisan, [
  body('productId').isString(),
  body('templateId').optional().isString(),
  body('captionTop').optional().isString(),
  body('captionBottom').optional().isString(),
  body('imageUrl').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { productId, templateId, captionTop = '', captionBottom = '', imageUrl } = req.body;
    const product = await productRepo.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (Number(product.artisanId) !== Number(req.user.id)) return res.status(403).json({ success: false, message: 'Not allowed' });

    let memeUrl = '';
    let publicId = '';

    // Try Imgflip if credentials provided
    if (process.env.IMGFLIP_USERNAME && process.env.IMGFLIP_PASSWORD && templateId) {
      try {
        const params = new URLSearchParams();
        params.append('template_id', templateId);
        params.append('username', process.env.IMGFLIP_USERNAME);
        params.append('password', process.env.IMGFLIP_PASSWORD);
        params.append('text0', captionTop);
        params.append('text1', captionBottom);
        const resp = await axios.post('https://api.imgflip.com/caption_image', params);
        if (resp.data?.success) {
          memeUrl = resp.data.data.url;
        }
      } catch (e) {
        console.warn('Imgflip failed, falling back to Canvas');
      }
    }

    // Canvas fallback if Imgflip not used
    if (!memeUrl) {
      const baseImageUrl = imageUrl || product.primaryImage?.url || product.images?.[0]?.url;
      if (!baseImageUrl) return res.status(400).json({ success: false, message: 'No base image available' });

      const canvasSize = 800;
      const canvas = createCanvas(canvasSize, canvasSize);
      const ctx = canvas.getContext('2d');
      const img = await loadImage(baseImageUrl);
      // Draw background white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasSize, canvasSize);
      // Draw image centered and contained
      const scale = Math.min(canvasSize / img.width, canvasSize / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (canvasSize - w) / 2;
      const y = (canvasSize - h) / 2;
      ctx.drawImage(img, x, y, w, h);

      // Text styling
      ctx.font = 'bold 36px Arial';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      // Top text
      if (captionTop) ctx.fillText(captionTop.toUpperCase(), canvasSize / 2, 16, canvasSize - 32);
      // Bottom text
      if (captionBottom) {
        ctx.textBaseline = 'bottom';
        ctx.fillText(captionBottom.toUpperCase(), canvasSize / 2, canvasSize - 16, canvasSize - 32);
      }

      const dataUrl = canvas.toDataURL('image/png');
      const uploaded = await uploadMemeImage(dataUrl);
      if (!uploaded.success) return res.status(400).json({ success: false, message: uploaded.error || 'Upload failed' });
      memeUrl = uploaded.data.url;
      publicId = uploaded.data.publicId;
    }

    // Save meme record to product
    const updated = await productRepo.addMeme(product.id, {
      templateId: templateId || 'canvas',
      caption: `${captionTop} ${captionBottom}`.trim(),
      imageUrl: memeUrl,
      publicId,
      status: 'generated',
      generatedAt: new Date()
    });

    res.json({ success: true, data: { memeUrl, product: updated } });
  } catch (error) {
    console.error('Meme create error', error);
    res.status(500).json({ success: false, message: 'Failed to create meme' });
  }
});

// Approve meme
router.post('/:productId/memes/:memeIndex/approve', authenticateToken, requireArtisan, async (req, res) => {
  try {
    const product = await productRepo.findById(req.params.productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (Number(product.artisanId) !== Number(req.user.id)) return res.status(403).json({ success: false, message: 'Not allowed' });
    const index = Number(req.params.memeIndex);
    const updated = await productRepo.approveMeme(product.id, index);
    if (!updated) return res.status(400).json({ success: false, message: 'Invalid meme index' });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to approve meme' });
  }
});

module.exports = router;


