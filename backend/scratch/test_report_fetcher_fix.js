const { poolPromise } = require('../config/db');
const { fetchFullReportData } = require('../utils/reportDataFetcher');

(async () => {
  try {
    const pool = await poolPromise;
    const reportData = await fetchFullReportData("2026-09-17", "2026-09-17", pool);
    console.log('=== SALES REPORT DATA FOR 2026-09-17 ===');
    console.log('Total Sales:', reportData.totalSales);
    console.log('Total Orders:', reportData.totalOrders);
    console.log('Cancelled Count:', reportData.cancelledCount);
    console.log('Cancelled Amount:', reportData.cancelledAmount);
    console.log('Payment Breakdown:', reportData.paymentBreakdown);
    console.log('Categories Count:', reportData.categories.length);
    console.log('Items Count:', reportData.items.length);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
})();
