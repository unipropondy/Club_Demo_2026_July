const { poolPromise } = require('../config/db');
poolPromise.then(async p => {
  try {
    const dateFilter = "ci.start_date = '2026-08-27'";
    const query = `
      SELECT 
        ci.CashInId, 
        ci.Amount, 
        ci.Reason, 
        ci.Remarks, 
        ci.ReferenceNo,
        CASE 
          WHEN ci.Reason = 'Ledger Payment' THEN 'LEDGER'
          WHEN ci.Reason = 'Cash Sale' THEN 'SALE'
          WHEN ci.Remarks LIKE 'Auto Cash In from BILL%' THEN 'SALE'
          WHEN sh.SettlementID IS NOT NULL THEN 'SALE'
          WHEN cct.SettlementId IS NOT NULL THEN 'LEDGER'
          WHEN ptd.PaymentTransactionId IS NOT NULL THEN 'LEDGER'
          WHEN ci.Reason = 'Cash In' AND (ci.Remarks LIKE '%MEMBER%' OR ci.Remarks LIKE '%CREDIT%') THEN 'LEDGER'
          ELSE 'MANUAL'
        END AS CashInType
      FROM CashInEntry ci
      LEFT JOIN SettlementHeader sh ON ci.ReferenceNo = CAST(sh.SettlementID AS VARCHAR(50))
      LEFT JOIN CustomerCreditTransactions cct ON ci.ReferenceNo = CAST(cct.SettlementId AS VARCHAR(50))
      LEFT JOIN PaymentTransactionDetails ptd ON ci.ReferenceNo = CAST(ptd.PaymentTransactionId AS VARCHAR(50))
      WHERE ${dateFilter}
    `;
    const res = await p.request().query(query);
    console.log(JSON.stringify(res.recordset, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
});
