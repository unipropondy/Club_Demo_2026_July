const { poolPromise } = require("./config/db");

async function run() {
  try {
    const pool = await poolPromise;
    const headerRes = await pool.query(`
      SELECT 
        SettlementID, BillNo, SubTotal, TotalTax, DiscountAmount, SysAmount, 
        RoundedBy, ServiceCharge, IsVIP, VIPDiscountAmount, CreatedOn, start_date
      FROM SettlementHeader
      WHERE start_date = '2026-08-24'
    `);
    console.log("=== SettlementHeader ===");
    console.log(JSON.stringify(headerRes.recordset, null, 2));

    const itemRes = await pool.query(`
      SELECT 
        SettlementID, DishName, Qty, Price, DiscountAmount, DiscountType, Status, VIPDiscountAmount
      FROM SettlementItemDetail
      WHERE start_date = '2026-08-24'
    `);
    console.log("\n=== SettlementItemDetail ===");
    console.log(JSON.stringify(itemRes.recordset, null, 2));

    const paymentsRes = await pool.query(`
      SELECT 
        PaymentId, Amount, Remarks, Paymode, isSettlement, start_date
      FROM PaymentDetailCur
      WHERE start_date = '2026-08-24'
    `);
    console.log("\n=== PaymentDetailCur ===");
    console.log(JSON.stringify(paymentsRes.recordset, null, 2));

    process.exit(0);
  } catch (err) {
    console.error("ERROR:", err);
    process.exit(1);
  }
}

run();
