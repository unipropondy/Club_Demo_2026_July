require("dotenv").config();
const { poolPromise } = require("../config/db");
const sql = require("mssql");

async function checkBubblyGroups() {
  const pool = await poolPromise;
  const res = await pool.request().query(`
    SELECT 
      sid.DishName,
      sid.SubCategoryName,
      dg.DishGroupName,
      SUM(sid.Qty) as Qty,
      SUM(CASE WHEN (ISNULL(sid.Qty, 0) * ISNULL(sid.Price, 0)) - (CASE WHEN sid.DiscountType = 'percentage' THEN (ISNULL(sid.Qty, 0) * ISNULL(sid.Price, 0)) * (ISNULL(sid.DiscountAmount, 0) / 100.0) ELSE ISNULL(sid.Qty, 0) * (CASE WHEN ISNULL(sid.DiscountAmount, 0) > sid.Price THEN sid.Price ELSE ISNULL(sid.DiscountAmount, 0) END) END) - ISNULL(sid.VIPDiscountAmount, 0) < 0 THEN 0 ELSE (ISNULL(sid.Qty, 0) * ISNULL(sid.Price, 0)) - (CASE WHEN sid.DiscountType = 'percentage' THEN (ISNULL(sid.Qty, 0) * ISNULL(sid.Price, 0)) * (ISNULL(sid.DiscountAmount, 0) / 100.0) ELSE ISNULL(sid.Qty, 0) * (CASE WHEN ISNULL(sid.DiscountAmount, 0) > sid.Price THEN sid.Price ELSE ISNULL(sid.DiscountAmount, 0) END) END) - ISNULL(sid.VIPDiscountAmount, 0) END) as TotalAmount
    FROM SettlementHeader sh
    INNER JOIN SettlementItemDetail sid ON sh.SettlementID = sid.SettlementID
    LEFT JOIN DishGroupMaster dg ON sid.DishGroupId = dg.DishGroupId
    WHERE (sid.DishName LIKE '%Bubbly%' OR sid.DishName LIKE '%BUBBLY%')
      AND sh.IsCancelled = 0
      AND ISNULL(sh.OrderType, '') <> 'CASHBOX'
      AND ISNULL(sid.Status, 'NORMAL') <> 'VOIDED'
      AND sid.OrderDateTime >= '2026-06-11 00:00:00'
      AND sid.OrderDateTime < '2026-08-14 00:00:00'
    GROUP BY sid.DishName, sid.SubCategoryName, dg.DishGroupName
  `);
  console.log(res.recordset);
  process.exit(0);
}

checkBubblyGroups().catch(err => {
  console.error(err);
  process.exit(1);
});
