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

  const settlementIdsPlaceholder = settlementIds.map(s => `'${s}'`).join(',');

  try {
    // 1. Get real OrderId (GUID) from RestaurantInvoice / RestaurantInvoiceCur
    const riRes = await pool.request().query(`
      SELECT RestaurantBillId, OrderId, BillNumber, start_date 
      FROM RestaurantInvoice 
      WHERE RestaurantBillId IN (${settlementIdsPlaceholder})
      UNION ALL
      SELECT RestaurantBillId, OrderId, BillNumber, start_date 
      FROM RestaurantInvoiceCur 
      WHERE RestaurantBillId IN (${settlementIdsPlaceholder})
    `);
    console.log("--- RestaurantInvoice / RestaurantInvoiceCur Records ---");
    console.table(riRes.recordset);

    const guidOrderIds = riRes.recordset.map(r => r.OrderId).filter(Boolean);
    
    if (guidOrderIds.length > 0) {
      const guidOrderIdsPlaceholder = guidOrderIds.map(id => `'${id}'`).join(',');
      
      console.log(`GUID Order IDs: ${guidOrderIds.join(', ')}`);

      // Let's check counts of matching records in other tables
      const checkTables = [
        'RestaurantOrderCur',
        'RestaurantOrderDetailCur',
        'RestaurantOrder',
        'RestaurantOrderDetail',
        'RestaurantModifierDetailCur',
        'RestaurantModifierDetail'
      ];

      for (const t of checkTables) {
        try {
          const res = await pool.request().query(`
            SELECT COUNT(*) AS cnt FROM [${t}] WHERE OrderId IN (${guidOrderIdsPlaceholder})
          `);
          console.log(`Table [${t}] matches: ${res.recordset[0].cnt}`);
        } catch (e) {
          console.error(`Error querying [${t}]:`, e.message);
        }
      }
    } else {
      console.log("No GUID OrderIds found!");
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

run();
