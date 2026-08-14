require("dotenv").config();
const { poolPromise } = require("../config/db");
const sql = require("mssql");

async function checkCounts() {
  const pool = await poolPromise;
  
  const tables = [
    { name: "SettlementHeader", dateCol: "start_date" },
    { name: "SettlementItemDetail", dateCol: "start_date" },
    { name: "PaymentDetail", dateCol: "start_date" },
    { name: "PaymentDetailCur", dateCol: "start_date" },
    { name: "RestaurantInvoice", dateCol: "start_date" },
    { name: "RestaurantInvoicecur", dateCol: "start_date" },
    { name: "RestaurantOrder", dateCol: "start_date" },
    { name: "RestaurantOrderCur", dateCol: "start_date" },
    { name: "ArtistCashBox", dateCol: "start_date" },
    { name: "OpeningCashDenomination", dateCol: "start_date" },
    { name: "CashInEntry", dateCol: "start_date" },
    { name: "CashOutEntry", dateCol: "start_date" },
    { name: "CustomerCreditTransactions", dateCol: "CreatedDate" },
    { name: "settlement", dateCol: "SettlementDate" },
    { name: "DateEntry", dateCol: "StartDate" },
    { name: "BusinessDayLog", dateCol: "BusinessDate" },
    { name: "dishOrderItemShare", dateCol: "FromDate" }
  ];

  console.log("=== RECORD COUNTS BY BUSINESS DATE ===");
  for (const t of tables) {
    try {
      const res = await pool.request().query(`
        SELECT 
          CAST(${t.dateCol} AS DATE) as DateVal,
          COUNT(*) as CountVal
        FROM [dbo].[${t.name}]
        WHERE CAST(${t.dateCol} AS DATE) BETWEEN '2026-08-10' AND '2026-08-13'
        GROUP BY CAST(${t.dateCol} AS DATE)
        ORDER BY DateVal
      `);
      if (res.recordset.length > 0) {
        console.log(`\nTable: ${t.name} (grouped by ${t.dateCol})`);
        res.recordset.forEach(r => {
          const dateStr = r.DateVal instanceof Date ? r.DateVal.toISOString().split("T")[0] : String(r.DateVal);
          console.log(`  ${dateStr}: ${r.CountVal} row(s)`);
        });
      }
    } catch (err) {
      console.log(`Table ${t.name} query failed: ${err.message}`);
    }
  }

  process.exit(0);
}

checkCounts().catch(err => {
  console.error(err);
  process.exit(1);
});
