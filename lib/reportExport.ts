import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface SalesData {
  period: string;
  orderCount: number;
  revenue: number;
  vat: number;
  byCategory: { category: string; total: number }[];
  topProducts: { name: string; quantity: number }[];
  byStaff?: { name: string; total: number }[];
}

export interface ValuationData {
  totalValue: number;
  items: { name: string; category: string; stockQuantity: number; costPrice: number; value: number }[];
}

export interface LowStockData {
  products: { id: string; name: string; category: string; stockQuantity: number; reorderThreshold: number; unit: string }[];
}

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);
};

// ==========================================
// EXCEL EXPORTS (.xlsx)
// ==========================================

export function exportSalesToExcel(data: SalesData) {
  const wb = XLSX.utils.book_new();

  // Summary Sheet
  const summaryRows = [
    ['MALT & LIME - SALES REPORT'],
    [`Report Period: ${data.period.toUpperCase()}`],
    [`Generated Date: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}`],
    [],
    ['Metric', 'Value'],
    ['Total Revenue', formatMoney(data.revenue)],
    ['Orders Cleared', data.orderCount],
    ['7.5% Federal VAT', formatMoney(data.vat)],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  // Sales by Category Sheet
  const categoryRows = [
    ['Category', 'Total Sales (NGN)'],
    ...data.byCategory.map((c) => [c.category, c.total]),
  ];
  const categoryWs = XLSX.utils.aoa_to_sheet(categoryRows);
  XLSX.utils.book_append_sheet(wb, categoryWs, 'Sales by Category');

  // Top Products Sheet
  const productRows = [
    ['Rank', 'Product Name', 'Units Sold'],
    ...data.topProducts.map((p, idx) => [`#${idx + 1}`, p.name, p.quantity]),
  ];
  const productWs = XLSX.utils.aoa_to_sheet(productRows);
  XLSX.utils.book_append_sheet(wb, productWs, 'Top Moving Products');

  XLSX.writeFile(wb, `MaltLime_Sales_Report_${data.period}_${Date.now()}.xlsx`);
}

export function exportValuationToExcel(data: ValuationData) {
  const wb = XLSX.utils.book_new();

  const rows = [
    ['MALT & LIME - INVENTORY VALUATION REPORT'],
    [`Total Stock Value: ${formatMoney(data.totalValue)}`],
    [`Generated Date: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}`],
    [],
    ['Item Name', 'Category', 'Stock Quantity', 'Unit Cost Price (NGN)', 'Total Value (NGN)'],
    ...data.items.map((item) => [
      item.name,
      item.category,
      item.stockQuantity,
      item.costPrice,
      item.value,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Stock Valuation');
  XLSX.writeFile(wb, `MaltLime_Stock_Valuation_${Date.now()}.xlsx`);
}

export function exportLowStockToExcel(data: LowStockData) {
  const wb = XLSX.utils.book_new();

  const rows = [
    ['MALT & LIME - LOW STOCK & REORDER REPORT'],
    [`Items Needing Reorder: ${data.products.length}`],
    [`Generated Date: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}`],
    [],
    ['Item Name', 'Category', 'Current Stock', 'Reorder Point', 'Unit', 'Suggested Reorder Qty'],
    ...data.products.map((p) => [
      p.name,
      p.category,
      p.stockQuantity,
      p.reorderThreshold,
      p.unit,
      p.reorderThreshold * 2,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Low Stock Warnings');
  XLSX.writeFile(wb, `MaltLime_Low_Stock_${Date.now()}.xlsx`);
}

// ==========================================
// PDF EXPORTS (.pdf)
// ==========================================

export function exportSalesToPdf(data: SalesData) {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('MALT & LIME', 14, 18);
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(`Sales Analysis Report (${data.period.toUpperCase()})`, 70, 18);

  // Metrics
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}`, 14, 38);

  autoTable(doc, {
    startY: 42,
    head: [['Metric', 'Amount / Value']],
    body: [
      ['Total Period Revenue', formatMoney(data.revenue)],
      ['Orders Cleared', `${data.orderCount} checkouts`],
      ['7.5% Federal VAT', formatMoney(data.vat)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Category Table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Sales Breakdown by Category', 14, finalY);

  autoTable(doc, {
    startY: finalY + 4,
    head: [['Category', 'Total Revenue']],
    body: data.byCategory.length
      ? data.byCategory.map((c) => [c.category, formatMoney(c.total)])
      : [['No data', '-']],
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
  });

  const finalY2 = (doc as any).lastAutoTable.finalY + 10;

  // Top Moving Items
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Top Moving Items', 14, finalY2);

  autoTable(doc, {
    startY: finalY2 + 4,
    head: [['Rank', 'Item Name', 'Units Sold']],
    body: data.topProducts.length
      ? data.topProducts.map((p, idx) => [`#${idx + 1}`, p.name, `${p.quantity} units`])
      : [['-', 'No items sold', '-']],
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
  });

  doc.save(`MaltLime_Sales_Report_${data.period}_${Date.now()}.pdf`);
}

export function exportValuationToPdf(data: ValuationData) {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(52, 211, 153);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('MALT & LIME', 14, 18);
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('Stock Valuation Report', 80, 18);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(`Total Capital Tied in Stock: ${formatMoney(data.totalValue)}`, 14, 38);
  doc.text(`Generated: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}`, 14, 44);

  autoTable(doc, {
    startY: 50,
    head: [['Drink / Item', 'Category', 'Units on Hand', 'Unit Cost Price', 'Total Value']],
    body: data.items.map((i) => [
      i.name,
      i.category,
      i.stockQuantity.toString(),
      formatMoney(i.costPrice),
      formatMoney(i.value),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
  });

  doc.save(`MaltLime_Stock_Valuation_${Date.now()}.pdf`);
}

export function exportLowStockToPdf(data: LowStockData) {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(251, 146, 60); // orange-400
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('MALT & LIME', 14, 18);
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('Low Stock & Reorder Report', 75, 18);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(`Items Below Safety Threshold: ${data.products.length}`, 14, 38);
  doc.text(`Generated: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}`, 14, 44);

  autoTable(doc, {
    startY: 50,
    head: [['Drink / Item', 'Category', 'In Stock', 'Reorder Point', 'Recommended Restock']],
    body: data.products.length
      ? data.products.map((p) => [
          p.name,
          p.category,
          p.stockQuantity.toString(),
          p.reorderThreshold.toString(),
          `Restock ${p.reorderThreshold * 2} ${p.unit}s`,
        ])
      : [['All items healthy', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [234, 88, 12], textColor: [255, 255, 255], fontStyle: 'bold' },
  });

  doc.save(`MaltLime_Low_Stock_${Date.now()}.pdf`);
}

// ==========================================
// POWERPOINT EXPORTS (.pptx)
// ==========================================

export async function exportSalesToPptx(data: SalesData) {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';

  // Slide 1: Title & Key Stats
  const slide1 = pptx.addSlide();
  slide1.background = { color: '0F172A' }; // slate-900

  slide1.addText('MALT & LIME BAR MANAGEMENT', {
    x: 0.8,
    y: 0.8,
    w: '80%',
    h: 0.5,
    fontSize: 16,
    color: '34D399',
    bold: true,
  });

  slide1.addText(`Sales Analysis Report (${data.period.toUpperCase()})`, {
    x: 0.8,
    y: 1.3,
    w: '80%',
    h: 0.8,
    fontSize: 28,
    color: 'FFFFFF',
    bold: true,
  });

  slide1.addText(`Generated on: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}`, {
    x: 0.8,
    y: 2.1,
    w: '80%',
    h: 0.4,
    fontSize: 12,
    color: '94A3B8',
  });

  // Cards on Slide 1
  // Revenue
  slide1.addShape(pptx.ShapeType.rect, { x: 0.8, y: 3.0, w: 2.6, h: 1.8, fill: { color: '1E293B' }, line: { color: '334155', width: 1 } });
  slide1.addText('PERIOD REVENUE', { x: 0.9, y: 3.2, w: 2.4, h: 0.3, fontSize: 11, color: '94A3B8', bold: true });
  slide1.addText(formatMoney(data.revenue), { x: 0.9, y: 3.7, w: 2.4, h: 0.8, fontSize: 20, color: '34D399', bold: true });

  // Orders
  slide1.addShape(pptx.ShapeType.rect, { x: 3.7, y: 3.0, w: 2.6, h: 1.8, fill: { color: '1E293B' }, line: { color: '334155', width: 1 } });
  slide1.addText('ORDERS CLEARED', { x: 3.8, y: 3.2, w: 2.4, h: 0.3, fontSize: 11, color: '94A3B8', bold: true });
  slide1.addText(`${data.orderCount}`, { x: 3.8, y: 3.7, w: 2.4, h: 0.8, fontSize: 22, color: '38BDF8', bold: true });

  // VAT
  slide1.addShape(pptx.ShapeType.rect, { x: 6.6, y: 3.0, w: 2.6, h: 1.8, fill: { color: '1E293B' }, line: { color: '334155', width: 1 } });
  slide1.addText('7.5% FEDERAL VAT', { x: 6.7, y: 3.2, w: 2.4, h: 0.3, fontSize: 11, color: '94A3B8', bold: true });
  slide1.addText(formatMoney(data.vat), { x: 6.7, y: 3.7, w: 2.4, h: 0.8, fontSize: 20, color: 'C084FC', bold: true });

  // Slide 2: Category Breakdown & Top Products Tables
  const slide2 = pptx.addSlide();
  slide2.background = { color: '0F172A' };

  slide2.addText('Sales Breakdown & Top Products', {
    x: 0.8,
    y: 0.6,
    w: '80%',
    h: 0.6,
    fontSize: 22,
    color: 'FFFFFF',
    bold: true,
  });

  // Table 1: Category
  const catTableData = [
    [{ text: 'Category', options: { bold: true, color: 'FFFFFF', fill: '334155' } }, { text: 'Sales (NGN)', options: { bold: true, color: 'FFFFFF', fill: '334155' } }],
    ...data.byCategory.map((c) => [
      { text: c.category, options: { color: 'E2E8F0', fill: '1E293B' } },
      { text: formatMoney(c.total), options: { color: '34D399', fill: '1E293B' } },
    ]),
  ];

  slide2.addTable(catTableData as any, {
    x: 0.8,
    y: 1.5,
    w: 4.2,
    colW: [2.2, 2.0],
    fontSize: 11,
  });

  // Table 2: Top Products
  const prodTableData = [
    [{ text: 'Rank', options: { bold: true, color: 'FFFFFF', fill: '334155' } }, { text: 'Item Name', options: { bold: true, color: 'FFFFFF', fill: '334155' } }, { text: 'Qty Sold', options: { bold: true, color: 'FFFFFF', fill: '334155' } }],
    ...data.topProducts.map((p, idx) => [
      { text: `#${idx + 1}`, options: { color: '34D399', fill: '1E293B' } },
      { text: p.name, options: { color: 'E2E8F0', fill: '1E293B' } },
      { text: `${p.quantity} units`, options: { color: 'E2E8F0', fill: '1E293B' } },
    ]),
  ];

  slide2.addTable(prodTableData as any, {
    x: 5.3,
    y: 1.5,
    w: 4.2,
    colW: [0.8, 2.2, 1.2],
    fontSize: 11,
  });

  await pptx.writeFile({ fileName: `MaltLime_Sales_Report_${data.period}_${Date.now()}.pptx` });
}

export async function exportValuationToPptx(data: ValuationData) {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';

  const slide = pptx.addSlide();
  slide.background = { color: '0F172A' };

  slide.addText('MALT & LIME BAR MANAGEMENT', {
    x: 0.8,
    y: 0.6,
    w: '80%',
    h: 0.4,
    fontSize: 14,
    color: '34D399',
    bold: true,
  });

  slide.addText('Stock Valuation Report', {
    x: 0.8,
    y: 1.0,
    w: '80%',
    h: 0.6,
    fontSize: 24,
    color: 'FFFFFF',
    bold: true,
  });

  slide.addText(`Total Capital Tied in Stock: ${formatMoney(data.totalValue)}`, {
    x: 0.8,
    y: 1.6,
    w: '80%',
    h: 0.4,
    fontSize: 14,
    color: '38BDF8',
    bold: true,
  });

  const tableData = [
    [
      { text: 'Drink / Item', options: { bold: true, color: 'FFFFFF', fill: '334155' } },
      { text: 'Category', options: { bold: true, color: 'FFFFFF', fill: '334155' } },
      { text: 'Units', options: { bold: true, color: 'FFFFFF', fill: '334155' } },
      { text: 'Unit Cost', options: { bold: true, color: 'FFFFFF', fill: '334155' } },
      { text: 'Total Value', options: { bold: true, color: 'FFFFFF', fill: '334155' } },
    ],
    ...data.items.slice(0, 10).map((i) => [
      { text: i.name, options: { color: 'E2E8F0', fill: '1E293B' } },
      { text: i.category, options: { color: '94A3B8', fill: '1E293B' } },
      { text: i.stockQuantity.toString(), options: { color: 'E2E8F0', fill: '1E293B' } },
      { text: formatMoney(i.costPrice), options: { color: 'E2E8F0', fill: '1E293B' } },
      { text: formatMoney(i.value), options: { color: '34D399', fill: '1E293B' } },
    ]),
  ];

  slide.addTable(tableData as any, {
    x: 0.8,
    y: 2.2,
    w: 8.4,
    colW: [2.4, 1.8, 1.0, 1.6, 1.6],
    fontSize: 10,
  });

  await pptx.writeFile({ fileName: `MaltLime_Stock_Valuation_${Date.now()}.pptx` });
}

export async function exportLowStockToPptx(data: LowStockData) {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';

  const slide = pptx.addSlide();
  slide.background = { color: '0F172A' };

  slide.addText('MALT & LIME BAR MANAGEMENT', {
    x: 0.8,
    y: 0.6,
    w: '80%',
    h: 0.4,
    fontSize: 14,
    color: 'FB923C',
    bold: true,
  });

  slide.addText('Low Stock & Reorder Report', {
    x: 0.8,
    y: 1.0,
    w: '80%',
    h: 0.6,
    fontSize: 24,
    color: 'FFFFFF',
    bold: true,
  });

  slide.addText(`Items Below Threshold: ${data.products.length}`, {
    x: 0.8,
    y: 1.6,
    w: '80%',
    h: 0.4,
    fontSize: 14,
    color: 'FB923C',
    bold: true,
  });

  const tableData = [
    [
      { text: 'Drink / Item', options: { bold: true, color: 'FFFFFF', fill: '334155' } },
      { text: 'Category', options: { bold: true, color: 'FFFFFF', fill: '334155' } },
      { text: 'In Stock', options: { bold: true, color: 'FFFFFF', fill: '334155' } },
      { text: 'Reorder Point', options: { bold: true, color: 'FFFFFF', fill: '334155' } },
      { text: 'Action Required', options: { bold: true, color: 'FFFFFF', fill: '334155' } },
    ],
    ...data.products.map((p) => [
      { text: p.name, options: { color: 'E2E8F0', fill: '1E293B' } },
      { text: p.category, options: { color: '94A3B8', fill: '1E293B' } },
      { text: p.stockQuantity.toString(), options: { color: 'FB923C', fill: '1E293B' } },
      { text: p.reorderThreshold.toString(), options: { color: 'E2E8F0', fill: '1E293B' } },
      { text: `Restock ${p.reorderThreshold * 2} ${p.unit}s`, options: { color: 'F87171', fill: '1E293B' } },
    ]),
  ];

  slide.addTable(tableData as any, {
    x: 0.8,
    y: 2.2,
    w: 8.4,
    colW: [2.2, 1.6, 1.2, 1.4, 2.0],
    fontSize: 10,
  });

  await pptx.writeFile({ fileName: `MaltLime_Low_Stock_${Date.now()}.pptx` });
}
