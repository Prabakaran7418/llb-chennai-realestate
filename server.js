// LLB Realty Chennai - Unified Web & Mobile Live Tunnel Server
// Serves Static Website on Port 3000 + Public Localtunnel for Mobile Phones + Email Dispatcher on Port 5678

const express = require('C:/Users/praba karan/.gemini/antigravity/scratch/llb-real-estate/server/node_modules/express');
const localtunnel = require('C:/Users/praba karan/.gemini/antigravity/scratch/llb-real-estate/server/node_modules/localtunnel');
const nodemailer = require('C:/Users/praba karan/.gemini/antigravity/scratch/llb-real-estate/server/node_modules/nodemailer');
const cors = require('C:/Users/praba karan/.gemini/antigravity/scratch/llb-real-estate/server/node_modules/cors');
const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = 3000;
const EMAIL_PORT = 5678;
const WIFI_IP = '192.168.0.26';
const PUBLIC_IP = '106.51.168.236';

let currentMobileUrl = 'https://schema-opposite-plaintiff-desirable.trycloudflare.com';
try {
  const saved = JSON.parse(fs.readFileSync(path.join(__dirname, 'mobile-url.json'), 'utf8'));
  if (saved && saved.publicUrl) currentMobileUrl = saved.publicUrl;
} catch (e) {}

const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'prabakaransethu7@gmail.com',
    pass: 'poni gwzv ufcj ivae'
  }
};

const transporter = nodemailer.createTransport(SMTP_CONFIG);

