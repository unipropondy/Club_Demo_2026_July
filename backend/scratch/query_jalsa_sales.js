const { poolPromise } = require("../config/db");

async function run() {
  try {
    const pool = await poolPromise;
    const startDate = "2026-06-01";
    const endDate = "2026-08-12";

    // Query 1: Find count of NULL start_date in SettlementHeader
    const nullStartDateRes = await pool.request().query(`
      SELECT 
        COUNT(*) as TotalCount,
        SUM(CASE WHEN start_date IS NULL THEN 1 ELSE 0 END) as NullStartDateCount,
        SUM(CASE WHEN start_date IS NOT NULL THEN 1 ELSE 0 END) as NotNullStartDateCount
      FROM SettlementHeader sh
      WHERE COALESCE(sh.start_date, CAST(sh.LastSettlementDate AS DATE)) >= '${startDate}'
        AND COALESCE(sh.start_date, CAST(sh.LastSettlementDate AS DATE)) <= '${endDate}'
    `);
    console.log("Null start_date stats:", nullStartDateRes.recordset[0]);

    // Query 2: Let's check the date bounds if we use sh.start_date directly vs COALESCE
    const comparisonRes = await pool.request().query(`
      SELECT 
        COUNT(*) as CountDirect,
        SUM(SysAmount) as SumDirect
      FROM SettlementHeader
      WHERE start_date >= '${startDate}' AND start_date <= '${endDate}'
    `);
    console.log("Using start_date directly:", comparisonRes.recordset[0]);

  } catch (err) {
    console.error("Error running query:", err);
  } finally {
    process.exit(0);
  }
}

run();
