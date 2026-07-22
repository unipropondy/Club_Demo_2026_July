const { poolPromise } = require('./config/db');

async function test() {
  try {
    const pool = await poolPromise;
    const res = await pool.request().query(`
      SELECT 
        a.CustomerName AS Name,
        COALESCE(a.TargetAmount, a.Amount, 0) AS TargetAmount,
        ISNULL(sales.Achieved, 0) AS AppPOSSales,
        ISNULL(cb.CashBoxAchieved, 0) AS CashBoxSales,
        ISNULL(sales.Achieved, 0) + ISNULL(cb.CashBoxAchieved, 0) AS ActualSales
      FROM dishOrderItemShare a
      OUTER APPLY (
        SELECT SUM(CAST(ISNULL(b.Qty, 0) * ISNULL(b.Price, 0) AS decimal(18,2))) AS Achieved
        FROM settlementitemdetail b
        INNER JOIN SettlementHeader sh ON b.SettlementID = sh.SettlementID
        WHERE (
          b.DishId = a.DishId 
          OR LTRIM(RTRIM(b.DishName)) = LTRIM(RTRIM(a.CustomerName))
          OR b.DishName LIKE '%' + LTRIM(RTRIM(a.CustomerName)) + '%'
        )
          AND sh.IsCancelled = 0
          AND ISNULL(sh.OrderType, '') <> 'CASHBOX'
          AND ISNULL(b.Status, 'NORMAL') <> 'VOIDED'
          AND b.OrderDateTime >= CAST(a.FromDate AS DATETIME)
          AND b.OrderDateTime < DATEADD(DAY, 1, CAST(a.ToDate AS DATETIME))
      ) sales
      OUTER APPLY (
        SELECT SUM(cb_inner.Amount) AS CashBoxAchieved
        FROM ArtistCashBox cb_inner
        WHERE LTRIM(RTRIM(cb_inner.ArtistName)) = LTRIM(RTRIM(a.CustomerName))
          AND CAST(cb_inner.CreatedDate AS DATE) >= CAST(a.FromDate AS DATE)
          AND CAST(cb_inner.CreatedDate AS DATE) <= CAST(a.ToDate AS DATE)
      ) cb
      WHERE a.CustomerName LIKE '%Priyanka%'
    `);
    console.log(res.recordset);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test();
