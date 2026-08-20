const sql = require("mssql");
const { poolPromise } = require("../config/db");

async function run() {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT d.OrderDetailId, d.OrderId, d.DishId, d.DishName, d.TakeawayCharge, d.isTakeAway, h.Tableno
      FROM RestaurantOrderDetailCur d
      JOIN RestaurantOrderCur h ON d.OrderId = h.OrderId
      WHERE h.isOrderClosed = 0
    `);
    console.log("Active Order Items in DB:", result.recordset);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
