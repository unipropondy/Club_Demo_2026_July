const { poolPromise } = require("./config/db");

async function updateBtPrinter() {
  try {
    const pool = await poolPromise;
    const btAddress = "C8:47:8C:32:CC:1C";
    
    // Update PrintMaster for Cashier Printer (PrinterType = 1)
    await pool.request()
      .input("bt", btAddress)
      .query(`
        UPDATE PrintMaster 
        SET PrinterPath = @bt, PrinterIP = @bt, IsActive = 1 
        WHERE PrinterType = 1;
        
        UPDATE CompanySettings 
        SET PrinterIP = @bt;
      `);
      
    console.log("✅ Cashier printer address updated to Bluetooth MAC: " + btAddress);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error updating printer address:", err);
    process.exit(1);
  }
}

updateBtPrinter();
