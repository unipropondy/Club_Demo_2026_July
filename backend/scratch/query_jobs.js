const { poolPromise } = require("../config/db");
async function run() {
  const pool = await poolPromise;
  const res = await pool.request().query("SELECT TOP 5 * FROM PrintJobQueue ORDER BY CreatedOn DESC");
  console.log(res.recordset);
  process.exit(0);
}
run();