function generateEmailHtml(payload) {
  const customer = payload.customer || {};
  const property = payload.property || {};
  const mainImage = (property.images && property.images.length > 0) ? property.images[0] : 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80';
  const visitDate = customer.preferredDate || 'To be scheduled with manager';
  const cabText = customer.needCab ? 'Complimentary AC Cab Pickup from Residence' : 'Direct Self-Drive';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>LLB Realty Property Prospectus</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px; color: #09090b; }
    .container { max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
    .header { background: #09090b; color: #ffffff; padding: 28px 24px; text-align: center; }
    .logo-badge { display: inline-block; width: 44px; height: 44px; line-height: 44px; background: #ffffff; color: #09090b; font-weight: 900; font-size: 22px; border-radius: 8px; margin-bottom: 8px; font-family: Georgia, serif; text-align: center; }
    .brand-title { font-size: 20px; font-weight: 900; letter-spacing: 2px; margin: 0; text-transform: uppercase; color: #ffffff; }
    .brand-sub { font-size: 10px; color: #a1a1aa; letter-spacing: 3px; text-transform: uppercase; margin-top: 4px; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 18px; font-weight: 800; color: #09090b; margin-bottom: 12px; }
    .text { font-size: 14px; line-height: 1.6; color: #52525b; margin-bottom: 20px; }
    .prop-card { border: 1px solid #e4e4e7; border-radius: 10px; overflow: hidden; background: #fafafa; margin: 24px 0; }
    .prop-img { width: 100%; height: 260px; object-fit: cover; display: block; }
    .prop-body { padding: 20px; }
    .prop-tag { display: inline-block; background: #09090b; color: #ffffff; font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px; letter-spacing: 1px; }
    .prop-title { font-size: 18px; font-weight: 900; color: #09090b; margin: 10px 0 6px 0; }
    .prop-price { font-size: 22px; font-weight: 900; color: #09090b; }
    .table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    .table td { padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    .table td.lbl { color: #71717a; width: 45%; }
    .table td.val { color: #09090b; font-weight: 700; text-align: right; }
    .visit-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 24px 0; }
    .visit-title { font-size: 13px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .visit-text { font-size: 13px; color: #15803d; line-height: 1.5; margin: 0; }
    .btn-wrap { text-align: center; margin: 30px 0 10px 0; }
    .btn { display: inline-block; background: #09090b; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 50px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
    .footer { background: #f4f4f5; border-top: 1px solid #e4e4e7; padding: 20px 24px; text-align: center; font-size: 11px; color: #71717a; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">L</div>
      <div class="brand-title">LLB REALTY & PROMOTERS</div>
      <div class="brand-sub">CHENNAI RESIDENTIAL PROPERTIES · 100% CLEAR TITLES</div>
    </div>
    <div class="content">
      <div class="greeting">Vanakkam ${customer.name || 'Valued Home Seeker'}!</div>
      <p class="text">
        Thank you for your enquiry with <strong>LLB Realty Chennai</strong>. Here is your official property prospectus, verified specifications, and live site visit details:
      </p>

      <div class="prop-card">
        <img src="${mainImage}" alt="${property.title || 'Property'}" class="prop-img">
        <div class="prop-body">
          <span class="prop-tag">${property.type === 'plot' ? 'Demarcated Residential Plot' : 'Independent Family House'}</span>
          <div class="prop-title">${property.title || 'Selected Property'}</div>
          <div class="prop-price">${property.price || 'Price on Request'} <span style="font-size:12px; font-weight:normal; color:#71717a;">(${property.pricePerSqft || ''})</span></div>
          
          <table class="table">
            <tr><td class="lbl">Locality</td><td class="val">${property.areaName || 'Chennai'}</td></tr>
            <tr><td class="lbl">Size / Dimensions</td><td class="val">${property.size || 'Standard'}</td></tr>
            <tr><td class="lbl">Vasthu / Facing</td><td class="val">${property.facing || 'East Facing'}</td></tr>
            <tr><td class="lbl">Approval Status</td><td class="val">${property.approval || 'CMDA & RERA Approved'}</td></tr>
            <tr><td class="lbl">Groundwater Table</td><td class="val">${property.waterTable || 'Sweet Potable Water at 22 ft'}</td></tr>
            <tr><td class="lbl">Bank Loan Tie-ups</td><td class="val">SBI, HDFC, ICICI, Axis Bank (Up to 90%)</td></tr>
          </table>
        </div>
      </div>

      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin: 20px 0; text-align: center;">
        <div style="font-size: 13px; font-weight: bold; color: #09090b; margin-bottom: 6px;">📍 Google Maps Driving Navigation</div>
        <a href="https://maps.google.com/maps?daddr=${property.coords ? property.coords[0] + ',' + property.coords[1] : 'Chennai'}&travelmode=driving" style="display: inline-block; background: #059669; color: #ffffff !important; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 12px; font-weight: bold;">
          🧭 Open Driving Route from My Location &rarr;
        </a>
      </div>

      <div class="visit-box">
        <div class="visit-title">✓ Live Site Visit Update</div>
        <p class="visit-text">
          <strong>Scheduled Date:</strong> ${visitDate}<br>
          <strong>Transportation:</strong> ${cabText}<br>
          <strong>Senior Property Manager:</strong> S. Karthik (+91 98401 55678)<br>
          Our coordinator will call you at ${customer.phone || 'your phone number'} prior to your visit.
        </p>
      </div>

      <div class="btn-wrap">
        <a href="https://wa.me/919840000000?text=Hi%20LLB%20Realty,%20I%20received%20the%20email%20prospectus%20for%20${encodeURIComponent(property.title || 'Property')}" class="btn">
          Connect on WhatsApp &rarr;
        </a>
      </div>
    </div>

    <div class="footer">
      <strong>LLB Realty & Promoters Private Limited</strong><br>
      Corporate Office: Anna Nagar Western Extension, Chennai - 600101<br>
      Helpline: +91 98400 00000 · Email: sales@llbrealty.com · Web: www.llbrealty.com
    </div>
  </div>
</body>
</html>
  `;
}

// 1. SETUP EXPRESS APP (PORT 3000)
const app = express();
app.use(cors());
app.use(express.json());

// Serve Static Frontend
app.use(express.static(__dirname));

// API Endpoint to get the active mobile link
app.get('/api/mobile-url', (req, res) => {
  res.json({
    publicUrl: currentMobileUrl,
    wifiUrl: `http://${WIFI_IP}:${PORT}`,
    tunnelPassword: ""
  });
});

// Real Road Directions Routing Proxy (OSRM OpenStreetMap Driving API)
app.get('/api/directions', async (req, res) => {
  try {
    const { startLat, startLng, destLat, destLng, profile = 'driving' } = req.query;
    if (!startLat || !startLng || !destLat || !destLng) {
      return res.status(400).json({ error: 'Missing start or destination coordinates' });
    }
    const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
    const response = await fetch(osrmUrl);
    if (!response.ok) {
      throw new Error(`Routing provider returned ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Directions routing error:', err.message);
    res.status(500).json({ error: 'Failed to compute route', message: err.message });
  }
});

// Webhook for Emails
async function handleWebhookEmail(req, res) {
  try {
    const payload = req.body || {};
    const customer = payload.customer || {};
    const property = payload.property || {};
    const recipient = customer.email;

    console.log(`\n======================================================`);
    console.log(`⚡ [LLB Webhook] Received Event: "${payload.event || 'property.enquiry'}"`);
    console.log(`   Customer: ${customer.name} (${recipient})`);
    console.log(`   Property: ${property.title} [${property.price}]`);

    if (recipient && recipient.includes('@')) {
      const mailOptions = {
        from: `"LLB Realty & Promoters" <${SMTP_CONFIG.auth.user}>`,
        to: recipient,
        subject: `[LLB Realty Chennai] Property Prospectus & Live Site Visit: ${property.title}`,
        html: generateEmailHtml(payload)
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error('❌ Error delivering real email:', err.message);
        } else {
          console.log(`✅ REAL EMAIL DELIVERED TO: ${recipient} (${info.messageId})`);
        }
      });
    }

    res.json({ success: true, message: 'Email queued and webhook processed.' });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
}

app.post('/webhook/llb-events', handleWebhookEmail);
app.post('/api/llb-events', handleWebhookEmail);

// 2. ALSO LISTEN ON PORT 5678 FOR COMPATIBILITY
const emailServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/webhook/llb-events' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const customer = payload.customer || {};
        const property = payload.property || {};
        const recipient = customer.email;

        if (recipient && recipient.includes('@')) {
          transporter.sendMail({
            from: `"LLB Realty & Promoters" <${SMTP_CONFIG.auth.user}>`,
            to: recipient,
            subject: `[LLB Realty Chennai] Property Prospectus & Live Site Visit: ${property.title}`,
            html: generateEmailHtml(payload)
          }, (err, info) => {
            if (!err) console.log(`✅ REAL EMAIL DELIVERED VIA PORT 5678 TO: ${recipient}`);
          });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'active', port: EMAIL_PORT }));
  }
});

emailServer.listen(EMAIL_PORT, '0.0.0.0', () => {
  console.log(`📧 Secondary Email Webhook listening on http://localhost:${EMAIL_PORT}/webhook/llb-events`);
});

// 3. START HTTP WEB SERVER ON PORT 3000
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 LLB Realty Chennai Server running!`);
  console.log(`   💻 Local Desktop:   http://localhost:${PORT}`);
  console.log(`   📶 Wi-Fi Mobile:    http://${WIFI_IP}:${PORT}`);
  console.log(`   🌐 Public Mobile:   ${currentMobileUrl} (Zero Passwords / Instant Open)`);
  console.log(`======================================================\n`);
});
