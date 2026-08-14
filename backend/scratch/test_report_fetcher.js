const { poolPromise } = require("../config/db");
const { fetchFullReportData } = require("../utils/reportDataFetcher");

async function run() {
  try {
    const pool = await poolPromise;
    const data = await fetchFullReportData("2026-06-01", "2026-08-12", pool);
    console.log("=== fetchFullReportData Output ===");
    console.log("totalSales:", data.totalSales);
    console.log("totalCollections:", data.totalCollections);
    console.log("totalOrders:", data.totalOrders);
    console.log("totalItems:", data.totalItems);
    console.log("voidQty:", data.voidQty);
    console.log("voidAmount:", data.voidAmount);
    console.log("cancelledCount:", data.cancelledCount);
    console.log("cancelledAmount:", data.cancelledAmount);
    console.log("paymentBreakdown:", data.paymentBreakdown);
    console.log("reconciliation:", data.reconciliation);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
