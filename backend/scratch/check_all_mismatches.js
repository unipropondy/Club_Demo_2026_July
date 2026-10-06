const { poolPromise } = require('../config/db');

poolPromise.then(async (pool) => {
  try {
    console.log('=== CHECKING ALL MISMATCHES BETWEEN SETTLEMENTHEADER AND PAYMENT TABLES ===');

    const pdcMismatches = (await pool.request().query(`
      SELECT pd.PaymentId, pd.RestaurantBillId, sh.BillNo, pd.Paymode, pd.Amount, pd.Remarks, 
             pd.start_date AS PaymentStartDate, sh.start_date AS HeaderStartDate,
             pd.PaymentCollectedOn, sh.LastSettlementDate, sh.CreatedOn AS HeaderCreatedOn
      FROM PaymentDetailCur pd
      INNER JOIN SettlementHeader sh ON pd.RestaurantBillId = sh.SettlementID
      WHERE CAST(pd.start_date AS DATE) <> CAST(sh.start_date AS DATE)
    `)).recordset;

    console.log(`Found ${pdcMismatches.length} mismatches in PaymentDetailCur:`, pdcMismatches);

    const pdMismatches = (await pool.request().query(`
      SELECT pd.PaymentId, pd.RestaurantBillId, sh.BillNo, pd.Paymode, pd.Amount, pd.Remarks, 
             pd.start_date AS PaymentStartDate, sh.start_date AS HeaderStartDate,
             pd.PaymentCollectedOn, sh.LastSettlementDate, sh.CreatedOn AS HeaderCreatedOn
      FROM PaymentDetail pd
      INNER JOIN SettlementHeader sh ON pd.RestaurantBillId = sh.SettlementID
      WHERE CAST(pd.start_date AS DATE) <> CAST(sh.start_date AS DATE)
    `)).recordset;

    console.log(`Found ${pdMismatches.length} mismatches in PaymentDetail:`, pdMismatches);

    const ptdMismatches = (await pool.request().query(`
      SELECT ptd.PaymentTransactionId, ptd.ReferenceId, sh.BillNo, ptd.Amount, 
             ptd.CreatedDate AS TransactionDate, sh.start_date AS HeaderStartDate, sh.LastSettlementDate
      FROM PaymentTransactionDetails ptd
      INNER JOIN SettlementHeader sh ON ptd.ReferenceId = sh.SettlementID
      WHERE CAST(ptd.CreatedDate AS DATE) <> CAST(sh.start_date AS DATE)
    `)).recordset;

    console.log(`Found ${ptdMismatches.length} mismatches in PaymentTransactionDetails:`, ptdMismatches);

    const cctMismatches = (await pool.request().query(`
      SELECT cct.TransactionId, cct.SettlementId, sh.BillNo, cct.PaidAmount, cct.OutstandingAmount,
             cct.CreatedDate, cct.start_date AS CctStartDate, sh.start_date AS HeaderStartDate
      FROM CustomerCreditTransactions cct
      INNER JOIN SettlementHeader sh ON cct.SettlementId = sh.SettlementID
      WHERE CAST(ISNULL(cct.start_date, cct.CreatedDate) AS DATE) <> CAST(sh.start_date AS DATE)
    `)).recordset;

    console.log(`Found ${cctMismatches.length} mismatches in CustomerCreditTransactions:`, cctMismatches);

    const ciMismatches = (await pool.request().query(`
      SELECT ci.CashInId, ci.ReferenceNo, sh.BillNo, ci.Amount, 
             ci.start_date AS CashInStartDate, sh.start_date AS HeaderStartDate
      FROM CashInEntry ci
      INNER JOIN SettlementHeader sh ON ci.ReferenceNo = CAST(sh.SettlementID AS VARCHAR(50))
      WHERE CAST(ci.start_date AS DATE) <> CAST(sh.start_date AS DATE)
    `)).recordset;

    console.log(`Found ${ciMismatches.length} mismatches in CashInEntry:`, ciMismatches);

  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
});
