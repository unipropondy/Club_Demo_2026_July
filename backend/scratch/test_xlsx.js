require("dotenv").config();
const { poolPromise } = require("../config/db");
const ExcelJS = require('exceljs');

async function testXlsx() {
  const pool = await poolPromise;
  const { fetchFullReportData } = require('../utils/reportDataFetcher');
  
  const targetDateStr = '2026-08-12';
  const filter = 'daily';
  
  console.log("Fetching report data...");
  const reportData = await fetchFullReportData(targetDateStr, targetDateStr, pool);
  console.log("Report data fetched successfully!");

  console.log("Building workbook...");
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sales Report');

  worksheet.views = [{ showGridLines: true }];

  const titleFont = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  const sectionHeaderFont = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1E293B' } };
  const tableHeaderFont = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  const normalFont = { name: 'Arial', size: 10 };
  const boldFont = { name: 'Arial', size: 10, bold: true };

  const titleFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  const tableHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF64748B' } };
  const zebraFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

  worksheet.mergeCells('A1:E1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'CONSOLIDATED SALES REPORT';
  titleCell.font = titleFont;
  titleCell.fill = titleFill;
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 35;

  worksheet.addRow([]);
  worksheet.addRow(['Filter Type', filter.toUpperCase()]).font = boldFont;
  worksheet.addRow(['Date Range', `${targetDateStr} to ${targetDateStr}`]).font = boldFont;
  worksheet.addRow(['Generated On', reportData.printedOn]).font = boldFont;
  worksheet.addRow([]);

  const summaryRow = worksheet.addRow(['FINANCIAL SUMMARY']);
  summaryRow.getCell(1).font = sectionHeaderFont;
  worksheet.addRow([]);

  const summaryHeaders = worksheet.addRow(['Metric', 'Value']);
  summaryHeaders.eachCell(cell => {
    cell.font = tableHeaderFont;
    cell.fill = tableHeaderFill;
  });

  const metrics = [
    ['Total Sales', reportData.totalSales || 0],
    ['Total Collections', reportData.totalCollections || 0],
    ['Credit Payments Collected', reportData.creditPaymentsCollected || 0],
    ['Member Payments Collected', reportData.memberPaymentsCollected || 0],
    ['Total Orders', reportData.totalOrders || 0],
    ['Total Items Sold', reportData.totalItems || 0],
    ['Void Quantity', reportData.voidQty || 0],
    ['Void Amount', reportData.voidAmount || 0],
    ['Cancelled Orders Count', reportData.cancelledCount || 0],
    ['Cancelled Orders Amount', reportData.cancelledAmount || 0],
    ['Total VIP Discount', reportData.totalVIPDiscount || 0]
  ];

  metrics.forEach((m, idx) => {
    const r = worksheet.addRow([m[0], m[1]]);
    r.getCell(1).font = normalFont;
    r.getCell(2).font = boldFont;
    if (typeof m[1] === 'number' && m[0].includes('Count') === false && m[0].includes('Quantity') === false) {
      r.getCell(2).numFmt = '$#,##0.00';
    }
    if (idx % 2 === 1) {
      r.eachCell(c => c.fill = zebraFill);
    }
  });
  worksheet.addRow([]);

  const paymentHeader = worksheet.addRow(['PAYMENT METHOD BREAKDOWN']);
  paymentHeader.getCell(1).font = sectionHeaderFont;
  worksheet.addRow([]);

  const paymentHeaders = worksheet.addRow(['Payment Mode', 'System Amount', 'Count']);
  paymentHeaders.eachCell(cell => {
    cell.font = tableHeaderFont;
    cell.fill = tableHeaderFill;
  });

  if (reportData.activePaymodes) {
    reportData.activePaymodes.forEach((pm, idx) => {
      const mode = pm.payMode;
      const amt = reportData.paymentBreakdown[mode] || 0;
      const count = reportData.paymentCounts[mode] || 0;
      const r = worksheet.addRow([pm.description, amt, count]);
      r.getCell(1).font = normalFont;
      r.getCell(2).font = normalFont;
      r.getCell(2).numFmt = '$#,##0.00';
      r.getCell(3).font = normalFont;
      if (idx % 2 === 1) {
        r.eachCell(c => c.fill = zebraFill);
      }
    });
  }
  worksheet.addRow([]);

  const categoryHeader = worksheet.addRow(['CATEGORY SALES']);
  categoryHeader.getCell(1).font = sectionHeaderFont;
  worksheet.addRow([]);

  const catHeaders = worksheet.addRow(['Category Name', 'Quantity Sold', 'Sales Amount']);
  catHeaders.eachCell(cell => {
    cell.font = tableHeaderFont;
    cell.fill = tableHeaderFill;
  });

  if (reportData.categories) {
    reportData.categories.forEach((cat, idx) => {
      const r = worksheet.addRow([cat.Category || 'Unmapped', cat.Qty || 0, cat.Sales || 0]);
      r.getCell(1).font = normalFont;
      r.getCell(2).font = normalFont;
      r.getCell(3).font = normalFont;
      r.getCell(3).numFmt = '$#,##0.00';
      if (idx % 2 === 1) {
        r.eachCell(c => c.fill = zebraFill);
      }
    });
  }
  worksheet.addRow([]);

  const itemHeader = worksheet.addRow(['ITEM SALES']);
  itemHeader.getCell(1).font = sectionHeaderFont;
  worksheet.addRow([]);

  const itemHeaders = worksheet.addRow(['Item Name', 'Category', 'Quantity Sold', 'Sales Amount']);
  itemHeaders.eachCell(cell => {
    cell.font = tableHeaderFont;
    cell.fill = tableHeaderFill;
  });

  if (reportData.items) {
    reportData.items.forEach((item, idx) => {
      const r = worksheet.addRow([item.Item || 'Unknown', item.Category || 'Unmapped', item.Qty || 0, item.Sales || 0]);
      r.getCell(1).font = normalFont;
      r.getCell(2).font = normalFont;
      r.getCell(3).font = normalFont;
      r.getCell(4).font = normalFont;
      r.getCell(4).numFmt = '$#,##0.00';
      if (idx % 2 === 1) {
        r.eachCell(c => c.fill = zebraFill);
      }
    });
  }
  worksheet.addRow([]);

  const artistHeader = worksheet.addRow(['ARTIST PERFORMANCE TARGETS']);
  artistHeader.getCell(1).font = sectionHeaderFont;
  worksheet.addRow([]);

  const artHeaders = worksheet.addRow(['Artist Name', 'Target Amount', 'Achieved Amount', 'Left to Target', 'Status']);
  artHeaders.eachCell(cell => {
    cell.font = tableHeaderFont;
    cell.fill = tableHeaderFill;
  });

  if (reportData.artistSales) {
    reportData.artistSales.forEach((art, idx) => {
      const target = art.TargetAmount || 0;
      const achieved = art.ActualSales || 0;
      const left = target - achieved > 0 ? target - achieved : 0;
      const status = achieved >= target ? 'Achieved' : 'Not Achieved';
      const r = worksheet.addRow([art.Name || 'Unknown', target, achieved, left, status]);
      r.getCell(1).font = normalFont;
      r.getCell(2).font = normalFont;
      r.getCell(2).numFmt = '$#,##0.00';
      r.getCell(3).font = normalFont;
      r.getCell(3).numFmt = '$#,##0.00';
      r.getCell(4).font = normalFont;
      r.getCell(4).numFmt = '$#,##0.00';
      r.getCell(5).font = boldFont;
      if (status === 'Achieved') {
        r.getCell(5).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF10B981' } };
      } else {
        r.getCell(5).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFEF4444' } };
      }
      if (idx % 2 === 1) {
        r.eachCell(c => c.fill = zebraFill);
      }
    });
  }

  worksheet.columns.forEach(column => {
    let maxLen = 0;
    column.eachCell({ includeEmpty: false }, cell => {
      if (cell.row === 1) return;
      const valStr = cell.value ? String(cell.value) : '';
      if (valStr.length > maxLen) {
        maxLen = valStr.length;
      }
    });
    column.width = Math.max(maxLen + 4, 15);
  });

  console.log("Writing test.xlsx file...");
  await workbook.xlsx.writeFile("scratch/test.xlsx");
  console.log("File generated successfully!");
  process.exit(0);
}

testXlsx().catch(err => {
  console.error(err);
  process.exit(1);
});
