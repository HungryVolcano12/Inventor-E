import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatCurrency } from './currency';
import { useInventoryStore } from '../store/useInventoryStore';

export const exportToPDF = (data, title, type, language = 'en') => {
    try {
        // Robust initialization for jsPDF (handles both default and named export styles)
        const JsPDF = jsPDF.jsPDF || jsPDF;
        const doc = new JsPDF();

        // Header
        doc.setFontSize(18);
        doc.text(title, 14, 22);

        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString(language === 'en' ? 'en-US' : 'id-ID')}`, 14, 30);

        const headers = type === 'revenue'
            ? [language === 'en' ? ['Date', 'Item', 'Qty', 'Amount'] : ['Tanggal', 'Barang', 'Jml', 'Jumlah']]
            : [language === 'en' ? ['Date', 'Item', 'Qty', 'Revenue', 'Cost', 'Profit'] : ['Tanggal', 'Barang', 'Jml', 'Pendapatan', 'Modal', 'Untung']];

        let totalQty = 0;
        let totalRevenue = 0;
        let totalCost = 0;
        let totalProfit = 0;

        const body = data.map(tr => {
            const dateStr = new Date(tr.date).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID');
            const itemName = tr.itemName || (language === 'en' ? 'Unknown Item' : 'Barang Tidak Diketahui');
            const quantity = tr.quantity || 0;

            // Robust calculation: Try transaction price -> Store price -> Total/Qty
            let unitPrice = tr.price;
            if (!unitPrice) {
                const item = useInventoryStore.getState().items.find(i => i.id === tr.itemId);
                if (item) unitPrice = item.price;
            }
            // Fallback: IF we have total and qty, derive unit price (last resort)
            if (!unitPrice && tr.total && quantity) {
                unitPrice = tr.total / quantity;
            }

            const amount = (unitPrice * quantity) || tr.total || 0;

            totalQty += quantity;
            totalRevenue += amount;

            if (type === 'revenue') {
                return [dateStr, itemName, tr.quantity, formatCurrency(amount)];
            } else {
                const cost = (tr.cost || 0) * tr.quantity;
                const profit = amount - cost;

                totalCost += cost;
                totalProfit += profit;

                return [
                    dateStr,
                    itemName,
                    tr.quantity,
                    formatCurrency(amount),
                    formatCurrency(cost),
                    formatCurrency(profit)
                ];
            }
        });

        // Prepare Footer
        let footer;
        if (type === 'revenue') {
            footer = [[
                language === 'en' ? 'TOTAL' : 'TOTAL',
                '',
                totalQty,
                formatCurrency(totalRevenue)
            ]];
        } else {
            footer = [[
                language === 'en' ? (totalProfit >= 0 ? 'TOTAL PROFIT' : 'TOTAL LOSS') : (totalProfit >= 0 ? 'TOTAL KEUNTUNGAN' : 'TOTAL KERUGIAN'),
                '',
                totalQty,
                formatCurrency(totalRevenue),
                formatCurrency(totalCost),
                formatCurrency(totalProfit)
            ]];
        }

        // Use functional autoTable instead of prototype extension
        autoTable(doc, {
            head: headers,
            body: body,
            foot: footer,
            startY: 35,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [236, 72, 153] }, // Primary Pink
            footStyles: {
                fillColor: [240, 240, 240],
                textColor: [0, 0, 0],
                fontStyle: 'bold'
            },
            didParseCell: function (data) {
                // Color the profit column in footer based on value
                if (data.section === 'foot' && type !== 'revenue' && data.column.index === 5) {
                    if (totalProfit < 0) {
                        data.cell.styles.textColor = [220, 38, 38]; // Red
                    } else {
                        data.cell.styles.textColor = [22, 163, 74]; // Green
                    }
                }
            }
        });

        doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
        return true;
    } catch (error) {
        console.error("Error exporting PDF:", error);
        return false;
    }
};

export const generatePO = (supplier, items, language = 'en') => {
    try {
        const JsPDF = jsPDF.jsPDF || jsPDF;
        const doc = new JsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text(language === 'en' ? 'PURCHASE ORDER' : 'PESANAN PEMBELIAN', 14, 25);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`PO Number: PO-${Date.now().toString().slice(-6)}`, 14, 35);
        doc.text(`Date: ${new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID')}`, 14, 40);
        
        // Supplier Info
        doc.setFontSize(12);
        doc.setTextColor(40, 40, 40);
        doc.text(language === 'en' ? 'Vendor:' : 'Pemasok:', 14, 55);
        doc.setFontSize(11);
        doc.text(supplier.name, 14, 62);
        if (supplier.phone) doc.text(supplier.phone, 14, 68);
        if (supplier.email) doc.text(supplier.email, 14, 74);
        if (supplier.address) doc.text(supplier.address, 14, 80);

        // Blank table for items Since it's generic PO
        const startY = 95;
        doc.setFontSize(12);
        doc.text(language === 'en' ? 'Items Requested:' : 'Barang yang Diminta:', 14, startY - 5);

        const headers = [[
            language === 'en' ? 'Item No.' : 'No. Barang',
            language === 'en' ? 'Description' : 'Keterangan',
            language === 'en' ? 'Qty Request' : 'Jml Diminta',
            language === 'en' ? 'Unit Price' : 'Harga Satuan',
            language === 'en' ? 'Total' : 'Total'
        ]];

        const emptyRows = Array(8).fill(['', '', '', '', '']);

        autoTable(doc, {
            head: headers,
            body: emptyRows,
            startY: startY,
            theme: 'grid',
            headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255] },
            styles: { minCellHeight: 12 },
        });

        // Signatures
        const finalY = doc.lastAutoTable.finalY + 30;
        doc.setFontSize(10);
        doc.text(language === 'en' ? 'Authorized Signature:' : 'Tanda Tangan:', 14, finalY);
        doc.line(14, finalY + 15, 80, finalY + 15);

        doc.save(`PO_${supplier.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
        return true;
    } catch (error) {
        console.error('Error generating PO:', error);
        return false;
    }
};

export const exportToExcel = (data, title, type, language = 'en') => {
    let totalQty = 0;
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;

    const formattedData = data.map(tr => {
        const dateStr = new Date(tr.date).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID');
        const itemName = tr.itemName || (language === 'en' ? 'Unknown Item' : 'Barang Tidak Diketahui');
        const quantity = tr.quantity || 0;

        // Robust calculation for Excel
        let unitPrice = tr.price;
        if (!unitPrice) {
            const item = useInventoryStore.getState().items.find(i => i.id === tr.itemId);
            if (item) unitPrice = item.price;
        }
        // Fallback
        if (!unitPrice && tr.total && quantity) {
            unitPrice = tr.total / quantity;
        }

        const amount = (unitPrice * quantity) || tr.total || 0;

        totalQty += quantity;
        totalRevenue += amount;

        if (type === 'revenue') {
            return {
                [language === 'en' ? 'Date' : 'Tanggal']: dateStr,
                [language === 'en' ? 'Item' : 'Barang']: itemName,
                [language === 'en' ? 'Quantity' : 'Jumlah']: quantity,
                [language === 'en' ? 'Amount' : 'Jumlah']: amount
            };
        } else {
            const cost = (tr.cost || 0) * tr.quantity;
            const profit = amount - cost;

            totalCost += cost;
            totalProfit += profit;

            return {
                [language === 'en' ? 'Date' : 'Tanggal']: dateStr,
                [language === 'en' ? 'Item' : 'Barang']: itemName,
                [language === 'en' ? 'Quantity' : 'Jumlah']: quantity,
                [language === 'en' ? 'Revenue' : 'Pendapatan']: amount,
                [language === 'en' ? 'Cost' : 'Modal']: cost,
                [language === 'en' ? 'Profit' : 'Untung']: profit
            };
        }
    });

    // Append Total Row
    if (type === 'revenue') {
        formattedData.push({
            [language === 'en' ? 'Date' : 'Tanggal']: language === 'en' ? 'TOTAL' : 'TOTAL',
            [language === 'en' ? 'Item' : 'Barang']: '',
            [language === 'en' ? 'Quantity' : 'Jumlah']: totalQty,
            [language === 'en' ? 'Amount' : 'Jumlah']: totalRevenue
        });
    } else {
        const label = language === 'en'
            ? (totalProfit >= 0 ? 'TOTAL PROFIT' : 'TOTAL LOSS')
            : (totalProfit >= 0 ? 'TOTAL KEUNTUNGAN' : 'TOTAL KERUGIAN');

        formattedData.push({
            [language === 'en' ? 'Date' : 'Tanggal']: label,
            [language === 'en' ? 'Item' : 'Barang']: '',
            [language === 'en' ? 'Quantity' : 'Jumlah']: totalQty,
            [language === 'en' ? 'Revenue' : 'Pendapatan']: totalRevenue,
            [language === 'en' ? 'Cost' : 'Modal']: totalCost,
            [language === 'en' ? 'Profit' : 'Untung']: totalProfit
        });
    }

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportToCSVForAccounting = (transactions) => {
    // Quickbooks/Xero compatible CSV format
    const headers = ['Date', 'Description', 'Item', 'Quantity', 'UnitAmount', 'Account', 'Amount'];
    
    let csvContent = headers.join(',') + '\n';

    transactions.forEach(tr => {
        if (tr.type !== 'SALE') return;
        
        const dateStr = new Date(tr.date).toISOString().split('T')[0];
        const item = useInventoryStore.getState().items.find(i => i.id === tr.itemId);
        
        const itemName = (tr.itemName || item?.name || 'Unknown Item').replace(/,/g, ''); // Remove commas
        const qty = tr.quantity || 1;
        
        let unitPrice = tr.price || (item ? item.price : 0) || (tr.total ? (tr.total / qty) : 0);
        let costPrice = tr.cost || (item ? item.costPrice : 0) || 0;
        
        const revAmount = unitPrice * qty;
        const costAmount = costPrice * qty;

        // Revenue Row
        csvContent += `${dateStr},Sale - ${itemName},${itemName},${qty},${unitPrice},Sales Revenue,${revAmount}\n`;
        
        // Cost of Goods Sold Row (if cost exists)
        if (costAmount > 0) {
            csvContent += `${dateStr},COGS - ${itemName},${itemName},${qty},${costPrice},Cost of Goods Sold,${costAmount}\n`;
        }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Accounting_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportInventoryToPDF = async (items, language = 'en') => {
    try {
        const JsPDF = jsPDF.jsPDF || jsPDF;
        const doc = new JsPDF();

        const uncategorizedLabel = language === 'en' ? 'Uncategorized' : 'Tidak Berkategori';

        // Group items by category
        const itemsByCategory = items.reduce((acc, item) => {
            const cat = item.category || uncategorizedLabel;
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(item);
            return acc;
        }, {});

        const categories = Object.keys(itemsByCategory).sort();

        categories.forEach((category, index) => {
            if (index > 0) {
                doc.addPage();
            }

            doc.setFontSize(18);
            doc.text(language === 'en' ? 'Inventory Report' : 'Laporan Inventaris', 14, 22);

            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleString(language === 'en' ? 'en-US' : 'id-ID')}`, 14, 30);
            
            doc.setFontSize(14);
            doc.text(`${language === 'en' ? 'Category' : 'Kategori'}: ${category}`, 14, 42);

            const headers = [language === 'en' ? ['Name', 'Price', 'Stock'] : ['Nama', 'Harga Jual', 'Stok']];

            const body = itemsByCategory[category].map(item => [
                item.name,
                formatCurrency(item.price),
                item.stock
            ]);

            autoTable(doc, {
                head: headers,
                body: body,
                startY: 48,
                theme: 'grid',
                styles: { fontSize: 9 },
                headStyles: { fillColor: [236, 72, 153] }
            });
        });

        const filename = `Inventory_${new Date().toISOString().split('T')[0]}.pdf`;
        
        // Try native share first
        if (navigator.share && navigator.canShare) {
            const blob = doc.output('blob');
            const file = new File([blob], filename, { type: 'application/pdf' });
            if (navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        title: language === 'en' ? 'Inventory Report' : 'Laporan Inventaris',
                        files: [file]
                    });
                    // Intentionally not returning here so it also downloads
                } catch (shareErr) {
                    console.log('Share canceled or failed', shareErr);
                }
            }
        }
        
        // Always download the file
        doc.save(filename);
    } catch (err) {
        console.error('Error generating PDF:', err);
        throw err;
    }
};
