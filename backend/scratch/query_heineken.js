const { poolPromise } = require("../config/db");

async function run() {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT DishId, Name, TakeawayCharge 
      FROM DishMaster 
      WHERE Name LIKE '%Heineken%' OR Name LIKE '%Beer%'
    `);
    console.log("Database results:", result.recordset);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
