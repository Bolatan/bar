'use client';

import { useState, useEffect, useMemo } from 'react';
import { api, type Order } from '@/lib/api';
import {
  Users, Mail, MessageSquare, Search, CheckSquare, Square,
  Send, AlertCircle, CheckCircle2, ChevronRight, ExternalLink,
  Megaphone, ArrowRight, RefreshCw, Star, Coins
} from 'lucide-react';

const money = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });

const promoText = `*🚀 Boost Your Bar’s Profits & Stop Inventory Leakage in Lagos! * 🍹🇳🇬

Are you tired of staff pocketing cash, manual stock counting, and losing track of expensive bottles of Hennessy or Star Lager?

Say hello to *Malt & Lime* — the ultimate bar management workspace designed specifically for *Lagos bar and lounge operations*!

Whether your lounge is in Lekki, Ikeja, Victoria Island, or Surulere, *Malt & Lime* gives you complete control over your business in real-time.

---

### *Why Lagos Bar Owners Love Malt & Lime:*

*🔌 100% Offline-Resilient POS*
Internet went down? NEPA/Grid took a hit? No problem! Our POS keeps taking orders and printing receipts *offline*, automatically syncing everything back once connection is restored.

*📉 Zero Stock-Leakage Inventory Tracking*
Get real-time low-stock alerts, track stock adjustments, record spoilage, and trace every bottle from delivery to sale. Never run out of your customers' favorite drinks!

*🧾 Local Lagos Tax & Receipts Compliance*
- Includes automatic *7.5% Lagos State VAT* calculations during checkout.
- High-fidelity thermal receipt printouts for your customers with interactive simulation.
- Support for Cash, Card, Bank Transfer, or Split payments.

*🕵️ Owner-Exclusive Audit Ledger & Security*
Track sensitive staff actions (discounts, voids, and stock adjustments) via a secure, owner-only ledger. Managers need a secure 4-digit PIN to authorize any voided orders!

*📊 Beautiful Business Intelligence Reports*
View sales revenue, inventory valuation, and top-selling items with daily, weekly, or monthly performance breakdown right from your dashboard.

---

*🔥 SPECIAL LAUNCH OFFER:* Get started with Malt & Lime today and secure your bar's profits. No more manual calculations. No more stock discrepancies.

*👉 Click here to schedule a live demo or provision your workspace:*
_https://maltlime.ng/demo_

*Have questions?* Reply directly to this chat and speak with our Lagos-based support team! 📲
#MaltAndLime #LagosNightlife #BarManagement #LagosBars #LoungeManager`;

interface Contact {
  email: string;
  phone: string;
  marketingConsentEmail: boolean;
  marketingConsentWhatsApp: boolean;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string;
}

