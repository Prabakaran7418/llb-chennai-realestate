const nodemailer = require('nodemailer');

const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'prabakaransethu7@gmail.com',
    pass: process.env.SMTP_PASS || 'poni gwzv ufcj ivae'
  }
};

const transporter = nodemailer.createTransport(SMTP_CONFIG);

function generateEmailHtml(payload) {
  const customer = payload.customer || {};
  const property = payload.property || {};
  const mainImage = (property.images && property.images.length > 0) 
    ? property.images[0] 
    : 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80';
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
            <tr><td class="lbl">Locality</td><td class="val">${property.locality || property.areaName || 'Greater Chennai'}</td></tr>
            <tr><td class="lbl">Plot Number</td><td class="val">${property.plotNumber || 'Plot Target'}</td></tr>
            <tr><td class="lbl">Size / Dimensions</td><td class="val">${property.dimensions || property.size || 'Standard'}</td></tr>
            <tr><td class="lbl">Area (sq.ft)</td><td class="val">${property.areaSqFt ? property.areaSqFt + ' sq.ft' : 'Standard'}</td></tr>
            <tr><td class="lbl">Vasthu / Facing</td><td class="val">${property.facing || 'East Facing'}</td></tr>
            <tr><td class="lbl">Approval Status</td><td class="val">${property.approval || 'CMDA & RERA Approved'}</td></tr>
            <tr><td class="lbl">Access Road</td><td class="val">${property.roadWidth || '30 Ft Wide Tar Road'}</td></tr>
            <tr><td class="lbl">Drinking Water</td><td class="val">Sweet Potable Water at 22-25 ft</td></tr>
            <tr><td class="lbl">Bank Loan Tie-ups</td><td class="val">SBI, HDFC, ICICI, Axis Bank (Up to 90%)</td></tr>
          </table>
        </div>
      </div>

      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin: 20px 0; text-align: center;">
        <div style="font-size: 13px; font-weight: bold; color: #09090b; margin-bottom: 6px;">📍 Verified GPS Coordinates & Road Navigation</div>
        <a href="${property.googleMapsUrl || 'https://maps.google.com'}" style="display: inline-block; background: #059669; color: #ffffff !important; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 12px; font-weight: bold;">
          🧭 Open Driving Route to Plot on Google Maps &rarr;
        </a>
      </div>

      <div class="visit-box">
        <div class="visit-title">✓ Complimentary Site Visit Service</div>
        <p class="visit-text">
          <strong>Requested Date:</strong> ${visitDate}<br>
          <strong>Transportation:</strong> ${cabText}<br>
          <strong>Senior Property Manager:</strong> S. Karthik (+91 98401 55678)<br>
          Our customer relationship officer will call you at <strong>${customer.phone || 'your phone number'}</strong> to coordinate your visit.
        </p>
      </div>

      <div class="btn-wrap">
        <a href="https://wa.me/919840000000?text=Hi%20LLB%20Realty,%20I%20received%20the%20email%20prospectus%20for%20${encodeURIComponent(property.title || 'Property')}" class="btn">
          Connect with Us on WhatsApp &rarr;
        </a>
      </div>
    </div>

    <div class="footer">
      <strong>LLB Realty & Promoters Private Limited</strong><br>
      Corporate Office: Anna Nagar Western Extension, Chennai - 600101<br>
      Helpline: +91 98400 00000 · Email: sales@llbrealty.com · Web: llb-chennai-realestate.vercel.app
    </div>
  </div>
</body>
</html>
  `;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'active', service: 'LLB Realty Email Serverless API' });
  }

  try {
    const payload = req.body || {};
    const customer = payload.customer || {};
    const property = payload.property || {};
    const recipient = customer.email;

    if (!recipient || !recipient.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid customer email is required' });
    }

    const mailOptions = {
      from: `"LLB Realty & Promoters" <${SMTP_CONFIG.auth.user}>`,
      to: recipient,
      cc: SMTP_CONFIG.auth.user,
      subject: `[LLB Realty Chennai] Official Property Prospectus: ${property.title || 'Residential Property'}`,
      html: generateEmailHtml(payload)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email successfully delivered to ${recipient}:`, info.messageId);

    return res.status(200).json({
      success: true,
      message: `Official prospectus email successfully sent to ${recipient}`,
      messageId: info.messageId
    });
  } catch (err) {
    console.error('SMTP Delivery Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
