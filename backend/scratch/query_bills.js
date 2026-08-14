const { poolPromise, sql } = require("../config/db");

async function run() {
  const pool = await poolPromise;
  
  try {
    console.log("--- Checking Recent SettlementHeader rows ---");
    const shRes = await pool.request().query(`
      SELECT TOP 20 SettlementID, OrderId, BillNo, LastSettlementDate, start_date, OrderType, SysAmount 
      FROM SettlementHeader 
      ORDER BY LastSettlementDate DESC
    `);
    console.table(shRes.recordset);

    console.log("--- Checking SettlementHeader rows for Aug 11 & 12 ---");
    const shDateRes = await pool.request().query(`
      SELECT SettlementID, OrderId, BillNo, LastSettlementDate, start_date, OrderType, SysAmount 
      FROM SettlementHeader 
      WHERE LastSettlementDate >= '2026-08-11 00:00:00' AND LastSettlementDate <= '2026-08-13 23:59:59'
    `);
    console.table(shDateRes.recordset);

  } catch (err) {
    console.error("Error running query:", err);
  } finally {
    process.exit(0);
  }
}

run();
