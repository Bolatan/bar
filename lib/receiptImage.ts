export function generateReceiptSVG(orderObj: any): string {
  const formatNGN = (amt: number) =>
    '₦' + Number(amt || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
  const formattedDate = new Date(orderObj.paidAt || orderObj.createdAt || Date.now()).toLocaleString('en-NG', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  });

  const width = 380;
  const padding = 20;
  const items = orderObj.items || [];

  let currentY = 150;
  let itemsSvg = '';

  items.forEach((item: any) => {
    const displayName = item.name.length > 26 ? item.name.slice(0, 24) + '...' : item.name;
    itemsSvg += `
      <text x="${padding}" y="${currentY}" font-family="monospace, courier, sans-serif" font-size="12" font-weight="bold" fill="#0f172a">${escapeXml(displayName)}</text>
      <text x="${width - padding}" y="${currentY}" font-family="monospace, courier, sans-serif" font-size="12" font-weight="bold" fill="#0f172a" text-anchor="end">${item.quantity}x</text>
      <text x="${padding + 8}" y="${currentY + 16}" font-family="monospace, courier, sans-serif" font-size="11" fill="#475569">@ ${formatNGN(item.unitPrice)}</text>
      <text x="${width - padding}" y="${currentY + 16}" font-family="monospace, courier, sans-serif" font-size="11" fill="#475569" text-anchor="end">${formatNGN(item.quantity * item.unitPrice)}</text>
    `;
    currentY += 36;
  });

  currentY += 6;
  let totalsSvg = `<line x1="${padding}" y1="${currentY}" x2="${width - padding}" y2="${currentY}" stroke="#94a3b8" stroke-dasharray="4,4" stroke-width="1" />`;
  currentY += 20;

  totalsSvg += `
    <text x="${padding}" y="${currentY}" font-family="monospace, courier, sans-serif" font-size="12" fill="#334155">SUBTOTAL:</text>
    <text x="${width - padding}" y="${currentY}" font-family="monospace, courier, sans-serif" font-size="12" fill="#334155" text-anchor="end">${formatNGN(orderObj.subtotal)}</text>
  `;
  currentY += 18;

  totalsSvg += `
    <text x="${padding}" y="${currentY}" font-family="monospace, courier, sans-serif" font-size="12" fill="#334155">VAT (7.5%):</text>
    <text x="${width - padding}" y="${currentY}" font-family="monospace, courier, sans-serif" font-size="12" fill="#334155" text-anchor="end">${formatNGN(orderObj.vat)}</text>
  `;
  currentY += 18;

  if (orderObj.discount > 0) {
    totalsSvg += `
      <text x="${padding}" y="${currentY}" font-family="monospace, courier, sans-serif" font-size="12" fill="#dc2626">DISCOUNT:</text>
      <text x="${width - padding}" y="${currentY}" font-family="monospace, courier, sans-serif" font-size="12" fill="#dc2626" text-anchor="end">-${formatNGN(orderObj.discount)}</text>
    `;
    currentY += 18;
  }

  currentY += 4;
  totalsSvg += `<line x1="${padding}" y1="${currentY}" x2="${width - padding}" y2="${currentY}" stroke="#0f172a" stroke-width="1.5" />`;
  currentY += 20;

  totalsSvg += `
    <text x="${padding}" y="${currentY}" font-family="monospace, courier, sans-serif" font-size="14" font-weight="bold" fill="#0f172a">TOTAL:</text>
    <text x="${width - padding}" y="${currentY}" font-family="monospace, courier, sans-serif" font-size="14" font-weight="bold" fill="#0f172a" text-anchor="end">${formatNGN(orderObj.total)}</text>
  `;
  currentY += 20;

  if (orderObj.customerEmail || orderObj.customerPhone) {
    totalsSvg += `<line x1="${padding}" y1="${currentY}" x2="${width - padding}" y2="${currentY}" stroke="#94a3b8" stroke-dasharray="4,4" stroke-width="1" />`;
    currentY += 18;
    totalsSvg += `<text x="${padding}" y="${currentY}" font-family="monospace, courier, sans-serif" font-size="11" font-weight="bold" fill="#0f172a">CUSTOMER INFO:</text>`;
    currentY += 16;
    if (orderObj.customerEmail) {
      totalsSvg += `<text x="${padding}" y="${currentY}" font-family="monospace, courier, sans-serif" font-size="10" fill="#475569">Email: ${escapeXml(orderObj.customerEmail)}</text>`;
      currentY += 14;
    }
    if (orderObj.customerPhone) {
      totalsSvg += `<text x="${padding}" y="${currentY}" font-family="monospace, courier, sans-serif" font-size="10" fill="#475569">Phone: ${escapeXml(orderObj.customerPhone)}</text>`;
      currentY += 14;
    }
    const consents = [
      orderObj.marketingConsentEmail ? 'Email' : null,
      orderObj.marketingConsentWhatsApp ? 'WhatsApp' : null,
    ].filter(Boolean).join(', ') || 'None';
    totalsSvg += `<text x="${padding}" y="${currentY}" font-family="monospace, courier, sans-serif" font-size="10" fill="#64748b">Opt-in: ${escapeXml(consents)}</text>`;
    currentY += 18;
  }

  totalsSvg += `<line x1="${padding}" y1="${currentY}" x2="${width - padding}" y2="${currentY}" stroke="#94a3b8" stroke-dasharray="4,4" stroke-width="1" />`;
  currentY += 22;

  totalsSvg += `
    <text x="${width / 2}" y="${currentY}" font-family="monospace, courier, sans-serif" font-size="11" font-weight="bold" fill="#0f172a" text-anchor="middle">PAID VIA CASH</text>
    <text x="${width / 2}" y="${currentY + 16}" font-family="monospace, courier, sans-serif" font-size="11" fill="#475569" text-anchor="middle">Thank you for your patronage!</text>
  `;
  currentY += 36;

  const totalHeight = currentY + padding;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <rect x="8" y="8" width="${width - 16}" height="${totalHeight - 16}" fill="#fafafa" stroke="#e2e8f0" stroke-width="1" rx="6" />
    <text x="${width / 2}" y="38" font-family="monospace, courier, sans-serif" font-size="15" font-weight="bold" fill="#0f172a" text-anchor="middle">MALT &amp; LIME BAR</text>
    <text x="${width / 2}" y="54" font-family="monospace, courier, sans-serif" font-size="10" font-weight="bold" fill="#475569" text-anchor="middle">NIGERIA OPERATIONS</text>
    <text x="${width / 2}" y="68" font-family="monospace, courier, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">12 Admiralty Way, Lekki Phase 1, Lagos</text>
    <line x1="${padding}" y1="80" x2="${width - padding}" y2="80" stroke="#94a3b8" stroke-dasharray="4,4" stroke-width="1" />
    <text x="${padding}" y="98" font-family="monospace, courier, sans-serif" font-size="11" fill="#334155">Date: ${formattedDate}</text>
    <text x="${padding}" y="112" font-family="monospace, courier, sans-serif" font-size="11" fill="#334155">Tab: ${escapeXml(orderObj.tabName || 'Counter')}</text>
    <text x="${padding}" y="126" font-family="monospace, courier, sans-serif" font-size="11" fill="#334155">Ref: ${escapeXml(orderObj.id || orderObj._id)}</text>
    <line x1="${padding}" y1="136" x2="${width - padding}" y2="136" stroke="#94a3b8" stroke-dasharray="4,4" stroke-width="1" />
    ${itemsSvg}
    ${totalsSvg}
  </svg>`;
}

function escapeXml(unsafe: string): string {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateReceiptPngDataUrl(orderObj: any): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const svgString = generateReceiptSVG(orderObj);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 380;
        canvas.height = img.height || 500;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(blobUrl);
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(blobUrl);
        const pngDataUrl = canvas.toDataURL('image/png');
        resolve(pngDataUrl);
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(blobUrl);
        reject(err);
      };
      img.src = blobUrl;
    } catch (err) {
      reject(err);
    }
  });
}
