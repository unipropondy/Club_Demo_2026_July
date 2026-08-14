require("dotenv").config();
const { poolPromise } = require("../config/db");
const sql = require("mssql");

async function checkArtistSales() {
  const pool = await poolPromise;

  console.log("=== BUBBLY SALES BY TYPE ===");
  // Query 1: SettlementItemDetail sales for Bubbly
  const resApp = await pool.request().query(`
    SELECT 
      sid.DishName,
      SUM(sid.Qty) as Qty,
      SUM(CASE WHEN (ISNULL(sid.Qty, 0) * ISNULL(sid.Price, 0)) - (CASE WHEN sid.DiscountType = 'percentage' THEN (ISNULL(sid.Qty, 0) * ISNULL(sid.Price, 0)) * (ISNULL(sid.DiscountAmount, 0) / 100.0) ELSE ISNULL(sid.Qty, 0) * (CASE WHEN ISNULL(sid.DiscountAmount, 0) > sid.Price THEN sid.Price ELSE ISNULL(sid.DiscountAmount, 0) END) END) - ISNULL(sid.VIPDiscountAmount, 0) < 0 THEN 0 ELSE (ISNULL(sid.Qty, 0) * ISNULL(sid.Price, 0)) - (CASE WHEN sid.DiscountType = 'percentage' THEN (ISNULL(sid.Qty, 0) * ISNULL(sid.Price, 0)) * (ISNULL(sid.DiscountAmount, 0) / 100.0) ELSE ISNULL(sid.Qty, 0) * (CASE WHEN ISNULL(sid.DiscountAmount, 0) > sid.Price THEN sid.Price ELSE ISNULL(sid.DiscountAmount, 0) END) END) - ISNULL(sid.VIPDiscountAmount, 0) END) as TotalAmount
    FROM SettlementHeader sh
    INNER JOIN SettlementItemDetail sid ON sh.SettlementID = sid.SettlementID
    WHERE (sid.DishName LIKE '%Bubbly%' OR sid.DishName LIKE '%BUBBLY%')
      AND sh.IsCancelled = 0
      AND ISNULL(sh.OrderType, '') <> 'CASHBOX'
      AND ISNULL(sid.Status, 'NORMAL') <> 'VOIDED'
      AND sid.OrderDateTime >= '2026-06-11 00:00:00'
      AND sid.OrderDateTime < '2026-08-14 00:00:00'
    GROUP BY sid.DishName
  `);
  console.log("App sales (SettlementItemDetail) between 2026-06-11 and 2026-08-13:");
  console.log(resApp.recordset);

  // Query 2: Cashbox entries for Bubbly
  const resCB = await pool.request().query(`
    SELECT 
      ArtistName,
      SUM(Amount) as TotalAmount
    FROM ArtistCashBox
    WHERE (ArtistName LIKE '%Bubbly%' OR ArtistName LIKE '%BUBBLY%')
      AND CreatedDate >= '2026-06-11 00:00:00'
      AND CreatedDate < '2026-08-14 00:00:00'
    GROUP BY ArtistName
  `);
  console.log("\nCash Box sales for Bubbly between 2026-06-11 and 2026-08-13:");
  console.log(resCB.recordset);

  console.log("\n=== AISHU SALES BY TYPE ===");
  // Query 3: App sales for Aishu
  const resAppAishu = await pool.request().query(`
    SELECT 
      sid.DishName,
      SUM(sid.Qty) as Qty,
      SUM(CASE WHEN (ISNULL(sid.Qty, 0) * ISNULL(sid.Price, 0)) - (CASE WHEN sid.DiscountType = 'percentage' THEN (ISNULL(sid.Qty, 0) * ISNULL(sid.Price, 0)) * (ISNULL(sid.DiscountAmount, 0) / 100.0) ELSE ISNULL(sid.Qty, 0) * (CASE WHEN ISNULL(sid.DiscountAmount, 0) > sid.Price THEN sid.Price ELSE ISNULL(sid.DiscountAmount, 0) END) END) - ISNULL(sid.VIPDiscountAmount, 0) < 0 THEN 0 ELSE (ISNULL(sid.Qty, 0) * ISNULL(sid.Price, 0)) - (CASE WHEN sid.DiscountType = 'percentage' THEN (ISNULL(sid.Qty, 0) * ISNULL(sid.Price, 0)) * (ISNULL(sid.DiscountAmount, 0) / 100.0) ELSE ISNULL(sid.Qty, 0) * (CASE WHEN ISNULL(sid.DiscountAmount, 0) > sid.Price THEN sid.Price ELSE ISNULL(sid.DiscountAmount, 0) END) END) - ISNULL(sid.VIPDiscountAmount, 0) END) as TotalAmount
    FROM SettlementHeader sh
    INNER JOIN SettlementItemDetail sid ON sh.SettlementID = sid.SettlementID
    WHERE (sid.DishName LIKE '%Aishu%' OR sid.DishName LIKE '%AISHU%')
      AND sh.IsCancelled = 0
      AND ISNULL(sh.OrderType, '') <> 'CASHBOX'
      AND ISNULL(sid.Status, 'NORMAL') <> 'VOIDED'
      AND sid.OrderDateTime >= '2026-07-15 00:00:00'
      AND sid.OrderDateTime < '2026-08-14 00:00:00'
    GROUP BY sid.DishName
  `);
  console.log("App sales (SettlementItemDetail) between 2026-07-15 and 2026-08-13:");
  console.log(resAppAishu.recordset);

  // Query 4: Cashbox entries for Aishu
  const resCBAishu = await pool.request().query(`
    SELECT 
      ArtistName,
      SUM(Amount) as TotalAmount
    FROM ArtistCashBox
    WHERE (ArtistName LIKE '%Aishu%' OR ArtistName LIKE '%AISHU%')
      AND CreatedDate >= '2026-07-15 00:00:00'
      AND CreatedDate < '2026-08-14 00:00:00'
    GROUP BY ArtistName
  `);
  console.log("\nCash Box sales for Aishu between 2026-07-15 and 2026-08-13:");
  console.log(resCBAishu.recordset);

  process.exit(0);
}

checkArtistSales().catch(err => {
  console.error(err);
  process.exit(1);
});
