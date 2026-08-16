const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { store } = require('../store');

const router = express.Router();

// Only owner and manager are allowed to access and manage customer contacts
router.use(requireAuth, requireRole('owner', 'manager'));

/**
 * GET /api/customers
 * List all customer contacts
 */
router.get('/', async (req, res, next) => {
  try {
    const customers = await store.findCustomers();
    res.json({ customers });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/customers
 * Add a new customer contact
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, marketingConsentEmail, marketingConsentWhatsApp, notes } = req.body;

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').trim();

    if (!cleanEmail && !cleanPhone) {
      return res.status(400).json({ error: 'At least an email address or phone number is required' });
    }

    const customer = await store.createCustomer({
      name: (name || '').trim() || (cleanEmail ? cleanEmail.split('@')[0] : 'Guest'),
      email: cleanEmail,
      phone: cleanPhone,
      marketingConsentEmail: marketingConsentEmail !== false,
      marketingConsentWhatsApp: marketingConsentWhatsApp !== false,
      notes: (notes || '').trim()
    });

    // Audit log
    await store.createAuditLog({
      userId: req.user._id,
      action: 'customer_create',
      entityType: 'Customer',
      entityId: customer.id || customer._id,
      details: { email: cleanEmail, phone: cleanPhone, name: customer.name }
    });

    res.status(201).json({ customer });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/customers/:id
 * Update an existing customer contact
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone, marketingConsentEmail, marketingConsentWhatsApp, notes } = req.body;

    const customer = await store.findCustomerById(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (marketingConsentEmail !== undefined) updateData.marketingConsentEmail = !!marketingConsentEmail;
    if (marketingConsentWhatsApp !== undefined) updateData.marketingConsentWhatsApp = !!marketingConsentWhatsApp;
    if (notes !== undefined) updateData.notes = notes.trim();

    const updated = await store.updateCustomer(id, updateData);

    // Audit log
    await store.createAuditLog({
      userId: req.user._id,
      action: 'customer_update',
      entityType: 'Customer',
      entityId: id,
      details: updateData
    });

    res.json({ customer: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/customers/:id
 * Delete a customer contact
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const customer = await store.findCustomerById(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await store.deleteCustomer(id);

    // Audit log
    await store.createAuditLog({
      userId: req.user._id,
      action: 'customer_delete',
      entityType: 'Customer',
      entityId: id,
      details: { email: customer.email, phone: customer.phone, name: customer.name }
    });

    res.json({ message: 'Customer removed successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
