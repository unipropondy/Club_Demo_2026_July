const { poolPromise } = require('../config/db');

async function inspectCompanySettings() {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT Id, CompanyName, TakeawayCharges 
      FROM CompanySettings
    `);
    console.log('CompanySettings records:', result.recordset);
  } catch (err) {
    console.error('Database query error:', err);
  } finally {
    process.exit(0);
  }
}

inspectCompanySettings();
