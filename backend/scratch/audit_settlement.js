const { poolPromise } = require("../config/db");

async function audit() {
  try {
    const pool = await poolPromise;
    console.log("Connected to database.");

    const formattedDate = "2026-08-13";

    // Join query
    const auditRes = await pool.request().query(`
      SELECT
        sh.BillNo,
        sh.SubTotal,
        sh.ServiceCharge,
        sh.TotalTax,
        sh.RoundedBy,
        sh.SysAmount as NetBillAmount,
        pd.Remarks as Paymode,
        pd.Amount as PaidAmount,
        (pd.Amount - sh.SysAmount) as Discrepancy
      FROM SettlementHeader sh
      LEFT JOIN PaymentDetailCur pd ON sh.SettlementID = pd.PaymentId
      WHERE sh.IsCancelled = 0 AND sh.start_date = '${formattedDate}'
    `);
    console.log("\n=== Settlement Audit for 2026-08-13 ===");
    console.table(auditRes.recordset);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

audit();
