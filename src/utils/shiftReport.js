import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './currency';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';

/**
 * Generates an end-of-shift PDF report and opens it in a new tab.
 * @param {object} shift - The closed shift object from the DB
 * @param {Array}  transactions - All transactions that occurred during this shift
 */
export const generateShiftReport = async (shift, transactions = []) => {
    const { storeName } = useAuthStore.getState();
    const { receiptLogo, receiptAddress, receiptFooter, color: appColor } = useSettingsStore.getState();

    const colors = {
        pink: [255, 20, 147],
        red: [239, 68, 68],
        blue: [59, 130, 246],
        green: [34, 197, 94],
        purple: [139, 92, 246],
        orange: [249, 115, 22],
    };
    const themeRGB = colors[appColor] || [59, 130, 246]; // default blue

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const name = storeName || 'Inventor-E Store';

    let currentY = 18;

    // ── Logo ────────────────────────────────────────────────────────────────
    if (receiptLogo) {
        const logoWidth = 28;
        const logoHeight = 28;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(receiptLogo, 'PNG', logoX, 8, logoWidth, logoHeight);
        currentY = 44; 
    }

    // ── Header ──────────────────────────────────────────────────────────────
    if (!receiptLogo) {
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 40);
        doc.text(name, pageWidth / 2, currentY, { align: 'center' });
        currentY += 6;
    } else {
        // If logo is present, we skip the large name text to avoid redundancy and save space
        currentY += 2;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    if (receiptAddress) {
        const split = doc.splitTextToSize(receiptAddress, pageWidth - 20);
        doc.text(split, pageWidth / 2, currentY, { align: 'center' });
        currentY += (split.length * 5) + 2;
    } else {
        currentY += 2;
    }

    currentY += 8;
    
    // Sleek background behind title using the app theme color
    doc.setFillColor(...themeRGB);
    doc.rect(10, currentY - 7, pageWidth - 20, 12, 'F');
    
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255); // White text on colored background
    doc.text('END OF SHIFT REPORT', pageWidth / 2, currentY + 1.5, { align: 'center' });
    
    currentY += 10;

    // ── Shift Details ────────────────────────────────────────────────────────
    let y = currentY;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);

    const startTime = shift.start_time ? new Date(shift.start_time) : new Date();
    const endTime   = shift.end_time   ? new Date(shift.end_time)   : new Date();
    const duration  = Math.round((endTime - startTime) / 60000); // minutes

    const details = [
        ['Opened:', startTime.toLocaleString()],
        ['Closed:', endTime.toLocaleString()],
        ['Duration:', `${Math.floor(duration / 60)}h ${duration % 60}m`],
        ['Cashier:', shift.cashier_name || 'N/A'],
    ];

    details.forEach(([label, val]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(val, 45, y);
        y += 6;
    });

    y += 2;
    doc.setDrawColor(220, 220, 220);
    doc.line(10, y, pageWidth - 10, y);
    y += 6;

    // ── Sales Summary ────────────────────────────────────────────────────────
    const saleTxs   = transactions.filter(tx => tx.type === 'SALE');
    const refundTxs = transactions.filter(tx => tx.type === 'REFUND');

    const totalRevenue = saleTxs.reduce((s, tx) => s + (tx.total || tx.price * tx.quantity || 0), 0);
    const totalRefunds = refundTxs.reduce((s, tx) => s + (tx.total || 0), 0);
    const netRevenue   = totalRevenue - totalRefunds;

    // Payment method breakdown
    const byMethod = saleTxs.reduce((acc, tx) => {
        const m = tx.payment_method || 'CASH';
        acc[m] = (acc[m] || 0) + (tx.total || 0);
        return acc;
    }, {});

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Sales Summary', 12, y);
    y += 6;

    const summaryRows = [
        ['Total Transactions', saleTxs.length.toString()],
        ['Total Revenue', formatCurrency(totalRevenue)],
        ['Refunds', refundTxs.length > 0 ? `-${formatCurrency(totalRefunds)}` : '—'],
        ['Net Revenue', formatCurrency(netRevenue)],
    ];

    autoTable(doc, {
        startY: y,
        body: summaryRows,
        theme: 'plain',
        bodyStyles: { fontSize: 10, textColor: 60 },
        columnStyles: {
            0: { cellWidth: 70, fontStyle: 'normal' },
            1: { cellWidth: 40, halign: 'right', fontStyle: 'bold', textColor: 0 },
        },
        margin: { left: 14, right: 14 },
    });

    y = doc.lastAutoTable.finalY + 8;

    // ── Payment Method Breakdown ─────────────────────────────────────────────
    if (Object.keys(byMethod).length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text('Payment Breakdown', 14, y);
        y += 4;

        autoTable(doc, {
            startY: y,
            head: [['Method', 'Amount']],
            body: Object.entries(byMethod).map(([m, v]) => [m, formatCurrency(v)]),
            theme: 'grid',
            headStyles: { fontStyle: 'bold', fontSize: 9, textColor: 0, fillColor: [240, 240, 245], lineColor: 255 },
            bodyStyles: { fontSize: 9, textColor: 60, lineColor: 255 },
            columnStyles: {
                0: { cellWidth: 70 },
                1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
            },
            margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 8;
    }

    // ── Cash Reconciliation ──────────────────────────────────────────────────
    const startingCash  = Number(shift.starting_cash || 0);
    const expectedCash  = Number(shift.expected_cash || 0);
    const actualCash    = Number(shift.actual_cash || 0);
    const expectedTotal = startingCash + expectedCash;
    const overShort     = actualCash - expectedTotal;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Cash Reconciliation', 14, y);
    y += 4;

    autoTable(doc, {
        startY: y,
        body: [
            ['Starting Cash', formatCurrency(startingCash)],
            ['+ Cash Sales', formatCurrency(expectedCash)],
            ['Expected in Drawer', formatCurrency(expectedTotal)],
            ['Actual Cash Counted', formatCurrency(actualCash)],
            [overShort >= 0 ? 'Over' : 'Short', `${overShort >= 0 ? '+' : ''}${formatCurrency(Math.abs(overShort))}`],
        ],
        theme: 'grid',
        bodyStyles: { fontSize: 9, textColor: 60, lineColor: 255 },
        columnStyles: {
            0: { cellWidth: 70 },
            1: { cellWidth: 40, halign: 'right', fontStyle: 'bold', textColor: overShort >= 0 ? [34, 197, 94] : [239, 68, 68] },
        },
        willDrawCell: (data) => {
            // Only color the last row
            if (data.row.index !== 4 && data.column.index === 1) {
                doc.setTextColor(0, 0, 0); // Default bold black for amounts
            }
        },
        margin: { left: 14, right: 14 },
    });

    y = doc.lastAutoTable.finalY + 14;

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    const footer = receiptFooter || 'Generated by Inventor-E';
    doc.text(footer, pageWidth / 2, y, { align: 'center' });

    window.open(doc.output('bloburl'), '_blank');
};

/**
 * Builds a WhatsApp-ready text summary of the shift.
 */
export const buildShiftWhatsAppMessage = (shift, transactions = [], storeName = '') => {
    const saleTxs   = transactions.filter(tx => tx.type === 'SALE');
    const totalRevenue = saleTxs.reduce((s, tx) => s + (tx.total || 0), 0);
    const byMethod = saleTxs.reduce((acc, tx) => {
        const m = tx.payment_method || 'CASH';
        acc[m] = (acc[m] || 0) + (tx.total || 0);
        return acc;
    }, {});

    const startingCash  = Number(shift.starting_cash || 0);
    const expectedCash  = Number(shift.expected_cash || 0);
    const actualCash    = Number(shift.actual_cash || 0);
    const overShort     = actualCash - (startingCash + expectedCash);

    let msg = `*${(storeName || 'Store').toUpperCase()} — SHIFT REPORT*\n`;
    msg += `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n`;
    msg += `📦 *Transactions:* ${saleTxs.length}\n`;
    msg += `💰 *Total Revenue:* ${formatCurrency(totalRevenue)}\n\n`;
    msg += `*Payment Breakdown:*\n`;
    Object.entries(byMethod).forEach(([m, v]) => { msg += `  ${m}: ${formatCurrency(v)}\n`; });
    msg += `\n*Cash Reconciliation:*\n`;
    msg += `  Starting: ${formatCurrency(startingCash)}\n`;
    msg += `  Expected: ${formatCurrency(startingCash + expectedCash)}\n`;
    msg += `  Actual:   ${formatCurrency(actualCash)}\n`;
    msg += `  ${overShort >= 0 ? '✅ Over' : '⚠️ Short'}: ${overShort >= 0 ? '+' : ''}${formatCurrency(Math.abs(overShort))}\n`;

    return msg;
};
