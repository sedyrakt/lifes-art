// src/utils/exportHelpers.ts

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
// ⭐ FANITSARA: Ampidiro amin'ny fomba mety ny autoTable
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

// ============================================================
// ⭐ EXPORT EXCEL
// ============================================================
export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Données') => {
  try {
    if (!Array.isArray(data) || data.length === 0) {
      toast.error('❌ Aucune donnée à exporter');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`✅ ${filename} exporté en Excel`);
  } catch (error) {
    toast.error('❌ Erreur lors de l\'export Excel');
    console.error('Export Excel error:', error);
  }
};

// ============================================================
// ⭐ EXPORT PDF - FANITSARA: Mampiasa autoTable misaraka
// ============================================================
export const exportToPDF = (
  data: any[],
  filename: string,
  title: string,
  columns?: string[]
) => {
  try {
    // ⭐ Fiarovana: raha tsy misy data
    if (!Array.isArray(data) || data.length === 0) {
      toast.error('❌ Aucune donnée à exporter');
      return;
    }

    // ⭐ Raha tsy misy columns, dia alaina avy amin'ny data voalohany
    let finalColumns = columns;
    if (!finalColumns || finalColumns.length === 0) {
      finalColumns = Object.keys(data[0]);
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');

    // ⭐ Titre
    doc.setFontSize(18);
    doc.text(title, 14, 22);

    // ⭐ Date
    doc.setFontSize(10);
    doc.text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, 14, 30);

    // ⭐ Tableau - Mampiasa autoTable misaraka (tsy doc.autoTable)
    autoTable(doc, {
      head: [finalColumns],
      body: data.map((item) => finalColumns!.map((col) => item[col] ?? '')),
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      alternateRowStyles: { fillColor: [241, 245, 249] },
    });

    doc.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success(`✅ ${filename} exporté en PDF`);
  } catch (error) {
    toast.error('❌ Erreur lors de l\'export PDF');
    console.error('Export PDF error:', error);
  }
};

// ============================================================
// ⭐ EXPORT CSV
// ============================================================
export const exportToCSV = (data: any[], filename: string, headers?: string[]) => {
  try {
    if (!Array.isArray(data) || data.length === 0) {
      toast.error('❌ Aucune donnée à exporter');
      return;
    }

    let finalHeaders = headers;
    if (!finalHeaders || finalHeaders.length === 0) {
      finalHeaders = Object.keys(data[0]);
    }

    const csv = [
      finalHeaders.join(','),
      ...data.map((item) => finalHeaders!.map((h) => `"${item[h] ?? ''}"`).join(',')),
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
    console.error('Export CSV error:', error);
  }
};

// ============================================================
// ⭐ EXPORT DASHBOARD PDF
// ============================================================
export const exportDashboardToPDF = (elementId: string, filename: string) => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      toast.error('❌ Élément non trouvé');
      return;
    }
    const doc = new jsPDF('landscape', 'mm', 'a4');
    doc.text('Tableau de bord - Gestion Stock', 14, 22);
    doc.text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, 14, 30);
    doc.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success(`✅ Dashboard exporté en PDF`);
  } catch (error) {
    toast.error('❌ Erreur lors de l\'export du dashboard');
    console.error('Export Dashboard error:', error);
  }
};