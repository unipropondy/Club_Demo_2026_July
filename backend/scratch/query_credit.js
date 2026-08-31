const { poolPromise } = require("../config/db");

async function run() {
  try {
    const pool = await poolPromise;
    console.log("Querying Javi's credit transactions...");

    const res = await pool.query(`
      SELECT 
        TransactionId,
        TransactionType,
        BillNo,
        BillAmount,
        PaidAmount,
        OutstandingAmount,
        CreatedDate
      FROM CustomerCreditTransactions
      WHERE MemberId = '86D08496-9277-454E-B43D-EC37B27D6CAB'
      ORDER BY CreatedDate ASC
    `);
    console.table(res.recordset);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
