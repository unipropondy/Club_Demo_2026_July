const sql = require("mssql");
const { poolPromise } = require("../config/db");

async function migrate() {
  const pool = await poolPromise;
  console.log("📋 Starting cash payment migration to CashInEntry...");

  // 1. Migrate active day cash payments (PaymentDetailCur)
  const queryCur = `
    SELECT 
      pd.PaymentId,
      pd.RestaurantBillId,
      pd.Amount,
      pd.CreatedBy,
      pd.CreatedOn,
      pd.start_date,
      pd.Remarks,
      sh.TerminalCode
    FROM PaymentDetailCur pd
    LEFT JOIN SettlementHeader sh ON pd.RestaurantBillId = sh.SettlementID
    WHERE (pd.Remarks IN ('Cash', 'Cash Box Entry', 'CASH', 'CASHBOX', 'CASH BOX') OR pd.Paymode = 1)
      AND NOT EXISTS (
        SELECT 1 FROM CashInEntry ci 
        WHERE ci.ReferenceNo = CAST(pd.RestaurantBillId AS VARCHAR(100))
           OR ci.Remarks LIKE '%' + CAST(pd.RestaurantBillId AS VARCHAR(100)) + '%'
      )
  `;

  const resultCur = await pool.request().query(queryCur);
  const paymentsCurToMigrate = resultCur.recordset;
  console.log(`🔍 Found ${paymentsCurToMigrate.length} active cash payments to migrate.`);

  for (const pm of paymentsCurToMigrate) {
    const cashierId = pm.CreatedBy;
    let cashierName = 'Admin';
    if (cashierId && cashierId !== '00000000-0000-0000-0000-000000000000') {
      const userRes = await pool.request()
        .input("UserId", sql.UniqueIdentifier, cashierId)
        .query("SELECT TOP 1 UserName FROM UserMaster WHERE UserId = @UserId");
      if (userRes.recordset.length > 0) {
        cashierName = userRes.recordset[0].UserName;
      }
    }

    const dateStr = new Date(pm.CreatedOn).toISOString().slice(0, 10).replace(/-/g, '');
    const randId = Math.floor(1000 + Math.random() * 9000);
    const cashInNo = `CI-${dateStr}-${randId}`;
    const reason = pm.Remarks === 'Cash Box Entry' ? 'Cash Box Entry' : 'Cash Sale';

    await pool.request()
      .input('CashInNo', sql.VarChar, cashInNo)
      .input('Amount', sql.Decimal(18, 2), pm.Amount)
      .input('Reason', sql.VarChar, reason)
      .input('Remarks', sql.VarChar, `Migrated Auto Cash In from BILL: ${pm.RestaurantBillId}`)
      .input('PaymentMode', sql.VarChar, 'Cash')
      .input('ReferenceNo', sql.VarChar, pm.RestaurantBillId)
      .input('TerminalCode', sql.VarChar, pm.TerminalCode || '')
      .input('CreatedBy', sql.VarChar, cashierName)
      .input('CreatedOn', sql.DateTime, pm.CreatedOn)
      .input('startDate', sql.Date, pm.start_date)
      .query(`
        INSERT INTO CashInEntry (CashInNo, CashInDate, Amount, Reason, Remarks, PaymentMode, ReferenceNo, TerminalCode, CreatedBy, CreatedOn, start_date)
        VALUES (@CashInNo, @CreatedOn, @Amount, @Reason, @Remarks, @PaymentMode, @ReferenceNo, @TerminalCode, @CreatedBy, @CreatedOn, @startDate)
      `);
    console.log(`✅ Migrated active cash payment of ${pm.Amount} for bill ${pm.RestaurantBillId}`);
  }

  // 2. Migrate historical cash payments (PaymentDetail)
  const queryHist = `
    SELECT 
      pd.PaymentId,
      pd.RestaurantBillId,
      pd.Amount,
      pd.CreatedBy,
      pd.CreatedOn,
      pd.start_date,
      pd.Remarks,
      sh.TerminalCode
    FROM PaymentDetail pd
    LEFT JOIN SettlementHeader sh ON pd.RestaurantBillId = sh.SettlementID
    WHERE (pd.Remarks IN ('Cash', 'Cash Box Entry', 'CASH', 'CASHBOX', 'CASH BOX') OR pd.Paymode = 1)
      AND NOT EXISTS (
        SELECT 1 FROM CashInEntry ci 
        WHERE ci.ReferenceNo = CAST(pd.RestaurantBillId AS VARCHAR(100))
           OR ci.Remarks LIKE '%' + CAST(pd.RestaurantBillId AS VARCHAR(100)) + '%'
      )
  `;

  const resultHist = await pool.request().query(queryHist);
  const paymentsHistToMigrate = resultHist.recordset;
  console.log(`🔍 Found ${paymentsHistToMigrate.length} historical cash payments to migrate.`);

  for (const pm of paymentsHistToMigrate) {
    const cashierId = pm.CreatedBy;
    let cashierName = 'Admin';
    if (cashierId && cashierId !== '00000000-0000-0000-0000-000000000000') {
      const userRes = await pool.request()
        .input("UserId", sql.UniqueIdentifier, cashierId)
        .query("SELECT TOP 1 UserName FROM UserMaster WHERE UserId = @UserId");
      if (userRes.recordset.length > 0) {
        cashierName = userRes.recordset[0].UserName;
      }
    }

    const dateStr = new Date(pm.CreatedOn).toISOString().slice(0, 10).replace(/-/g, '');
    const randId = Math.floor(1000 + Math.random() * 9000);
    const cashInNo = `CI-${dateStr}-${randId}`;
    const reason = pm.Remarks === 'Cash Box Entry' ? 'Cash Box Entry' : 'Cash Sale';

    await pool.request()
      .input('CashInNo', sql.VarChar, cashInNo)
      .input('Amount', sql.Decimal(18, 2), pm.Amount)
      .input('Reason', sql.VarChar, reason)
      .input('Remarks', sql.VarChar, `Migrated Auto Cash In from BILL: ${pm.RestaurantBillId}`)
      .input('PaymentMode', sql.VarChar, 'Cash')
      .input('ReferenceNo', sql.VarChar, pm.RestaurantBillId)
      .input('TerminalCode', sql.VarChar, pm.TerminalCode || '')
      .input('CreatedBy', sql.VarChar, cashierName)
      .input('CreatedOn', sql.DateTime, pm.CreatedOn)
      .input('startDate', sql.Date, pm.start_date)
      .query(`
        INSERT INTO CashInEntry (CashInNo, CashInDate, Amount, Reason, Remarks, PaymentMode, ReferenceNo, TerminalCode, CreatedBy, CreatedOn, start_date)
        VALUES (@CashInNo, @CreatedOn, @Amount, @Reason, @Remarks, @PaymentMode, @ReferenceNo, @TerminalCode, @CreatedBy, @CreatedOn, @startDate)
      `);
    console.log(`✅ Migrated historical cash payment of ${pm.Amount} for bill ${pm.RestaurantBillId}`);
  }

  console.log("🎉 Migration successfully completed!");
  process.exit(0);
}

migrate().catch(err => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
