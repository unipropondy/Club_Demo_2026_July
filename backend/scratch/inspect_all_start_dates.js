const { poolPromise, sql } = require("../config/db");

async function run() {
  const pool = await poolPromise;
  
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

  const tablesToInspect = [
    { name: 'SettlementHeader', idCol: 'SettlementID' },
    { name: 'SettlementItemDetail', idCol: 'SettlementID' },
    { name: 'PaymentDetail', idCol: 'RestaurantBillId' },
    { name: 'PaymentDetailCur', idCol: 'RestaurantBillId' },
    { name: 'RestaurantInvoice', idCol: 'RestaurantBillId' },
    { name: 'RestaurantInvoiceCur', idCol: 'RestaurantBillId' },
    { name: 'RestaurantOrder', idCol: 'OrderId' },
    { name: 'RestaurantOrderCur', idCol: 'OrderId' },
    { name: 'RestaurantOrderDetail', idCol: 'OrderId' },
    { name: 'RestaurantOrderDetailCur', idCol: 'OrderId' }
  ];

  try {
    for (const table of tablesToInspect) {
      const isOrder = table.idCol === 'OrderId';
      const placeholder = isOrder ? oIds : sIds;
      const q = `
        SELECT DISTINCT start_date, COUNT(*) AS count 
        FROM [${table.name}] 
        WHERE [${table.idCol}] IN (${placeholder})
        GROUP BY start_date
      `;
      const res = await pool.request().query(q);
      console.log(`Table: ${table.name}`);
      console.table(res.recordset);
    }

    // ArtistCashBox
    const acb = await pool.request().query(`
      SELECT DISTINCT start_date, COUNT(*) AS count 
      FROM ArtistCashBox 
      WHERE SettlementID IN (${sIds})
      GROUP BY start_date
    `);
    console.log("Table: ArtistCashBox");
    console.table(acb.recordset);

  } catch (err) {
    console.error("Error inspecting start_dates:", err);
  } finally {
    process.exit(0);
  }
}

run();
