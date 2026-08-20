const { poolPromise } = require("../config/db");
async function run() {
  const pool = await poolPromise;
  const res = await pool.request().query("SELECT * FROM PrintMaster WHERE IsActive = 1");
  console.log(res.recordset);
  process.exit(0);
}
run();
