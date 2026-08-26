const { poolPromise } = require("./config/db");

const resolveBusinessDateColumn = (col, fallbackCol = "LastSettlementDate") => {
  const cleanCol = String(col).trim();
  const parts = cleanCol.split(".");
  const prefix = parts.length > 1 ? parts[0] : "";
  const colName = parts.length > 1 ? parts[1] : parts[0];
  const pStr = prefix ? `${prefix}.` : "";

  if (colName === "LastSettlementDate" || colName === "OrderDateTime" || colName === "InvoiceDate") {
    return `ISNULL(${pStr}start_date, CAST(${pStr}${colName} AS DATE))`;
  }
  if (cleanCol.includes("ptd.CreatedDate") || cleanCol.includes("ptd.CreatedOn")) {
    return `ptd.CreatedDate`;
  }
  return cleanCol;
};

const getReportDateWhereSqlForRange = (startDateStr, endDateStr, saleDateColumn = "sh.LastSettlementDate") => {
  saleDateColumn = resolveBusinessDateColumn(saleDateColumn);
  const sgtStart = `CAST('${startDateStr}' AS DATE)`;
  const sgtEnd = `CAST('${endDateStr}' AS DATE)`;
  return `CAST(${saleDateColumn} AS DATE) >= ${sgtStart} AND CAST(${saleDateColumn} AS DATE) <= ${sgtEnd}`;
};

async function run() {
  try {
    const pool = await poolPromise;
    const start = "2026-08-24";
    const end = "2026-08-24";
    const whereSql = getReportDateWhereSqlForRange(start, end, "sh.LastSettlementDate");
    
    console.log("SQL filter:", whereSql);
    
    const res = await pool.query(`
      SELECT COUNT(*) as count, SUM(sh.SysAmount) as total
      FROM SettlementHeader sh
      WHERE ${whereSql}
    `);
    
    console.log("Result:", res.recordset);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
