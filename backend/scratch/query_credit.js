const { poolPromise } = require("../config/db");

async function run() {
  try {
    const pool = await poolPromise;
    console.log("Checking all activities for 2026-08-31...");

    // Settlements on 2026-08-31
    const sh = await pool.query(`
      SELECT SettlementID, BillNo, SysAmount, CreatedOn, start_date, IsCancelled
      FROM SettlementHeader
      WHERE start_date = '2026-08-31' OR CreatedOn >= '2026-08-31'
    `);
    console.log("\n=== SettlementHeader for 2026-08-31 ===");
    console.table(sh.recordset);

    // Payments on 2026-08-31
    const pd = await pool.query(`
      SELECT PaymentId, RestaurantBillId, Amount, Remarks, CreatedOn, start_date
      FROM PaymentDetailCur
      WHERE start_date = '2026-08-31' OR CreatedOn >= '2026-08-31'
    `);
    console.log("\n=== PaymentDetailCur for 2026-08-31 ===");
    console.table(pd.recordset);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
