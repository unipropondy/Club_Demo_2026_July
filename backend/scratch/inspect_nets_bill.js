const { poolPromise } = require('../config/db');

poolPromise.then(async (pool) => {
  try {
    console.log('=== SEARCHING FOR ORDER 20260917-0005 ===');
    const sid = '7E224B3B-C1C8-4A87-B325-69DA7A6943C0';

    const sh = (await pool.request().input('Sid', sid).query(`
      SELECT SettlementID, BillNo, SysAmount, start_date, LastSettlementDate, CreatedOn
      FROM SettlementHeader WHERE SettlementID = @Sid
    `)).recordset[0];
    console.log('SettlementHeader:', sh);

    const pdc = (await pool.request().input('Sid', sid).query(`
      SELECT PaymentId, Paymode, Amount, Remarks, start_date, PaymentCollectedOn, CreatedOn FROM PaymentDetailCur WHERE RestaurantBillId = @Sid
    `)).recordset;
    console.log('PaymentDetailCur:', pdc);

    const pd = (await pool.request().input('Sid', sid).query(`
      SELECT PaymentId, Paymode, Amount, Remarks, start_date, PaymentCollectedOn, CreatedOn FROM PaymentDetail WHERE RestaurantBillId = @Sid
    `)).recordset;
    console.log('PaymentDetail:', pd);

    const ptd = (await pool.request().input('Sid', sid).query(`
      SELECT PaymentTransactionId, PayModeId, Amount, CreatedDate FROM PaymentTransactionDetails WHERE ReferenceId = @Sid
    `)).recordset;
    console.log('PaymentTransactionDetails:', ptd);

    const cct = (await pool.request().input('Sid', sid).query(`
      SELECT TransactionId, TransactionType, OutstandingAmount, PaidAmount, PaymentMethod, CreatedDate FROM CustomerCreditTransactions WHERE SettlementId = @Sid
    `)).recordset;
    console.log('CustomerCreditTransactions:', cct);

    const ci = (await pool.request().input('Sid', sid).query(`
      SELECT CashInId, CashInNo, Amount, start_date, CreatedOn FROM CashInEntry WHERE ReferenceNo = CAST(@Sid AS VARCHAR(50)) OR Remarks LIKE '%' + CAST(@Sid AS VARCHAR(50)) + '%'
    `)).recordset;
    console.log('CashInEntry:', ci);

  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
});
