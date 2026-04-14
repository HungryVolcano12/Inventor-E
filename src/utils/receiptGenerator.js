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
    let currentY = 18;

    if (receiptLogo) {
        // Center the logo
        const logoWidth = 28;
        const logoHeight = 28;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(receiptLogo, 'PNG', logoX, 8, logoWidth, logoHeight);
        currentY = 44; // Push text down below the logo
    }

    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text(storeName, pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    
    // Split address into multiple lines if needed
    const splitAddress = doc.splitTextToSize(storeAddress, pageWidth - 20);
    doc.text(splitAddress, pageWidth / 2, currentY, { align: 'center' });
    currentY += (splitAddress.length * 5) + 6;
    
    // Receipt Details
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    const date = new Date();
    doc.text(`Date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`, 14, currentY);
    currentY += 6;
    doc.text(`Receipt #: ${transactionId || Math.random().toString(36).substring(2, 9).toUpperCase()}`, 14, currentY);

    // Items Header
    currentY += 6;
    doc.setDrawColor(220, 220, 220);
    doc.line(14, currentY, pageWidth - 14, currentY);
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
        headStyles: { fontStyle: 'bold', textColor: 0, fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: 60 },
        columnStyles: {
            0: { cellWidth: 55, fontStyle: 'bold' },
            1: { cellWidth: 40 },
            2: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: 0 }
        },
        margin: { left: 14, right: 14 }
    });

    const finalY = doc.lastAutoTable.finalY + 8;
    
    doc.setDrawColor(220, 220, 220);
    doc.line(14, finalY - 4, pageWidth - 14, finalY - 4);

    // Totals Section
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text("Subtotal:", pageWidth - 55, finalY);
    doc.setTextColor(0, 0, 0);
    doc.text(formatCurrency(subtotal), pageWidth - 14, finalY, { align: 'right' });

    currentY = finalY;

    if (discount > 0) {
        currentY += 6;
        doc.setTextColor(60, 60, 60);
        doc.text("Discount:", pageWidth - 55, currentY);
        doc.setTextColor(239, 68, 68);
        doc.text(`-${formatCurrency(discount)}`, pageWidth - 14, currentY, { align: 'right' });
    }

    if (tax > 0) {
        currentY += 6;
        doc.setTextColor(60, 60, 60);
        doc.text("Tax:", pageWidth - 55, currentY);
        doc.setTextColor(0, 0, 0);
        doc.text(`+${formatCurrency(tax)}`, pageWidth - 14, currentY, { align: 'right' });
    }

    currentY += 8;
    
    // Background for TOTAL
    doc.setFillColor(245, 245, 248);
    doc.rect(14, currentY - 6, pageWidth - 28, 10, 'F');

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("TOTAL:", 18, currentY + 1);
    doc.text(formatCurrency(total), pageWidth - 18, currentY + 1, { align: 'right' });

    // Footer
    currentY += 18;
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    const footerText = receiptFooter || "Thank you for your purchase!";
    const splitFooter = doc.splitTextToSize(footerText, pageWidth - 20);
    doc.text(splitFooter, pageWidth / 2, currentY, { align: 'center' });

    // Output
    // For web use, we'll open it in a new tab/window for easy viewing or printing
    const pdfUrl = doc.output('bloburl');
    window.open(pdfUrl, '_blank');
};
