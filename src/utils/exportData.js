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
    } catch (error) {
        console.error("Export Failed:", error);
        alert("Failed to export PDF: " + error.message);
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
