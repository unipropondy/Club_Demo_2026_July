const { poolPromise } = require("../config/db");

async function check() {
  try {
    const pool = await poolPromise;
    console.log("Connected to DB.");

    // Query 1: PaymentDetailCur columns
    const pd = await pool.request().query(
      "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PaymentDetailCur' ORDER BY ORDINAL_POSITION"
    );
    console.log("\n===== PaymentDetailCur columns =====");
    pd.recordset.forEach(r => console.log(' -', r.COLUMN_NAME, ':', r.DATA_TYPE));

    // Query 2: SettlementHeader columns
    const sh = await pool.request().query(
      "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SettlementHeader' ORDER BY ORDINAL_POSITION"
    );
    console.log("\n===== SettlementHeader columns =====");
    sh.recordset.forEach(r => console.log(' -', r.COLUMN_NAME, ':', r.DATA_TYPE));

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
