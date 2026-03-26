import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './currency';
import { useSettingsStore } from '../store/useSettingsStore';

export const generateReceipt = async ({ items, subtotal, discount, tax, total, transactionId }) => {
    // Standard receipt format typical for thermal printers (80mm is ~80 width)
    // Using slightly wider standard A5 for better email/digital viewing.
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
    });

    const { receiptLogo, receiptAddress, receiptFooter } = useSettingsStore.getState();
    const { storeName: storeNameFromAuth } = (await import('../store/useAuthStore')).useAuthStore.getState();

    const pageWidth = doc.internal.pageSize.getWidth();
    const storeName = storeNameFromAuth || "Inventor-E Store";
    const storeAddress = receiptAddress || "Generated via Inventor-E App";

    // Header Structure
    let currentY = 20;

    if (receiptLogo) {
        // Center the logo
        const logoWidth = 30;
        const logoHeight = 30; // Assuming square-ish logo
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(receiptLogo, 'JPEG', logoX, 10, logoWidth, logoHeight);
        currentY = 46; // Push text down below the logo
    }

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(storeName, pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    // Split address into multiple lines if needed
    const splitAddress = doc.splitTextToSize(storeAddress, pageWidth - 20);
    doc.text(splitAddress, pageWidth / 2, currentY, { align: 'center' });
    currentY += (splitAddress.length * 5) + 5;
    
    // Receipt Details
    const date = new Date();
    doc.text(`Date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`, 10, currentY);
    currentY += 6;
    doc.text(`Receipt #: ${transactionId || Math.random().toString(36).substring(2, 9).toUpperCase()}`, 10, currentY);

    // Items Header
    currentY += 6;
    doc.line(10, currentY, pageWidth - 10, currentY);
    currentY += 4;

    // Prep Table Data
    const tableData = items.map(item => [
        item.name,
        `${item.cartQuantity} x ${formatCurrency(item.price)}`,
        formatCurrency(item.price * item.cartQuantity)
    ]);

    // Render Table
    autoTable(doc, {
        startY: currentY,
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

    currentY = finalY;

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
    currentY += 15;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const footerText = receiptFooter || "Thank you for your purchase!";
    const splitFooter = doc.splitTextToSize(footerText, pageWidth - 20);
    doc.text(splitFooter, pageWidth / 2, currentY, { align: 'center' });

    // Output
    // For web use, we'll open it in a new tab/window for easy viewing or printing
    const pdfUrl = doc.output('bloburl');
    window.open(pdfUrl, '_blank');
};
