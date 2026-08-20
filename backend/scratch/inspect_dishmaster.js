const { poolPromise } = require('../config/db');

async function inspectDishMaster() {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT DishId, Name, TakeawayCharge 
      FROM DishMaster 
      WHERE DishGroupId = '79A30579-CB8A-48B1-859D-11BCEC4B7E45'
    `);
    console.log('Beer records in DishMaster:', result.recordset);
  } catch (err) {
    console.error('Database query error:', err);
  } finally {
    process.exit(0);
  }
}

inspectDishMaster();
