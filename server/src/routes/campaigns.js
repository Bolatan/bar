const express = require('express');
const nodemailer = require('nodemailer');
const { requireAuth, requireRole } = require('../middleware/auth');
const { store } = require('../store');

const router = express.Router();

// Only owner and manager are allowed to run marketing campaigns and access customer contacts
router.use(requireAuth, requireRole('owner', 'manager'));

/**
 * GET /api/campaigns/contacts
 * Returns a list of unique customer contacts collected from paid orders
 */
router.get('/contacts', async (req, res, next) => {
  try {
    const orders = await store.findCollectedContacts();

    // Group contacts by unique email or phone
    const contactsMap = new Map();

    for (const order of orders) {
      const email = (order.customerEmail || '').trim().toLowerCase();
      const phone = (order.customerPhone || '').trim();

      if (!email && !phone) continue;

      // Primary key for grouping
      const key = email || phone;

      if (!contactsMap.has(key)) {
        contactsMap.set(key, {
          email: email || '',
          phone: phone || '',
          marketingConsentEmail: order.marketingConsentEmail || false,
          marketingConsentWhatsApp: order.marketingConsentWhatsApp || false,
          orderCount: 0,
          totalSpent: 0,
          lastOrderDate: order.paidAt || order.createdAt
        });
      }

      const contact = contactsMap.get(key);
      contact.orderCount += 1;
      contact.totalSpent += order.total || 0;

      const orderDate = new Date(order.paidAt || order.createdAt);
      const currentLastDate = new Date(contact.lastOrderDate);
      if (orderDate > currentLastDate) {
        contact.lastOrderDate = order.paidAt || order.createdAt;
        // Keep latest contact information and consents
        if (email) contact.email = email;
        if (phone) contact.phone = phone;
        contact.marketingConsentEmail = order.marketingConsentEmail || false;
        contact.marketingConsentWhatsApp = order.marketingConsentWhatsApp || false;
      }
    }

    const contactsList = Array.from(contactsMap.values());
    res.json({ contacts: contactsList });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/campaigns/send-email
 * Dispatches bulk emails to chosen recipients via Nodemailer with local fallback
 */
router.post('/send-email', async (req, res, next) => {
  try {
    const { recipients, subject, body } = req.body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Recipients array is required and must not be empty' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'Subject is required' });
    }
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Body is required' });
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || 'Malt & Lime Marketing <marketing@maltlime.ng>';

    let simulated = false;
    let errorMessage = null;

    if (!smtpHost || !smtpUser || !smtpPass) {
      simulated = true;
      console.log('------------------- MALT & LIME EMAIL SIMULATION -------------------');
      console.log(`From: ${smtpFrom}`);
      console.log(`Subject: ${subject}`);
      console.log(`Recipients count: ${recipients.length}`);
      console.log(`Recipients: ${recipients.join(', ')}`);
      console.log(`Content:\n${body}`);
      console.log('--------------------------------------------------------------------');
    } else {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        // Verify transporter connection
        await transporter.verify();

        // Send actual mail to multiple recipients (sending individually or in bulk)
        // For simple newsletter, BCCing or sending a bulk message is standard
        await transporter.sendMail({
          from: smtpFrom,
          bcc: recipients.join(','),
          subject: subject,
          html: body
        });
      } catch (err) {
        console.error('SMTP real sending failed, falling back to console simulation:', err.message);
        simulated = true;
        errorMessage = err.message;
      }
    }

    // Register Audit Log
    await store.createAuditLog({
      userId: req.user._id,
      action: 'marketing_campaign_email',
      entityType: 'Campaign',
      entityId: null,
      details: {
        recipientCount: recipients.length,
        subject,
        simulated,
        ...(errorMessage ? { error: errorMessage } : {})
      }
    });

    res.json({
      success: true,
      simulated,
      count: recipients.length,
      message: simulated
        ? 'Campaign sent successfully in simulation mode (emails printed to backend console)'
        : 'Campaign sent successfully'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/campaigns/send-whatsapp
 * Dispatches simulated WhatsApp messages to chosen recipients
 */
router.post('/send-whatsapp', async (req, res, next) => {
  try {
    const { recipients, message } = req.body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Recipients array is required and must not be empty' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Simulate WhatsApp broadcast
    console.log('------------------ MALT & LIME WHATSAPP SIMULATION ------------------');
    console.log(`Recipients count: ${recipients.length}`);
    console.log(`Recipients: ${recipients.join(', ')}`);
    console.log(`Message:\n${message}`);
    console.log('---------------------------------------------------------------------');

    // Register Audit Log
    await store.createAuditLog({
      userId: req.user._id,
      action: 'marketing_campaign_whatsapp',
      entityType: 'Campaign',
      entityId: null,
      details: {
        recipientCount: recipients.length,
        simulated: true
      }
    });

    res.json({
      success: true,
      simulated: true,
      count: recipients.length,
      message: 'WhatsApp broadcast completed successfully in simulation mode'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