export default function Campaigns() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filtering
  const [query, setQuery] = useState('');
  const [consentFilter, setConsentFilter] = useState<'all' | 'email' | 'whatsapp'>('all');

  // Selected contacts
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Composer Tabs
  const [activeTab, setActiveTab] = useState<'email' | 'whatsapp'>('email');

  // Email form state
  const [emailSubject, setEmailSubject] = useState('Exclusive Offers & Weekend Vibes at Malt & Lime! 🍹');
  const [emailBody, setEmailBody] = useState(
    `<h2>Thank you for being a valued guest! 🇳🇬</h2>\n` +
    `<p>We are delighted to have you as part of our Lagos bar & lounge community.</p>\n` +
    `<p>To thank you for your continued patronage, enjoy 10% off your next plate of Peppered Gizzard or Chicken Wings when you order this weekend!</p>\n` +
    `<p>Simply show this email to your server during checkout.</p>\n` +
    `<p>Best regards,<br/><b>The Malt & Lime Team</b></p>`
  );

  // WhatsApp form state
  const [whatsappMessage, setWhatsappMessage] = useState(
    `Hello! Thank you for hanging out with us at Malt & Lime Lagos. 🇳🇬\n\n` +
    `Show this message to your server on your next visit to get a free drink with any food order! 🍻\n\n` +
    `Valid Lekki / Ikeja locations this week only. Standard T&Cs apply.`
  );

  const [busy, setBusy] = useState(false);

  // Fetch collected contacts
  const fetchContacts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.campaigns.contacts();
      setContacts(res.contacts || []);

      // Auto-select all contacts that have email consent initially if tab is email, or whatsapp if tab is whatsapp
      const initialSelected = new Set<string>();
      (res.contacts || []).forEach((c: Contact) => {
        const key = c.email || c.phone;
        if (key) {
          initialSelected.add(key);
        }
      });
      setSelectedKeys(initialSelected);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customer contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  // Filtered contacts list
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const q = query.trim().toLowerCase();
      const matchesSearch =
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q);

      if (!matchesSearch) return false;

      if (consentFilter === 'email') return c.marketingConsentEmail;
      if (consentFilter === 'whatsapp') return c.marketingConsentWhatsApp;
      return true;
    });
  }, [contacts, query, consentFilter]);

  // Handle master check/uncheck
  const isAllFilteredSelected = useMemo(() => {
    if (filteredContacts.length === 0) return false;
    return filteredContacts.every(c => selectedKeys.has(c.email || c.phone));
  }, [filteredContacts, selectedKeys]);

  const toggleSelectAll = () => {
    const nextSelected = new Set(selectedKeys);
    if (isAllFilteredSelected) {
      // Unselect all in the filtered view
      filteredContacts.forEach(c => {
        nextSelected.delete(c.email || c.phone);
      });
    } else {
      // Select all in the filtered view
      filteredContacts.forEach(c => {
        const key = c.email || c.phone;
        if (key) nextSelected.add(key);
      });
    }
    setSelectedKeys(nextSelected);
  };

  const toggleSelectOne = (key: string) => {
    const nextSelected = new Set(selectedKeys);
    if (nextSelected.has(key)) {
      nextSelected.delete(key);
    } else {
      nextSelected.add(key);
    }
    setSelectedKeys(nextSelected);
  };

  // Recipient lists for actual dispatch
  const selectedEmailRecipients = useMemo(() => {
    return contacts
      .filter(c => selectedKeys.has(c.email || c.phone) && c.email && c.marketingConsentEmail)
      .map(c => c.email);
  }, [contacts, selectedKeys]);

  const selectedWhatsAppRecipients = useMemo(() => {
    return contacts
      .filter(c => selectedKeys.has(c.email || c.phone) && c.phone && c.marketingConsentWhatsApp)
      .map(c => c.phone);
  }, [contacts, selectedKeys]);

  // Dispatch Email Campaign
  const handleSendEmailCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmailRecipients.length === 0) {
      setError('Please select at least one contact with active Email Marketing Consent');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.campaigns.sendEmail({
        recipients: selectedEmailRecipients,
        subject: emailSubject,
        body: emailBody
      });
      setSuccess(res.message || `Campaign sent successfully to ${selectedEmailRecipients.length} recipients!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email campaign');
    } finally {
      setBusy(false);
    }
  };

  // Dispatch WhatsApp Simulated Campaign
  const handleSendWhatsAppCampaign = async () => {
    if (selectedWhatsAppRecipients.length === 0) {
      setError('Please select at least one contact with active WhatsApp Marketing Consent');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.campaigns.sendWhatsApp({
        recipients: selectedWhatsAppRecipients,
        message: whatsappMessage
      });
      setSuccess(res.message || `WhatsApp campaign simulated successfully for ${selectedWhatsAppRecipients.length} numbers!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send WhatsApp campaign');
    } finally {
      setBusy(false);
    }
  };

  // Quick Action: Send via WhatsApp Web Deep Link
  const handleOpenWhatsAppDeepLink = (phone: string) => {
    let normalizedPhone = phone.replace(/\s+/g, '').replace(/[+\-]/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '234' + normalizedPhone.slice(1);
    } else if (!normalizedPhone.startsWith('234') && normalizedPhone.length === 10) {
      normalizedPhone = '234' + normalizedPhone;
    }
    const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(normalizedPhone)}&text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, '_blank');
  };

  // Quick action to set the official promo copy
  const loadPromoScript = () => {
    setWhatsappMessage(promoText);
    setSuccess('Official Lagos Bar Pitch Script loaded successfully! 🍹🇳🇬');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Analytics/Counts
  const totalContactsCount = contacts.length;
  const emailConsentCount = contacts.filter(c => c.marketingConsentEmail).length;
  const whatsappConsentCount = contacts.filter(c => c.marketingConsentWhatsApp).length;
  const totalRevenueCollected = useMemo(() => contacts.reduce((sum, c) => sum + c.totalSpent, 0), [contacts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-emerald-300">Customer engagement Hub</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Marketing Campaigns</h1>
          <p className="mt-2 text-sm text-slate-400">
            Reach out directly to collected customer contacts with targeted Email campaigns (Nodemailer) and WhatsApp broadcasts.
          </p>
        </div>
        <button
          onClick={fetchContacts}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white/[0.04] px-4 text-sm font-semibold text-slate-300 hover:bg-white/[0.08] hover:text-white transition"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh list
        </button>
      </div>

      {/* Success/Error Notices */}
      {success && (
        <div className="flex gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
          <AlertCircle size={18} className="shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="panel p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Total contacts</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{totalContactsCount}</span>
            <span className="text-xs text-slate-500">Guests collected</span>
          </div>
        </div>

        <div className="panel p-5 border-l border-l-sky-500/30">
          <p className="text-xs text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
            <Mail size={12} /> Email consents
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-sky-300">{emailConsentCount}</span>
            <span className="text-xs text-slate-500">Opted in ({totalContactsCount > 0 ? Math.round((emailConsentCount / totalContactsCount) * 100) : 0}%)</span>
          </div>
        </div>

        <div className="panel p-5 border-l border-l-emerald-500/30">
          <p className="text-xs text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare size={12} /> WhatsApp consents
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-300">{whatsappConsentCount}</span>
            <span className="text-xs text-slate-500">Opted in ({totalContactsCount > 0 ? Math.round((whatsappConsentCount / totalContactsCount) * 100) : 0}%)</span>
          </div>
        </div>

        <div className="panel p-5 border-l border-l-purple-500/30">
          <p className="text-xs text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
            <Coins size={12} /> Total customer LTV
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-purple-300 truncate max-w-[180px]" title={money.format(totalRevenueCollected)}>
              {money.format(totalRevenueCollected)}
            </span>
            <span className="text-xs text-slate-500">Sales value</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Contact Directory */}
        <div className="panel overflow-hidden flex flex-col h-[650px]">
          <div className="p-4 border-b border-white/5 space-y-4 shrink-0">
            <div>
              <h2 className="font-semibold text-white">Contact directory</h2>
              <p className="text-xs text-slate-500">Filter, select and prepare campaigns for your customers.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="field pl-9 text-xs"
                  placeholder="Search email, phone..."
                />
              </div>

              <div className="flex gap-1 bg-black/40 border border-white/5 rounded-lg p-0.5">
                <button
                  onClick={() => setConsentFilter('all')}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition ${consentFilter === 'all' ? 'bg-emerald-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setConsentFilter('email')}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition flex items-center gap-1 ${consentFilter === 'email' ? 'bg-emerald-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                >
                  <Mail size={10} /> Email
                </button>
                <button
                  onClick={() => setConsentFilter('whatsapp')}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition flex items-center gap-1 ${consentFilter === 'whatsapp' ? 'bg-emerald-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                >
                  <MessageSquare size={10} /> WhatsApp
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-12 text-center text-slate-500 text-sm">Loading contacts list...</div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">No contacts match the filters.</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-white/[0.01] text-slate-500 uppercase tracking-wider text-[10px] sticky top-0 border-b border-white/5">
                  <tr>
                    <th className="px-4 py-3 text-center w-10">
                      <button
                        onClick={toggleSelectAll}
                        className="text-slate-400 hover:text-white inline-flex align-middle"
                        title={isAllFilteredSelected ? "Unselect all" : "Select all"}
                      >
                        {isAllFilteredSelected ? <CheckSquare size={16} className="text-emerald-400" /> : <Square size={16} />}
                      </button>
                    </th>
                    <th className="px-4 py-3">Contact details</th>
                    <th className="px-4 py-3">Consent</th>
                    <th className="px-4 py-3 text-right">Orders / Spent</th>
                    <th className="px-4 py-3 text-right">Latest visit</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact, idx) => {
                    const key = contact.email || contact.phone;
                    const isSelected = selectedKeys.has(key);
                    return (
                      <tr
                        key={idx}
                        className={`border-b border-white/5 hover:bg-white/[0.01] transition ${isSelected ? 'bg-emerald-400/[0.02]' : ''}`}
                      >
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleSelectOne(key)}
                            className="text-slate-400 hover:text-white inline-flex align-middle"
                          >
                            {isSelected ? <CheckSquare size={16} className="text-emerald-400" /> : <Square size={16} />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-200 truncate max-w-[150px]">
                            {contact.email || <span className="text-slate-600 italic">No email</span>}
                          </div>
                          <div className="text-slate-500 font-mono mt-0.5">{contact.phone || 'No phone'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${contact.marketingConsentEmail ? 'bg-sky-400/10 text-sky-300' : 'bg-slate-800 text-slate-500 opacity-60'}`}
                              title={contact.marketingConsentEmail ? "Subscribed to Email" : "No Email Consent"}
                            >
                              Email
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${contact.marketingConsentWhatsApp ? 'bg-emerald-400/10 text-emerald-300' : 'bg-slate-800 text-slate-500 opacity-60'}`}
                              title={contact.marketingConsentWhatsApp ? "Subscribed to WhatsApp" : "No WhatsApp Consent"}
                            >
                              WhatsApp
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-semibold text-slate-300">{contact.orderCount} order{contact.orderCount !== 1 ? 's' : ''}</div>
                          <div className="text-emerald-400 font-mono mt-0.5">{money.format(contact.totalSpent)}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 font-mono">
                          {contact.lastOrderDate ? new Date(contact.lastOrderDate).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', timeZone: 'Africa/Lagos' }) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-4 bg-white/[0.01] border-t border-white/5 text-xs text-slate-500 shrink-0 flex justify-between items-center">
            <span>
              Selected: <strong className="text-emerald-400">{selectedKeys.size}</strong> / {totalContactsCount} total
            </span>
            <span>
              Matches filter: {filteredContacts.length}
            </span>
          </div>
        </div>

        {/* Campaign composer & actions */}
        <div className="panel p-6 flex flex-col h-[650px] overflow-hidden">
          {/* Tab selectors */}
          <div className="flex border-b border-white/5 pb-4 mb-4 gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('email')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${activeTab === 'email' ? 'bg-sky-400/10 text-sky-300 border border-sky-400/20' : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'}`}
            >
              <Mail size={16} />
              Nodemailer Campaign
            </button>
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${activeTab === 'whatsapp' ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20' : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'}`}
            >
              <MessageSquare size={16} />
              WhatsApp Broadcaster
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {activeTab === 'email' ? (
              <form onSubmit={handleSendEmailCampaign} className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-1.5">
                    <Mail size={18} className="text-sky-300" />
                    Configure Email (Nodemailer SMTP)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Emails will be delivered in bulk via local nodemailer configurations. Ensure SMTP environment variables are configured.
                  </p>
                </div>

                <div className="p-3.5 bg-sky-500/5 rounded-xl border border-sky-500/10 space-y-1 text-xs">
                  <div className="flex justify-between font-semibold text-sky-300">
                    <span>Recipients with Email consent selected:</span>
                    <span>{selectedEmailRecipients.length} recipients</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Contacts must have provided an email address AND checked the &quot;Email Marketing Consent&quot; box at checkout to qualify.
                  </p>
                </div>

                <label className="block text-xs font-semibold text-slate-300">
                  Email subject line
                  <input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    required
                    className="field mt-2 text-xs"
                    placeholder="e.g. Free Star Lager this Friday!"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-300">
                  Email content body (HTML allowed)
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    required
                    rows={12}
                    className="field mt-2 font-mono text-[11px] leading-relaxed"
                    placeholder="<h1>Promo title</h1><p>Promo content here...</p>"
                  />
                </label>

                <button
                  type="submit"
                  disabled={busy || selectedEmailRecipients.length === 0}
                  className="button-primary w-full bg-sky-500 hover:bg-sky-600 border-none text-white py-3 font-semibold text-sm rounded-xl flex items-center justify-center gap-2"
                >
                  {busy ? 'Dispatching...' : `✉️ Dispatch Campaign to ${selectedEmailRecipients.length} Guest${selectedEmailRecipients.length !== 1 ? 's' : ''}`}
                  <Send size={15} />
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-1.5">
                    <MessageSquare size={18} className="text-emerald-300" />
                    WhatsApp marketing broadcaster
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Simulate broadcasts to your active lists or trigger individual instant Web messaging.
                  </p>
                </div>

                <div className="p-3.5 bg-emerald-500/5 rounded-xl border border-emerald-500/10 space-y-1 text-xs">
                  <div className="flex justify-between font-semibold text-emerald-300">
                    <span>Recipients with WhatsApp consent selected:</span>
                    <span>{selectedWhatsAppRecipients.length} recipients</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Contacts must have provided a phone number AND checked the &quot;WhatsApp Marketing Consent&quot; box at checkout to qualify.
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Message content text</label>
                  <button
                    type="button"
                    onClick={loadPromoScript}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-400/10 px-2.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-400/20 transition"
                  >
                    <Star size={12} /> Load Lagos Pitch Script
                  </button>
                </div>

                <textarea
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  required
                  rows={8}
                  className="field text-xs font-sans leading-relaxed"
                  placeholder="Type your WhatsApp broadcast message..."
                />

                <div className="pt-2 border-t border-white/5 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-300">Action choice:</h4>
                    <p className="text-[11px] text-slate-500">Choose how you want to send this broadcast campaign.</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleSendWhatsAppCampaign}
                      disabled={busy || selectedWhatsAppRecipients.length === 0}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 text-xs font-semibold text-white transition hover:bg-purple-500 disabled:opacity-40"
                    >
                      <Megaphone size={14} />
                      Simulate Bulk Send ({selectedWhatsAppRecipients.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (selectedWhatsAppRecipients.length === 0) {
                          alert("Please select at least one contact with WhatsApp consent!");
                          return;
                        }
                        alert("Scroll down to the list below and click the green arrow to open each individual WhatsApp deep link.");
                      }}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white/[0.04] border border-white/5 px-4 text-xs font-semibold text-slate-300 hover:bg-white/[0.08] transition"
                    >
                      <ArrowRight size={14} />
                      Send via Web Deep-Link
                    </button>
                  </div>
                </div>

                {/* Individual Direct Senders */}
                {selectedWhatsAppRecipients.length > 0 && (
                  <div className="border-t border-white/5 pt-4 space-y-2">
                    <h4 className="text-xs font-bold text-slate-400">Direct instant send directory:</h4>
                    <div className="space-y-2 max-h-36 overflow-y-auto rounded-lg border border-white/5 bg-black/20 p-2">
                      {contacts
                        .filter(c => selectedKeys.has(c.email || c.phone) && c.phone && c.marketingConsentWhatsApp)
                        .map((c, i) => (
                          <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                            <span className="font-mono text-slate-300">{c.phone}</span>
                            <button
                              onClick={() => handleOpenWhatsAppDeepLink(c.phone)}
                              className="text-emerald-400 hover:text-emerald-300 transition text-[11px] flex items-center gap-1 font-semibold"
                            >
                              Open Chat <ExternalLink size={12} />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
