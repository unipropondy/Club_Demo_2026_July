const { poolPromise } = require("../config/db");

async function query() {
  try {
    const pool = await poolPromise;
    console.log("Connected to database.");

    const schemaRes = await pool.request().query(`
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'CashOutEntry'
    `);

    console.log("\n=== CashOutEntry Columns ===");
    console.table(schemaRes.recordset);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

query();
