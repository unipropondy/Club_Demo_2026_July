const { poolPromise, sql } = require("../config/db");

async function run() {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  const settlementIds = [
    '127481A0-5549-407C-90CD-7F515CCCDBFA',
    '667310FA-32B0-4184-8F64-646AC4CB1C13',
    '04220AC1-F332-4482-B7AD-404C64230DC4',
    'B48BCF62-7A1A-44A1-B0C3-268D7C962704',
    '1D110602-5548-492B-8236-2B55E768A576',
    '1700A881-BB40-4CDD-91AF-02FAF9D131F3'
  ];

  const orderIds = [
    '298659D1-FBB6-4043-B36E-602A50F41DC4',
    'EF68669F-C49B-4988-94D6-22239D15E85C',
    'D2E6F265-5491-4082-B783-C825652B4BB2',
    '157E2EE5-8815-44ED-A50B-4936F1C44839',
    'E9C77E87-B9FE-464B-B938-7B14DFAF2AB3',
    '88B15BB3-CFEF-4E06-9C8C-80D9E7743F53'
  ];

  const sIds = settlementIds.map(s => `'${s}'`).join(',');
  const oIds = orderIds.map(o => `'${o}'`).join(',');

  try {
    await transaction.begin();
    console.log("Database transaction started.");

    const updates = [
      { table: 'SettlementHeader', idCol: 'SettlementID', isOrder: false },
      { table: 'SettlementItemDetail', idCol: 'SettlementID', isOrder: false },
      { table: 'PaymentDetail', idCol: 'RestaurantBillId', isOrder: false },
      { table: 'PaymentDetailCur', idCol: 'RestaurantBillId', isOrder: false },
      { table: 'RestaurantInvoice', idCol: 'RestaurantBillId', isOrder: false },
      { table: 'RestaurantInvoiceCur', idCol: 'RestaurantBillId', isOrder: false },
      { table: 'RestaurantOrder', idCol: 'OrderId', isOrder: true },
      { table: 'RestaurantOrderCur', idCol: 'OrderId', isOrder: true },
      { table: 'RestaurantOrderDetail', idCol: 'OrderId', isOrder: true },
      { table: 'RestaurantOrderDetailCur', idCol: 'OrderId', isOrder: true }
    ];

    for (const update of updates) {
      const placeholder = update.isOrder ? oIds : sIds;
      const q = `
        UPDATE [${update.table}]
        SET start_date = '2026-08-12 00:00:00.000'
        WHERE [${update.idCol}] IN (${placeholder})
      `;
      const result = await transaction.request().query(q);
      console.log(`Table [${update.table}]: updated ${result.rowsAffected[0]} rows.`);
    }

    await transaction.commit();
    console.log("Database transaction committed successfully!");

  } catch (err) {
    console.error("Error during transaction, rolling back...", err);
    try {
      await transaction.rollback();
      console.log("Transaction rolled back successfully.");
    } catch (rollbackErr) {
      console.error("Failed to rollback transaction:", rollbackErr);
    }
  } finally {
    process.exit(0);
  }
}

run();
