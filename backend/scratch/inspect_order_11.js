const { poolPromise } = require('../config/db');

async function inspectExactOrder() {
  try {
    const pool = await poolPromise;
    // 1. Get Order Header Info
    const orderHeader = await pool.request()
      .input('orderNo', '20260820-0011')
      .query(`
        SELECT OrderId, OrderNumber, Tableno, TotalAmount, TakeawayCharge, TakeawayChargeOverride
        FROM RestaurantOrderCur 
        WHERE OrderNumber = @orderNo
      `);
    console.log('Order Header Info:', orderHeader.recordset);

    const orderGuid = orderHeader.recordset[0]?.OrderId;
    if (orderGuid) {
      // 2. Get Order Details
      const orderDetails = await pool.request()
        .input('orderId', orderGuid)
        .query(`
          SELECT OrderDetailId, DishId, DishName, Quantity, PricePerUnit, isTakeAway, TakeawayCharge
          FROM RestaurantOrderDetailCur 
          WHERE OrderId = @orderId
        `);
      console.log('Order Details:', orderDetails.recordset);
    }
  } catch (err) {
    console.error('Inspection error:', err);
  } finally {
    process.exit(0);
  }
}

inspectExactOrder();
