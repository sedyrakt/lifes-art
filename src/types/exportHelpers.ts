// src/utils/exportHelpers.ts

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';

export const exportToExcel = (data: any[], filename: string) => {
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dashboard');
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`✅ ${filename} exporté en Excel`);
  } catch (error) {
    toast.error('❌ Erreur lors de l\'export Excel');
    console.error(error);
  }
};

export const exportToPDF = (data: any[], filename: string, title: string) => {
  try {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(10);
    doc.text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, 14, 30);
    const columns = Object.keys(data[0] || {});
    const rows = data.map(item => columns.map(col => item[col] || ''));
    doc.autoTable({
      head: [columns],
      body: rows,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    doc.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success(`✅ ${filename} exporté en PDF`);
  } catch (error) {
    toast.error('❌ Erreur lors de l\'export PDF');
    console.error(error);
  }
};

export const exportToCSV = (data: any[], filename: string) => {
  try {
    if (data.length === 0) {
      toast.error('❌ Aucune donnée à exporter');
      return;
    }
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(item => headers.map(h => `"${item[h] || ''}"`).join(','))
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(`✅ ${filename} exporté en CSV`);
  } catch (error) {
    toast.error('❌ Erreur lors de l\'export CSV');
    console.error(error);
  }
};