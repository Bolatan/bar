const nodemailer = require('nodemailer');
const { store } = require('../store');
const { ApiError } = require('../middleware/error');
const config = require('../config');
const createOrderSchema = require('../validations').createOrder;
const checkoutSchema = require('../validations').checkout;
const voidSchema = require('../validations').voidOrder;

async function list(req, res, next) {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.staffId) filter.staffId = req.query.staffId;
    filter.limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const orders = await store.findOrders(filter);
    res.json({ orders: orders.map((o) => o.toJSON()) });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = createOrderSchema.parse(req.body);
    const subtotal = data.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const order = await store.createOrder({
      tabName: data.tabName || 'Counter',
      items: data.items,
      subtotal,
      vat: 0,
      discount: 0,
      total: subtotal,
      status: 'open',
      staffId: req.user._id,
    });
    res.status(201).json({ order: order.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function checkout(req, res, next) {
  try {
    const data = checkoutSchema.parse(req.body);
    const order = await store.findOrderById(req.params.id);
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.status !== 'open') throw new ApiError(400, `Order is already ${order.status}`);

    const discount = data.discount || 0;
    const taxable = Math.max(0, order.subtotal - discount);
    const vat = +(taxable * (config.vatRate / 100)).toFixed(2);
    const total = taxable + vat;

    order.discount = discount;
    order.vat = vat;
    order.total = total;
    order.paymentMethod = data.paymentMethod;
    order.paymentRef = data.paymentRef || null;
    order.status = 'paid';
    order.paidAt = new Date();
    order.customerEmail = data.customerEmail || null;
    order.customerPhone = data.customerPhone || null;
    order.marketingConsentEmail = !!data.marketingConsentEmail;
    order.marketingConsentWhatsApp = !!data.marketingConsentWhatsApp;
    await store.saveOrder(order);

    for (const item of order.items) {
      const product = await store.findProductById(item.productId);
      if (product) {
        product.stockQuantity = Math.max(0, product.stockQuantity - item.quantity);
        await store.updateProduct(item.productId, { stockQuantity: product.stockQuantity });
        await store.createStockMovement({
          productId: item.productId,
          type: 'sale',
          quantity: -item.quantity,
          userId: req.user._id,
          note: `Order ${order.tabName}`,
        });
      }
    }

    await store.createAuditLog({
      userId: req.user._id,
      action: 'order_checkout',
      entityType: 'Order',
      entityId: order._id,
      details: { total, paymentMethod: data.paymentMethod },
    });

    res.json({ order: order.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function voidOrder(req, res, next) {
  try {
    const data = voidSchema.parse(req.body);
    const order = await store.findOrderById(req.params.id);
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.status === 'void') throw new ApiError(400, 'Order already voided');

    const approver = await store.findUserByIdWithPin(req.user._id);
    if (!approver || !approver.pin || approver.pin !== data.pin) {
      throw new ApiError(403, 'Invalid manager PIN');
    }

    if (order.status === 'paid') {
      for (const item of order.items) {
        const product = await store.findProductById(item.productId);
        if (product) {
          product.stockQuantity += item.quantity;
          await store.updateProduct(item.productId, { stockQuantity: product.stockQuantity });
          await store.createStockMovement({
            productId: item.productId,
            type: 'adjustment',
            quantity: item.quantity,
            userId: req.user._id,
            note: `Void: ${data.reason}`,
          });
        }
      }
    }

    order.status = 'void';
    order.voidReason = data.reason;
    order.voidedBy = req.user._id;
    await store.saveOrder(order);

    await store.createAuditLog({
      userId: req.user._id,
      action: 'order_void',
      entityType: 'Order',
      entityId: order._id,
      details: { reason: data.reason },
    });

    res.json({ order: order.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function sendReceipt(req, res, next) {
  try {
    const { id } = req.params;
    const { type = 'email', recipientEmail, recipientPhone } = req.body || {};

    const order = await store.findOrderById(id);
    if (!order) throw new ApiError(404, 'Order not found');

    const emailToUse = (recipientEmail || order.customerEmail || '').trim();
    const phoneToUse = (recipientPhone || order.customerPhone || '').trim();

    if (type === 'email' || type === 'both') {
      if (!emailToUse) {
        throw new ApiError(400, 'Customer email address is required');
      }
    }
    if (type === 'whatsapp' || type === 'both') {
      if (!phoneToUse) {
        throw new ApiError(400, 'Customer phone number is required');
      }
    }

    const orderObj = typeof order.toJSON === 'function' ? order.toJSON() : order;
    const formatNGN = (amt) => '₦' + Number(amt || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
    const formattedDate = new Date(orderObj.paidAt || orderObj.createdAt || Date.now()).toLocaleString('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Africa/Lagos'
    });

    let emailSent = false;
    let emailSimulated = false;

    if (type === 'email' || type === 'both') {
      const itemsHtml = (orderObj.items || [])
        .map(
          (item) => `
          <div style="margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-weight: 500; color: #f8fafc;">
              <span>${item.name}</span>
              <span>${item.quantity}x</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; margin-top: 2px;">
              <span>@ ${formatNGN(item.unitPrice)}</span>
              <span>${formatNGN(item.unitPrice * item.quantity)}</span>
            </div>
          </div>
        `
        )
        .join('');

      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #07110f; color: #ffffff; padding: 24px; margin: 0;">
          <div style="max-width: 460px; margin: 0 auto; background-color: #0c1a17; border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; padding: 28px;">
            <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px dashed rgba(255,255,255,0.15); padding-bottom: 20px;">
              <div style="font-size: 22px; font-weight: bold; color: #34d399; letter-spacing: -0.5px;">MALT & LIME BAR</div>
              <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; margin-top: 4px;">Nigeria Operations</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">12 Admiralty Way, Lekki Phase 1, Lagos</div>
            </div>

            <div style="margin-bottom: 16px; font-size: 13px;">
              <div style="display: flex; justify-content: space-between; color: #cbd5e1; margin-bottom: 4px;">
                <span>Tab:</span> <strong>${orderObj.tabName || 'Counter'}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; color: #cbd5e1; margin-bottom: 4px;">
                <span>Date:</span> <span>${formattedDate}</span>
              </div>
              <div style="display: flex; justify-content: space-between; color: #cbd5e1;">
                <span>Receipt Ref:</span> <span style="font-family: monospace;">${orderObj.id || orderObj._id}</span>
              </div>
            </div>

            <div style="border-top: 1px dashed rgba(255,255,255,0.15); margin: 16px 0;"></div>

            <div style="margin-bottom: 16px;">
              <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #34d399; margin-bottom: 12px;">Items Ordered</div>
              ${itemsHtml}
            </div>

            <div style="border-top: 1px dashed rgba(255,255,255,0.15); margin: 16px 0;"></div>

            <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span>Subtotal</span> <span>${formatNGN(orderObj.subtotal)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span>VAT (7.5%)</span> <span>${formatNGN(orderObj.vat)}</span>
              </div>
              ${
                orderObj.discount > 0
                  ? `<div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #f87171;">
                      <span>Discount</span> <span>-${formatNGN(orderObj.discount)}</span>
                    </div>`
                  : ''
              }
              <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: #34d399; border-top: 1px dashed rgba(255,255,255,0.15); padding-top: 10px; margin-top: 8px;">
                <span>Total Paid</span> <span>${formatNGN(orderObj.total)}</span>
              </div>
            </div>

            <div style="text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px dashed rgba(255,255,255,0.15); padding-top: 16px; margin-top: 20px;">
              Paid via Cash • Thank you for your patronage!
            </div>
          </div>
        </body>
        </html>
      `;

      const smtpHost = process.env.SMTP_HOST;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (!smtpHost || !smtpUser || !smtpPass) {
        emailSimulated = true;
        emailSent = true;
        console.log('------------------- MALT & LIME RECEIPT EMAIL SIMULATION -------------------');
        console.log(`To: ${emailToUse}`);
        console.log(`Subject: Receipt for ${orderObj.tabName || 'Counter'} - Malt & Lime Bar`);
        console.log(`Content:\n${htmlBody}`);
        console.log('---------------------------------------------------------------------------');
      } else {
        try {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: { user: smtpUser, pass: smtpPass }
          });
          await transporter.sendMail({
            from: process.env.SMTP_FROM || 'Malt & Lime Bar <receipts@maltlime.ng>',
            to: emailToUse,
            subject: `Receipt for Tab: ${orderObj.tabName || 'Counter'} - Malt & Lime Bar`,
            html: htmlBody
          });
          emailSent = true;
        } catch (err) {
          console.error('SMTP sending failed, falling back to console simulation:', err.message);
          emailSimulated = true;
          emailSent = true;
        }
      }

      await store.createAuditLog({
        userId: req.user._id,
        action: 'order_receipt_email',
        entityType: 'Order',
        entityId: order._id,
        details: { recipientEmail: emailToUse, simulated: emailSimulated }
      });
    }

    let whatsAppSent = false;
    let waUrl = null;

    if (type === 'whatsapp' || type === 'both') {
      let cleanPhone = phoneToUse.replace(/\D/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '234' + cleanPhone.slice(1);
      } else if (!cleanPhone.startsWith('234') && cleanPhone.length === 10) {
        cleanPhone = '234' + cleanPhone;
      }

      const itemLines = (orderObj.items || [])
        .map((i) => `• ${i.name} (${i.quantity}x) @ ${formatNGN(i.unitPrice)} = ${formatNGN(i.quantity * i.unitPrice)}`)
        .join('\n');

      const textMsg = `🍹 *MALT & LIME BAR*
_Nigeria Operations - Official Receipt_

*Tab:* ${orderObj.tabName || 'Counter'}
*Date:* ${formattedDate}
*Receipt Ref:* ${orderObj.id || orderObj._id}

*ITEMS:*
${itemLines}

Subtotal: ${formatNGN(orderObj.subtotal)}
VAT (7.5%): ${formatNGN(orderObj.vat)}
${orderObj.discount > 0 ? `Discount: -${formatNGN(orderObj.discount)}\n` : ''}*TOTAL PAID:* ${formatNGN(orderObj.total)}
Payment: Cash

Thank you for your patronage! 🥂`;

      waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMsg)}`;
      whatsAppSent = true;

      console.log('------------------- MALT & LIME RECEIPT WHATSAPP SIMULATION -------------------');
      console.log(`To Phone: ${cleanPhone}`);
      console.log(`Message:\n${textMsg}`);
      console.log(`WhatsApp Link: ${waUrl}`);
      console.log('------------------------------------------------------------------------------');

      await store.createAuditLog({
        userId: req.user._id,
        action: 'order_receipt_whatsapp',
        entityType: 'Order',
        entityId: order._id,
        details: { recipientPhone: phoneToUse, cleanPhone, simulated: true }
      });
    }

    res.json({
      success: true,
      emailSent,
      emailSimulated,
      whatsAppSent,
      waUrl,
      recipientEmail: emailToUse || null,
      recipientPhone: phoneToUse || null,
      message: 'Receipt processed successfully'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, checkout, voidOrder, sendReceipt };
