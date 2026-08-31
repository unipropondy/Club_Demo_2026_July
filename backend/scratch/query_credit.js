const { poolPromise } = require("../config/db");

async function run() {
  try {
    const pool = await poolPromise;
    console.log("Searching PaymentTransactionDetails for large ledger payments...");

    const res = await pool.query(`
      SELECT * 
      FROM PaymentTransactionDetails 
      WHERE Amount IN (545, 2202.89)
    `);
    console.log("\n=== Matches ===");
    console.table(res.recordset);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
