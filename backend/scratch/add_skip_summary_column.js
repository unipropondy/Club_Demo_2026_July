require('dotenv').config({ path: __dirname + '/../.env' });
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER || 'myerpcloud.dyndns.org',
  port: parseInt(process.env.DB_PORT || '9199'),
  database: process.env.DB_NAME || 'UCSMERSAL',
  user: process.env.DB_USER || 'ups',
  password: process.env.DB_PASSWORD,
  options: { encrypt: false, trustServerCertificate: true },
  connectionTimeout: 20000
};

async function run() {
  const pool = await sql.connect(config);
  console.log('Connected to database. Checking columns...');

  const query = `
    IF NOT EXISTS (
      SELECT * FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'AppSettings' AND COLUMN_NAME = 'SkipSummary'
    )
    BEGIN
      ALTER TABLE AppSettings ADD SkipSummary BIT DEFAULT 0 WITH VALUES;
      SELECT 'Column added' AS result;
    END
    ELSE
    BEGIN
      SELECT 'Column already exists' AS result;
    END
  `;

  const res = await pool.request().query(query);
  console.log('Result:', res.recordset[0].result);
  await pool.close();
}

run().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
