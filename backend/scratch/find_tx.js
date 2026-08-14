const { poolPromise, sql } = require("../config/db");

async function run() {
  const pool = await poolPromise;
  
  const searchBills = [
    '20260812-003',
    '20260812-004',
    '20260812-005',
    '20260811-006',
    '20260811-005',
    '20260812-002'
  ];

  console.log("Searching for tables containing one of these bill numbers...");

  try {
    // Let's first search in information_schema.columns for columns containing 'bill' or 'sales' or 'order' or 'invoice' or 'trans'
    const colRes = await pool.request().query(`
      SELECT TABLE_NAME, COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE COLUMN_NAME LIKE '%bill%' 
         OR COLUMN_NAME LIKE '%sales%' 
         OR COLUMN_NAME LIKE '%order%' 
         OR COLUMN_NAME LIKE '%invoice%' 
         OR COLUMN_NAME LIKE '%trans%'
         OR COLUMN_NAME LIKE '%date%'
    `);
    
    const tablesAndCols = colRes.recordset;
    console.log(`Found ${tablesAndCols.length} potential columns across tables.`);

    // Let's filter to unique tables to search
    const tables = [...new Set(tablesAndCols.map(t => t.TABLE_NAME))];
    console.log(`Tables to inspect: ${tables.join(', ')}`);

    // Let's search each table for the transaction IDs
    for (const table of tables) {
      // Find all string/varchar columns in this table
      const colsRes = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '${table}'
          AND DATA_TYPE IN ('varchar', 'char', 'nvarchar', 'nchar', 'text', 'ntext')
      `);
      const cols = colsRes.recordset.map(c => c.COLUMN_NAME);
      if (cols.length === 0) continue;

      // Construct a query to see if any of these columns contain any of our search bills
      const conditions = [];
      for (const col of cols) {
        for (const bill of searchBills) {
          conditions.push(`[${col}] = '${bill}'`);
        }
      }

      if (conditions.length === 0) continue;

      const checkQuery = `
        SELECT TOP 1 * 
        FROM [${table}] WITH (NOLOCK)
        WHERE ${conditions.join(' OR ')}
      `;

      try {
        const testRes = await pool.request().query(checkQuery);
        if (testRes.recordset.length > 0) {
          console.log(`\n⭐⭐ Found match in table: [${table}]`);
          // Let's print the actual matching rows and all their columns/values
          const fullQuery = `
            SELECT * 
            FROM [${table}] WITH (NOLOCK)
            WHERE ${conditions.join(' OR ')}
          `;
          const allRes = await pool.request().query(fullQuery);
          console.log(allRes.recordset);
        }
      } catch (err) {
        // Skip errors (e.g. system tables or views that can't be queried this way)
      }
    }

  } catch (err) {
    console.error("Error running search:", err);
  } finally {
    process.exit(0);
  }
}

run();
