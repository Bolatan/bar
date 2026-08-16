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

    if (data.customerEmail || data.customerPhone) {
      await store.upsertCustomerFromOrder({
        email: data.customerEmail,
        phone: data.customerPhone,
        marketingConsentEmail: !!data.marketingConsentEmail,
        marketingConsentWhatsApp: !!data.marketingConsentWhatsApp,
        total,
        paidAt: order.paidAt
      });
    }

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
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Africa/Lagos'
    });

    let emailSent = false;
    let emailSimulated = false;

    if (type === 'email' || type === 'both') {
      const itemsHtml = (orderObj.items || [])
        .map(
          (item) => `
          <div style="margin-bottom: 6px;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #111827;">
              <tr>
                <td align="left" style="font-weight: 500;">${item.name}</td>
                <td align="right" style="font-weight: 500;">${item.quantity}x</td>
              </tr>
              <tr>
                <td align="left" style="font-size: 10px; color: #555555; padding-left: 8px;">@ ${formatNGN(item.unitPrice)}</td>
                <td align="right" style="font-size: 10px; color: #555555;">${formatNGN(item.unitPrice * item.quantity)}</td>
              </tr>
            </table>
          </div>
        `
        )
        .join('');

      const optIns = [
        orderObj.marketingConsentEmail ? 'Email' : null,
        orderObj.marketingConsentWhatsApp ? 'WhatsApp' : null
      ].filter(Boolean).join(', ') || 'None';

      const hasCustomerInfo = orderObj.customerEmail || orderObj.customerPhone;

      const customerInfoHtml = hasCustomerInfo
        ? `
          <div style="border-top: 1px dashed #000000; margin: 12px 0;"></div>
          <div style="font-weight: bold; margin-bottom: 4px;">CUSTOMER INFO:</div>
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #111827;">
            ${
              orderObj.customerEmail
                ? `<tr>
                    <td align="left" style="padding-bottom: 2px;">Email:</td>
                    <td align="right" style="padding-bottom: 2px; word-break: break-all;">${orderObj.customerEmail}</td>
                  </tr>`
                : ''
            }
            ${
              orderObj.customerPhone
                ? `<tr>
                    <td align="left" style="padding-bottom: 2px;">Phone:</td>
                    <td align="right" style="padding-bottom: 2px;">${orderObj.customerPhone}</td>
                  </tr>`
                : ''
            }
            <tr>
              <td align="left" style="color: #555555;">Opt-in:</td>
              <td align="right" style="color: #555555;">${optIns}</td>
            </tr>
          </table>
        `
        : '';

      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Receipt - Malt & Lime Bar</title>
        </head>
        <body style="font-family: 'Courier New', Courier, monospace; background-color: #07110f; color: #111827; padding: 20px 10px; margin: 0;">
          <div style="max-width: 360px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #111827; line-height: 1.5;">

            <!-- Header -->
            <div style="text-align: center; font-weight: bold; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: #000000;">
              MALT &amp; LIME BAR
            </div>
            <div style="text-align: center; font-size: 11px; text-transform: uppercase; color: #333333; margin-top: 2px;">
              NIGERIA OPERATIONS
            </div>
            <div style="text-align: center; font-size: 10px; color: #555555; margin-top: 2px;">
              12 Admiralty Way, Lekki Phase 1
            </div>
            <div style="text-align: center; font-size: 10px; color: #555555;">
              Lagos, Nigeria
            </div>

            <!-- Dashed Separator -->
            <div style="border-top: 1px dashed #000000; margin: 12px 0;"></div>

            <!-- Metadata Table -->
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #111827;">
              <tr>
                <td align="left" style="padding-bottom: 2px;">Date:</td>
                <td align="right" style="padding-bottom: 2px;">${formattedDate}</td>
              </tr>
              <tr>
                <td align="left" style="padding-bottom: 2px;">Tab:</td>
                <td align="right" style="padding-bottom: 2px;">${orderObj.tabName || 'Counter'}</td>
              </tr>
              <tr>
                <td align="left">Ref:</td>
                <td align="right" style="word-break: break-all;">${orderObj.id || orderObj._id}</td>
              </tr>
            </table>

            <!-- Dashed Separator -->
            <div style="border-top: 1px dashed #000000; margin: 12px 0;"></div>

            <!-- Items -->
            <div style="font-weight: bold; margin-bottom: 6px;">ITEMS:</div>
            ${itemsHtml}

            <!-- Dashed Separator -->
            <div style="border-top: 1px dashed #000000; margin: 12px 0;"></div>

            <!-- Totals Table -->
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #111827;">
              <tr>
                <td align="left" style="padding-bottom: 4px;">SUBTOTAL:</td>
                <td align="right" style="padding-bottom: 4px;">${formatNGN(orderObj.subtotal)}</td>
              </tr>
              <tr>
                <td align="left" style="padding-bottom: 4px;">VAT (7.5%):</td>
                <td align="right" style="padding-bottom: 4px;">${formatNGN(orderObj.vat)}</td>
              </tr>
              ${
                orderObj.discount > 0
                  ? `<tr>
                      <td align="left" style="padding-bottom: 4px;">DISCOUNT:</td>
                      <td align="right" style="padding-bottom: 4px;">-${formatNGN(orderObj.discount)}</td>
                    </tr>`
                  : ''
              }
            </table>

            <div style="border-top: 1px dashed #000000; margin: 8px 0 6px 0;"></div>

            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; font-family: 'Courier New', Courier, monospace; font-size: 14px; font-weight: bold; color: #000000;">
              <tr>
                <td align="left">TOTAL:</td>
                <td align="right">${formatNGN(orderObj.total)}</td>
              </tr>
            </table>

            ${customerInfoHtml}

            <!-- Dashed Separator -->
            <div style="border-top: 1px dashed #000000; margin: 12px 0;"></div>

            <!-- Footer -->
            <div style="text-align: center; font-weight: bold; font-size: 11px; text-transform: uppercase;">
              PAID VIA CASH
            </div>
            <div style="text-align: center; font-size: 11px; margin-top: 8px;">
              Thank you for your patronage!
            </div>
            <div style="text-align: center; font-size: 9px; color: #666666; margin-top: 6px;">
              Malt &amp; Lime - Nigerian hospitality rhythm
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

      const textMsg = `🧾 *MALT & LIME BAR*
_Nigeria Operations - Thermal Receipt_
12 Admiralty Way, Lekki Phase 1, Lagos

--------------------------------
*Date:* ${formattedDate}
*Tab:* ${orderObj.tabName || 'Counter'}
*Ref:* ${orderObj.id || orderObj._id}
--------------------------------
*ITEMS:*
${itemLines}
--------------------------------
SUBTOTAL: ${formatNGN(orderObj.subtotal)}
VAT (7.5%): ${formatNGN(orderObj.vat)}
${orderObj.discount > 0 ? `DISCOUNT: -${formatNGN(orderObj.discount)}\n` : ''}*TOTAL PAID:* ${formatNGN(orderObj.total)}
--------------------------------
PAID VIA CASH
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
