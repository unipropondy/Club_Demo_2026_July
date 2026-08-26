const { poolPromise } = require("./config/db");

async function run() {
  try {
    const pool = await poolPromise;
    const res = await pool.query(`
      SELECT 
        Remarks,
        SUM(Amount) as TotalAmount,
        COUNT(*) as Count
      FROM PaymentDetailCur
      WHERE start_date = '2026-08-24'
      GROUP BY Remarks
    `);
    console.log("=== Payments by Remarks ===");
    console.log(JSON.stringify(res.recordset, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("ERROR:", err);
    process.exit(1);
  }
}

run();
