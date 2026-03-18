import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './currency';

export const generateReceipt = ({ items, subtotal, discount, tax, total, transactionId }) => {
    // Standard receipt format typical for thermal printers (80mm is ~80 width)
    // Using slightly wider standard A5 for better email/digital viewing.
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const storeName = "Inventor-E Store";
    const storeAddress = "Generated via Inventor-E App";

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(storeName, pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(storeAddress, pageWidth / 2, 26, { align: 'center' });
    
    // Receipt Details
    const date = new Date();
    doc.text(`Date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`, 10, 40);
    doc.text(`Receipt #: ${transactionId || Math.random().toString(36).substring(2, 9).toUpperCase()}`, 10, 46);

    // Items Header
    doc.line(10, 52, pageWidth - 10, 52);

    // Prep Table Data
    const tableData = items.map(item => [
        item.name,
        `${item.cartQuantity} x ${formatCurrency(item.price)}`,
        formatCurrency(item.price * item.cartQuantity)
    ]);

    // Render Table
    autoTable(doc, {
        startY: 56,
        head: [['Item', 'Qty x Price', 'Amount']],
        body: tableData,
        theme: 'plain',
        headStyles: { fontStyle: 'bold', textColor: 20 },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 45 },
            2: { cellWidth: 30, halign: 'right' }
        },
        margin: { left: 10, right: 10 }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    
    doc.line(10, finalY - 5, pageWidth - 10, finalY - 5);

    // Totals Section
    doc.setFontSize(10);
    doc.text("Subtotal:", pageWidth - 50, finalY);
    doc.text(formatCurrency(subtotal), pageWidth - 10, finalY, { align: 'right' });

    let currentY = finalY;

    if (discount > 0) {
        currentY += 6;
        doc.text("Discount:", pageWidth - 50, currentY);
        doc.text(`-${formatCurrency(discount)}`, pageWidth - 10, currentY, { align: 'right' });
    }

    if (tax > 0) {
        currentY += 6;
        doc.text("Tax:", pageWidth - 50, currentY);
        doc.text(`+${formatCurrency(tax)}`, pageWidth - 10, currentY, { align: 'right' });
    }

    currentY += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", pageWidth - 50, currentY);
    doc.text(formatCurrency(total), pageWidth - 10, currentY, { align: 'right' });

    // Footer
    currentY += 20;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Thank you for your purchase!", pageWidth / 2, currentY, { align: 'center' });

    // Output
    // For web use, we'll open it in a new tab/window for easy viewing or printing
    const pdfUrl = doc.output('bloburl');
    window.open(pdfUrl, '_blank');
};
