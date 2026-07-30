const { poolPromise } = require('./config/db');

(async () => {
  try {
    const pool = await poolPromise;
    const curCols = await pool.request().query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'RestaurantOrderDetailCur'"
    );
    const histCols = await pool.request().query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'RestaurantOrderDetail'"
    );
    console.log('Cur columns:', curCols.recordset.map(r => r.COLUMN_NAME));
    console.log('Hist columns:', histCols.recordset.map(r => r.COLUMN_NAME));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
