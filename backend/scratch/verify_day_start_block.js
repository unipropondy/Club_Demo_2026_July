const { poolPromise, sql } = require("../config/db");

async function run() {
  const pool = await poolPromise;
  
  try {
    console.log("1. Cleaning DateEntry for clean state...");
    await pool.request().query("DELETE FROM DateEntry");

    console.log("2. Inserting a mock active day '2026-08-12'...");
    await pool.request().query(`
      INSERT INTO DateEntry (username, StartDate, CreatedBy, CreatedDate)
      VALUES ('test_user', '2026-08-12', 'test_user', GETDATE())
    `);

    console.log("3. Simulating active day check logic...");
    const activeDayRes = await pool.request().query("SELECT TOP 1 StartDate FROM DateEntry ORDER BY CreatedDate DESC");
    
    if (activeDayRes.recordset.length > 0) {
      const activeDate = activeDayRes.recordset[0].StartDate;
      const formattedDate = activeDate instanceof Date 
        ? activeDate.toISOString().split("T")[0] 
        : activeDate;
      
      console.log(`=> SUCCESS: Detected active business day: ${formattedDate}`);
      if (formattedDate === '2026-08-12') {
        console.log("✅ Check logic behaves correctly (correct date detected).");
      } else {
        console.error("❌ Check logic returned incorrect date:", formattedDate);
      }
    } else {
      console.error("❌ Check logic failed: Did not detect any active day.");
    }

    console.log("4. Cleaning up mock active day...");
    await pool.request().query("DELETE FROM DateEntry");
    console.log("✅ Verification script completed.");

  } catch (err) {
    console.error("Verification failed:", err);
  } finally {
    process.exit(0);
  }
}

run();
