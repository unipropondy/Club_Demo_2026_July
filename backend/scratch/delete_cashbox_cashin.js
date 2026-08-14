const { poolPromise } = require("../config/db");

async function run() {
  const pool = await poolPromise;
  console.log("📋 Deleting Cash Box Entry records from CashInEntry table...");
  const result = await pool.request().query(`
    DELETE FROM CashInEntry 
    WHERE Reason = 'Cash Box Entry'
  `);
  console.log(`✅ Completed successfully. Rows affected: ${result.rowsAffected[0]}`);
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
