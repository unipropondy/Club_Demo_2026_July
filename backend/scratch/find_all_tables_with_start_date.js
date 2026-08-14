const { poolPromise, sql } = require("../config/db");

async function run() {
  const pool = await poolPromise;
  
  try {
    console.log("--- Tables with start_date column ---");
    const res = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE COLUMN_NAME = 'start_date'
    `);
    const tables = res.recordset.map(r => r.TABLE_NAME);
    console.log(tables);

    // Let's also check if these tables contain our specific settlement/order records.
    const settlementIds = [
      '127481A0-5549-407C-90CD-7F515CCCDBFA',
      '667310FA-32B0-4184-8F64-646AC4CB1C13',
      '04220AC1-F332-4482-B7AD-404C64230DC4',
      'B48BCF62-7A1A-44A1-B0C3-268D7C962704',
      '1D110602-5548-492B-8236-2B55E768A576',
      '1700A881-BB40-4CDD-91AF-02FAF9D131F3'
    ];

    const orderIds = ['1680', '1679', '1678', '1677', '1675', '1674'];

    for (const table of tables) {
      // Find columns in this table that could match OrderId or SettlementID (usually varchar/uniqueidentifier/int)
      const colRes = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '${table}'
      `);
      
      const cols = colRes.recordset;
      const conditions = [];

      for (const col of cols) {
        const colName = col.COLUMN_NAME;
        const dataType = col.DATA_TYPE.toLowerCase();

        if (dataType === 'uniqueidentifier' || dataType.includes('char')) {
          for (const sid of settlementIds) {
            conditions.push(`[${colName}] = '${sid}'`);
          }
        }
        if (dataType.includes('int') || dataType.includes('char')) {
          for (const oid of orderIds) {
            conditions.push(`[${colName}] = '${oid}'`);
          }
        }
      }

      if (conditions.length === 0) continue;

      const checkQuery = `
        SELECT COUNT(*) AS cnt 
        FROM [${table}] WITH (NOLOCK)
        WHERE ${conditions.join(' OR ')}
      `;

      try {
        const countRes = await pool.request().query(checkQuery);
        const count = countRes.recordset[0].cnt;
        if (count > 0) {
          console.log(`Table [${table}] has ${count} matching records.`);
        }
      } catch (err) {
        // Skip errors
      }
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

run();
