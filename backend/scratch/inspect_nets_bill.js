const { poolPromise } = require('../config/db');

(async () => {
  try {
    const pool = await poolPromise;
    const sid = '7E224B3B-C1C8-4A87-B325-69DA7A6943C0';
    console.log('Target SettlementID:', sid);
    
    const pd = await pool.request().input('sid', sid).query("SELECT * FROM PaymentDetailCur WHERE RestaurantBillId = @sid");
    console.log('PaymentDetailCur:', pd.recordset);
    
    const pd2 = await pool.request().input('sid', sid).query("SELECT * FROM PaymentDetail WHERE RestaurantBillId = @sid");
    console.log('PaymentDetail:', pd2.recordset);
    
    const sts = await pool.request().input('sid', sid).query("SELECT * FROM SettlementTotalSales WHERE SettlementID = @sid");
    console.log('SettlementTotalSales:', sts.recordset);
    
    const sidItems = await pool.request().input('sid', sid).query("SELECT * FROM SettlementItemDetail WHERE SettlementID = @sid");
    console.log('SettlementItemDetail:', sidItems.recordset);
    
    const ci = await pool.request().input('sid', sid).query("SELECT * FROM CashInEntry WHERE ReferenceNo = CAST(@sid AS VARCHAR(50)) OR Remarks LIKE '%' + CAST(@sid AS VARCHAR(50)) + '%'");
    console.log('CashInEntry:', ci.recordset);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
})();
