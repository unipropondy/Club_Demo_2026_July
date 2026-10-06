const { poolPromise } = require('../config/db');

poolPromise.then(async (pool) => {
  try {
    console.log('=== FIXING DATABASE PAYMENT DATES GLOBALLY ===');

    // 1. PaymentDetailCur
    const resPdc = await pool.request().query(`
      UPDATE pd
      SET pd.start_date = sh.start_date,
          pd.PaymentCollectedOn = sh.LastSettlementDate,
          pd.CreatedOn = sh.CreatedOn,
          pd.ModifiedOn = sh.CreatedOn
      FROM PaymentDetailCur pd
      INNER JOIN SettlementHeader sh ON pd.RestaurantBillId = sh.SettlementID
      WHERE CAST(pd.start_date AS DATE) <> CAST(sh.start_date AS DATE)
    `);
    console.log(`Updated PaymentDetailCur rows: ${resPdc.rowsAffected[0]}`);

    // 2. PaymentDetail
    const resPd = await pool.request().query(`
      UPDATE pd
      SET pd.start_date = sh.start_date,
          pd.PaymentCollectedOn = sh.LastSettlementDate,
          pd.CreatedOn = sh.CreatedOn,
          pd.ModifiedOn = sh.CreatedOn
      FROM PaymentDetail pd
      INNER JOIN SettlementHeader sh ON pd.RestaurantBillId = sh.SettlementID
      WHERE CAST(pd.start_date AS DATE) <> CAST(sh.start_date AS DATE)
    `);
    console.log(`Updated PaymentDetail rows: ${resPd.rowsAffected[0]}`);

    // 3. PaymentTransactionDetails
    const resPtd = await pool.request().query(`
      UPDATE ptd
      SET ptd.CreatedDate = sh.LastSettlementDate
      FROM PaymentTransactionDetails ptd
      INNER JOIN SettlementHeader sh ON ptd.ReferenceId = sh.SettlementID
      WHERE CAST(ptd.CreatedDate AS DATE) <> CAST(sh.start_date AS DATE)
    `);
    console.log(`Updated PaymentTransactionDetails rows: ${resPtd.rowsAffected[0]}`);

    // 4. CustomerCreditTransactions
    const resCct = await pool.request().query(`
      UPDATE cct
      SET cct.start_date = sh.start_date,
          cct.CreatedDate = sh.LastSettlementDate
      FROM CustomerCreditTransactions cct
      INNER JOIN SettlementHeader sh ON cct.SettlementId = sh.SettlementID
      WHERE CAST(ISNULL(cct.start_date, cct.CreatedDate) AS DATE) <> CAST(sh.start_date AS DATE)
    `);
    console.log(`Updated CustomerCreditTransactions rows: ${resCct.rowsAffected[0]}`);

    // 5. CashInEntry
    const resCi = await pool.request().query(`
      UPDATE ci
      SET ci.start_date = sh.start_date,
          ci.CreatedOn = sh.LastSettlementDate,
          ci.CashInDate = sh.LastSettlementDate
      FROM CashInEntry ci
      INNER JOIN SettlementHeader sh ON ci.ReferenceNo = CAST(sh.SettlementID AS VARCHAR(50))
      WHERE CAST(ci.start_date AS DATE) <> CAST(sh.start_date AS DATE)
    `);
    console.log(`Updated CashInEntry rows: ${resCi.rowsAffected[0]}`);

    console.log('✅ Global DB fix complete!');

  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
});
