const sql = require("mssql");
const { poolPromise } = require("../config/db");

async function run() {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT dmap.DishId, d.Name AS DishName, dmap.DishGroupId, dg.DishGroupName
      FROM DishGroupMapping dmap
      INNER JOIN DishGroupMaster dg ON dmap.DishGroupId = dg.DishGroupId
      INNER JOIN DishMaster d ON dmap.DishId = d.DishId
      WHERE d.Name = 'Heineken' OR d.Name = 'Tiger'
    `);
    console.log("DishGroupMapping records:", result.recordset);
    console.log("All Heineken dishes:", result.recordset);
    console.log("Heineken Dish Group info:", result.recordset);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
