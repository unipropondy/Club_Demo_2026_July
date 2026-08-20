const { poolPromise } = require('../config/db');

async function checkHeineken() {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT DishId, Name, TakeawayCharge 
      FROM DishMaster 
      WHERE Name LIKE '%Heineken%' OR Name LIKE '%Hein%'
    `);
    console.log('Heineken database records:', result.recordset);
  } catch (err) {
    console.error('Database query error:', err);
  } finally {
    process.exit(0);
  }
}

checkHeineken();
