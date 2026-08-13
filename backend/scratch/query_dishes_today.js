const { poolPromise } = require("../config/db");

async function run() {
  try {
    const pool = await poolPromise;
    const dateStr = '2026-08-13';
    const appDateWhereSql = `sh.LastSettlementDate >= '2026-08-13T00:00:00' AND sh.LastSettlementDate < '2026-08-14T00:00:00'`;

    console.log("=== Running exact AppReport query for 2026-08-13 ===");
    const qRes = await pool.request().query(`
      SELECT
        ISNULL(NULLIF(LTRIM(RTRIM(sid.DishName)), ''), ISNULL(d.Name, 'Unknown')) AS dishName,
        ISNULL(NULLIF(LTRIM(RTRIM(sid.CategoryName)), ''), ISNULL(cm.CategoryName, 'Unmapped')) AS categoryName,
        ISNULL(NULLIF(LTRIM(RTRIM(sid.SubCategoryName)), ''), ISNULL(dg.DishGroupName, 'Unmapped')) AS subCategoryName,
        SUM(CASE WHEN ISNULL(sid.Status, 'NORMAL') <> 'VOIDED' THEN CAST(ISNULL(sid.Qty, 0) AS decimal(18, 3)) ELSE 0 END) AS totalQty,
        SUM(CASE WHEN ISNULL(sid.Status, 'NORMAL') = 'VOIDED' THEN CAST(ISNULL(sid.Qty, 0) AS decimal(18, 3)) ELSE 0 END) AS voidQty,
        SUM(CASE WHEN ISNULL(sid.Status, 'NORMAL') <> 'VOIDED'
                 THEN CAST(
                   CASE 
                     WHEN sid.DiscountType = 'percentage' 
                     THEN CASE WHEN (ISNULL(sid.Qty, 0) * ISNULL(sid.Price, 0)) * (1 - ISNULL(sid.DiscountAmount, 0) / 100) - ISNULL(sid.VIPDiscountAmount, 0) < 0 THEN 0 ELSE (ISNULL(sid.Qty, 0) * ISNULL(sid.Price, 0)) * (1 - ISNULL(sid.DiscountAmount, 0) / 100) - ISNULL(sid.VIPDiscountAmount, 0) END
                     ELSE CASE WHEN (ISNULL(sid.Qty, 0) * ISNULL(sid.Price, 0)) - (ISNULL(sid.Qty, 0) * ISNULL(sid.DiscountAmount, 0)) - ISNULL(sid.VIPDiscountAmount, 0) < 0 THEN 0 ELSE (ISNULL(sid.Qty, 0) * ISNULL(sid.Price, 0)) - (ISNULL(sid.Qty, 0) * ISNULL(sid.DiscountAmount, 0)) - ISNULL(sid.VIPDiscountAmount, 0) END
                   END AS decimal(18, 2))
                 ELSE 0
            END) AS totalAmount
      FROM SettlementHeader sh
      INNER JOIN SettlementItemDetail sid ON sh.SettlementID = sid.SettlementID
      LEFT JOIN DishMaster d ON sid.DishId = d.DishId
      LEFT JOIN DishGroupMaster dg ON COALESCE(sid.DishGroupId, d.DishGroupId) = dg.DishGroupId
      LEFT JOIN CategoryMaster cm ON COALESCE(sid.CategoryId, dg.CategoryId) = cm.CategoryId
      WHERE ${appDateWhereSql} AND ISNULL(sh.IsCancelled, 0) = 0
      GROUP BY 
        ISNULL(NULLIF(LTRIM(RTRIM(sid.DishName)), ''), ISNULL(d.Name, 'Unknown')), 
        ISNULL(NULLIF(LTRIM(RTRIM(sid.CategoryName)), ''), ISNULL(cm.CategoryName, 'Unmapped')), 
        ISNULL(NULLIF(LTRIM(RTRIM(sid.SubCategoryName)), ''), ISNULL(dg.DishGroupName, 'Unmapped'))
    `);
    console.log(qRes.recordset);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
