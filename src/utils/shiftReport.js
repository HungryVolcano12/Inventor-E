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
    const { receiptAddress, receiptFooter } = useSettingsStore.getState();

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const name = storeName || 'Inventor-E Store';

    // ── Header ──────────────────────────────────────────────────────────────
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(name, pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (receiptAddress) {
        const split = doc.splitTextToSize(receiptAddress, pageWidth - 20);
        doc.text(split, pageWidth / 2, 25, { align: 'center' });
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('END OF SHIFT REPORT', pageWidth / 2, 35, { align: 'center' });
    doc.line(10, 38, pageWidth - 10, 38);

    // ── Shift Details ────────────────────────────────────────────────────────
    let y = 44;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

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
        doc.text(label, 12, y);
        doc.setFont('helvetica', 'normal');
        doc.text(val, 50, y);
        y += 6;
    });

    y += 2;
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
        bodyStyles: { fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 60, fontStyle: 'normal' },
            1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: 12, right: 12 },
    });

    y = doc.lastAutoTable.finalY + 6;

    // ── Payment Method Breakdown ─────────────────────────────────────────────
    if (Object.keys(byMethod).length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Breakdown', 12, y);
        y += 4;

        autoTable(doc, {
            startY: y,
            head: [['Method', 'Amount']],
            body: Object.entries(byMethod).map(([m, v]) => [m, formatCurrency(v)]),
            theme: 'plain',
            headStyles: { fontStyle: 'bold', fontSize: 9, textColor: 60 },
            bodyStyles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 60 },
                1: { cellWidth: 50, halign: 'right' },
            },
            margin: { left: 12, right: 12 },
        });
        y = doc.lastAutoTable.finalY + 6;
    }

    // ── Cash Reconciliation ──────────────────────────────────────────────────
    const startingCash  = Number(shift.starting_cash || 0);
    const expectedCash  = Number(shift.expected_cash || 0);
    const actualCash    = Number(shift.actual_cash || 0);
    const expectedTotal = startingCash + expectedCash;
    const overShort     = actualCash - expectedTotal;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Cash Reconciliation', 12, y);
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
        theme: 'plain',
        bodyStyles: { fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 50, halign: 'right' },
        },
        margin: { left: 12, right: 12 },
    });

    y = doc.lastAutoTable.finalY + 10;

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
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
