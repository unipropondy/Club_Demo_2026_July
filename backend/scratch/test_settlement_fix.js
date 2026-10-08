const { poolPromise } = require('../config/db');

(async () => {
  try {
    const pool = await poolPromise;
    const request = pool.request();
    const dateFilter = "pdc.start_date BETWEEN CAST('2026-09-17' AS DATE) AND CAST('2026-09-17' AS DATE)";

    const billsResult = await request.query(`
      SELECT
        LTRIM(RTRIM(ISNULL(pdc.Remarks, ''))) AS PaymodeName,
        ISNULL(SUM(pdc.Amount), 0) AS Amount,
        COUNT(*) AS PayCount
      FROM PaymentDetailCur pdc
      LEFT JOIN SettlementHeader sh ON pdc.RestaurantBillId = sh.SettlementID
      WHERE ${dateFilter}
        AND (sh.SettlementID IS NULL OR ISNULL(sh.IsCancelled, 0) = 0)
        AND UPPER(LTRIM(RTRIM(ISNULL(pdc.Remarks, '')))) NOT IN ('CREDIT', 'MEMBER')
      GROUP BY LTRIM(RTRIM(ISNULL(pdc.Remarks, '')))
    `);

    console.log('=== TEST RESULT FOR 2026-09-17 PAYMENTS (FIXED) ===');
    console.log(billsResult.recordset);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
})();
