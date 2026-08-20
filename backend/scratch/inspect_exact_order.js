const { poolPromise } = require('../config/db');

async function inspectExactOrder() {
  try {
    const pool = await poolPromise;
    // 1. Get Table 3
    const tableRes = await pool.request().query(`
      SELECT TableId, TableNumber, CurrentOrderId, TotalAmount 
      FROM TableMaster 
      WHERE TableNumber = '3'
    `);
    console.log('Table 3 Info:', tableRes.recordset);

    const currentOrderId = tableRes.recordset[0]?.CurrentOrderId;
    if (currentOrderId) {
      // 2. Get Order Header Info
      const orderHeader = await pool.request()
        .input('orderNo', currentOrderId)
        .query(`
          SELECT OrderId, OrderNumber, Tableno, TotalAmount, TakeawayCharge, TakeawayChargeOverride
          FROM RestaurantOrderCur 
          WHERE OrderNumber = @orderNo
        `);
      console.log('Order Header Info:', orderHeader.recordset);

      const orderGuid = orderHeader.recordset[0]?.OrderId;
      if (orderGuid) {
        // 3. Get Order Details
        const orderDetails = await pool.request()
          .input('orderId', orderGuid)
          .query(`
            SELECT OrderDetailId, DishId, DishName, Quantity, PricePerUnit, isTakeAway, TakeawayCharge
            FROM RestaurantOrderDetailCur 
            WHERE OrderId = @orderId
          `);
        console.log('Order Details:', orderDetails.recordset);
      }
    }
  } catch (err) {
    console.error('Inspection error:', err);
  } finally {
    process.exit(0);
  }
}

inspectExactOrder();
