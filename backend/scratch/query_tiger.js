const { poolPromise } = require("../config/db");

async function run() {
  try {
    const pool = await poolPromise;
    console.log("=== SettlementItemDetail for Tiger ===");
    const res1 = await pool.request().query(`
      SELECT SettlementID, DishName, Qty, Price, DiscountType, DiscountAmount, VIPDiscountAmount, Status
      FROM SettlementItemDetail
      WHERE DishName LIKE '%Tiger%'
    `);
    console.log(res1.recordset);

    console.log("=== SettlementHeader for 20260813-0001 ===");
    const res2 = await pool.request().query(`
      SELECT SettlementID, BillNo, IsCancelled, LastSettlementDate
      FROM SettlementHeader
      WHERE BillNo = '20260813-0001'
    `);
    console.log(res2.recordset);

    if (res2.recordset.length > 0) {
      const settId = res2.recordset[0].SettlementID;
      console.log("=== SettlementItemDetail for 20260813-0001 ===");
      const res3 = await pool.request()
        .input('settId', settId)
        .query(`
          SELECT SettlementID, DishName, Qty, Price, DiscountType, DiscountAmount, VIPDiscountAmount, Status
          FROM SettlementItemDetail
          WHERE SettlementID = @settId
        `);
      console.log(res3.recordset);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
