const sql = require("mssql");
const { poolPromise } = require("../config/db");

async function run() {
  try {
    const pool = await poolPromise;
    const groups = await pool.request().query(`
      SELECT cgm.ComboGroupId, cgm.ParentComboDishId, cgm.GroupName, d.Name AS ParentName
      FROM ComboGroupMaster cgm
      LEFT JOIN DishMaster d ON cgm.ParentComboDishId = d.DishId
    `);
    console.log("Combo Groups in DB:", groups.recordset);

    const mappings = await pool.request().query(`
      SELECT m.ComboGroupId, m.DishId, d.Name AS DishName
      FROM ComboGroupDishMapping m
      LEFT JOIN DishMaster d ON m.DishId = d.DishId
    `);
    console.log("Combo Group Dish Mappings in DB:", mappings.recordset);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
