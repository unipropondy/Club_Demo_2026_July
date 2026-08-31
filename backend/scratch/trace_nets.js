const { poolPromise } = require('../config/db');
poolPromise.then(async p => {
  try {
    console.log('--- ALL PAYMENTDETAILCUR NETS RECORDS FOR 2026-08-27 ---');
    const res1 = await p.request().query("SELECT * FROM PaymentDetailCur WHERE start_date = '2026-08-27' AND Remarks LIKE '%NETS%'");
    console.log(JSON.stringify(res1.recordset, null, 2));

    console.log('\n--- ALL LEDGER PAYMENTTRANSACTIONDETAILS RECORDS FOR 2026-08-27 ---');
    const res2 = await p.request().query(`
      SELECT ptd.*, pm.PayMode 
      FROM PaymentTransactionDetails ptd
      INNER JOIN Paymode pm ON ptd.PayModeId = pm.Position
      WHERE CAST(ptd.CreatedDate AS DATE) = '2026-08-27' AND pm.PayMode LIKE '%NETS%'
    `);
    console.log(JSON.stringify(res2.recordset, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
});
