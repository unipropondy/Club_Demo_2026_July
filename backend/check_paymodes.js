const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });
const sql = require("mssql");
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT || "1433"),
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function main() {
  try {
    const pool = await sql.connect(config);
    console.log("Connected to SQL Server");

    console.log("--- PAYMODES ---");
    const paymodes = await pool.request().query("SELECT * FROM Paymode");
    console.log(JSON.stringify(paymodes.recordset, null, 2));

    await sql.close();
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
