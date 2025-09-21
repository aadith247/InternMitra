const express = require('express');
const axios = require('axios');
const { authenticateToken, requireArtisan, requireInstagramConnection } = require('../middleware/auth');
const userRepo = require('../repositories/userRepository');
const productRepo = require('../repositories/productRepository');

const router = express.Router();

// Begin OAuth: send user to dialog URL
router.get('/connect', authenticateToken, requireArtisan, (req, res) => {
  const clientId = process.env.INSTAGRAM_APP_ID;
  const redirectUri = encodeURIComponent(process.env.INSTAGRAM_REDIRECT_URI);
  const scope = encodeURIComponent('pages_show_list,business_management,instagram_basic,instagram_content_publish');
  const url = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;
  res.json({ success: true, data: { url } });
});

// OAuth callback (exchange code for token)
router.get('/callback', authenticateToken, requireArtisan, async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ success: false, message: 'Code missing' });
    const appId = process.env.INSTAGRAM_APP_ID;
    const appSecret = process.env.INSTAGRAM_APP_SECRET;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

    // 1) Exchange code for short-lived token
    const tokenResp = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: { client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code }
    });
    const shortLived = tokenResp.data.access_token;

    // 2) Exchange for long-lived token
    const llResp = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: { grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: shortLived }
    });
    const longLived = llResp.data.access_token;

    // 3) Get Pages for the user and find a Page with instagram_business_account
    const pagesResp = await axios.get('https://graph.facebook.com/v21.0/me/accounts', { params: { access_token: longLived } });
    const pages = pagesResp.data.data || [];
    let selectedPage = null;
    let igUserId = null;
    for (const page of pages) {
      const pageDetails = await axios.get(`https://graph.facebook.com/v21.0/${page.id}`, { params: { fields: 'instagram_business_account', access_token: page.access_token } });
      if (pageDetails.data.instagram_business_account?.id) {
        selectedPage = page;
        igUserId = pageDetails.data.instagram_business_account.id;
        break;
      }
    }

    if (!selectedPage || !igUserId) return res.status(400).json({ success: false, message: 'No connected Instagram Business account found on your Pages.' });

    const user = await userRepo.findById(req.user.id);
    const instagram = {
      ...(user.instagram || {}),
      connected: true,
      accessToken: longLived,
      pageAccessToken: selectedPage.access_token,
      instagramId: igUserId,
      pageId: selectedPage.id,
      username: user.instagram?.username || null,
      connectedAt: new Date()
    };
    await userRepo.updateById(req.user.id, { instagram });
    res.json({ success: true, message: 'Instagram connected', data: { pageId: selectedPage.id, instagramId: igUserId } });
  } catch (error) {
    console.error('IG callback error', error);
    res.status(500).json({ success: false, message: 'Failed to connect Instagram' });
  }
});

// Post meme to Instagram (requires connected IG)
router.post('/post', authenticateToken, requireArtisan, requireInstagramConnection, async (req, res) => {
  try {
    const { productId, memeIndex = 0, caption } = req.body;
    const product = await productRepo.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (Number(product.artisanId) !== Number(req.user.id)) return res.status(403).json({ success: false, message: 'Not allowed' });
    const meme = (product.memes || [])[memeIndex];
    if (!meme || (meme.status !== 'approved' && meme.status !== 'generated')) return res.status(400).json({ success: false, message: 'Meme not available to post' });

    // 1) Create media container
    const imageUrl = meme.imageUrl;
    const user = await userRepo.findById(req.user.id);
    const igUserId = user.instagram.instagramId;
    const pageToken = user.instagram.pageAccessToken;

    const createResp = await axios.post(`https://graph.facebook.com/v21.0/${igUserId}/media`, null, {
      params: { image_url: imageUrl, caption: caption || meme.caption || product.name, access_token: pageToken }
    });
    const creationId = createResp.data.id;

    // 2) Publish container
    const publishResp = await axios.post(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, null, {
      params: { creation_id: creationId, access_token: pageToken }
    });
    const postId = publishResp.data.id;

    const updated = await productRepo.markMemePosted(product.id, memeIndex, postId);

    res.json({ success: true, message: 'Posted to Instagram', data: { postId, product: updated } });
  } catch (error) {
    console.error('IG post error', error);
    res.status(500).json({ success: false, message: 'Failed to post to Instagram' });
  }
});

// Fetch insights
router.get('/insights/:productId', authenticateToken, requireArtisan, requireInstagramConnection, async (req, res) => {
  try {
    const product = await productRepo.findById(req.params.productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (Number(product.artisanId) !== Number(req.user.id)) return res.status(403).json({ success: false, message: 'Not allowed' });
    const user = await userRepo.findById(req.user.id);
    const igUserId = user.instagram.instagramId;
    const pageToken = user.instagram.pageAccessToken;
    const active = (product.memes || []).filter(m => m.status === 'approved' || m.status === 'posted');

    // For each post, fetch basic metrics (limited by IG API permissions)
    const results = [];
    for (const m of active) {
      if (!m.instagramPostId) { results.push({ postId: null }); continue; }
      try {
        const metricsResp = await axios.get(`https://graph.facebook.com/v21.0/${m.instagramPostId}/insights`, {
          params: { metric: 'impressions,reach,likes,comments', access_token: pageToken }
        });
        const metrics = {};
        (metricsResp.data.data || []).forEach(x => { metrics[x.name] = x.values?.[0]?.value || 0; });
        results.push({ postId: m.instagramPostId, ...metrics });
      } catch (e) {
        results.push({ postId: m.instagramPostId, error: true });
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch insights' });
  }
});

module.exports = router;


