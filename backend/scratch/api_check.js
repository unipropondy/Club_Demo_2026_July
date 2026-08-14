const { poolPromise } = require("../config/db");

async function check() {
  try {
    const pool = await poolPromise;
    console.log("Connected to DB.");

    const dateStr = "2026-08-13";

    // 1. Total Sales Query
    const totalSalesRes = await pool.request().query(`
      SELECT
        ISNULL(SUM(SubTotal),0) AS SubTotal,
        ISNULL(SUM(DiscountAmount),0) AS DiscountAmount,
        ISNULL(SUM(VIPDiscountAmount),0) AS VIPDiscountAmount,
        ISNULL(SUM(ServiceCharge),0) AS ServiceCharge,
        ISNULL(SUM(TotalTax),0) AS TotalTax,
        ISNULL(SUM(RoundedBy),0) AS RoundedBy,
        COUNT(*) AS InvoiceCount,
        ISNULL(SUM(SysAmount),0) AS NetTotal
      FROM SettlementHeader
      WHERE IsCancelled = 0 AND start_date = '${dateStr}'
    `);
    console.log("\n=== API: total-sales ===");
    console.log(totalSalesRes.recordset[0]);

    // 2. Payment Query
    const paymentRes = await pool.request().query(`
      SELECT
        CASE WHEN UPPER(LTRIM(RTRIM(ISNULL(Remarks, '')))) = 'CAS' THEN 'CASH' ELSE LTRIM(RTRIM(ISNULL(Remarks, ''))) END AS PaymodeName,
        ISNULL(SUM(Amount), 0) AS Amount,
        COUNT(*) AS PayCount
      FROM PaymentDetailCur
      WHERE start_date = '${dateStr}'
      GROUP BY 
        CASE WHEN UPPER(LTRIM(RTRIM(ISNULL(Remarks, '')))) = 'CAS' THEN 'CASH' ELSE LTRIM(RTRIM(ISNULL(Remarks, ''))) END
    `);
    console.log("\n=== API: payment ===");
    console.table(paymentRes.recordset);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
