const { poolPromise, sql } = require("../config/db");

async function run() {
  const pool = await poolPromise;
  
  try {
    console.log("--- BusinessDayAuditLog Rows (Recent) ---");
    const auditRes = await pool.request().query(`
      SELECT TOP 30 * 
      FROM BusinessDayAuditLog 
      ORDER BY EventTime DESC
    `);
    console.table(auditRes.recordset);

    console.log("--- settlement table rows (Recent) ---");
    const setRes = await pool.request().query(`
      SELECT TOP 20 OutletId, SettlementDate, CashierName, TotalSales, NetSales, Status, SettledAt, SettledBy 
      FROM settlement 
      ORDER BY SettlementDate DESC
    `);
    console.table(setRes.recordset);

  } catch (err) {
    console.error("Error querying audit logs:", err);
  } finally {
    process.exit(0);
  }
}

run();
