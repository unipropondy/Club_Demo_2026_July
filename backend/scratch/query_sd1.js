const { poolPromise } = require('../config/db');

(async () => {
  try {
    const pool = await poolPromise;
    const res = await pool.request().query("SELECT DishId, Name, DishCode FROM DishMaster WHERE DishCode = 'SD1' OR Name LIKE '%Pepsi%'");
    console.log('Dish info:', res.recordset);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
