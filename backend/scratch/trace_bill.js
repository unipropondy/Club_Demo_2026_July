const { poolPromise } = require('../config/db');
poolPromise.then(async p => {
  try {
    console.log('--- DETAILS FOR SETTLEMENT ID 63F780DA-F50C-40FF-897A-3157A42E00EB ---');
    const billRes = await p.request().query("SELECT BillNo, SysAmount, CreatedOn FROM SettlementHeader WHERE SettlementID = '63F780DA-F50C-40FF-897A-3157A42E00EB'");
    console.log('Bill Info:', JSON.stringify(billRes.recordset, null, 2));

    const itemRes = await p.request().query("SELECT DishName, Qty, Price FROM SettlementItemDetail WHERE SettlementID = '63F780DA-F50C-40FF-897A-3157A42E00EB'");
    console.log('Items Ordered:', JSON.stringify(itemRes.recordset, null, 2));

    const payRes = await p.request().query("SELECT Paymode, Amount, Remarks FROM PaymentDetailCur WHERE RestaurantBillId = '63F780DA-F50C-40FF-897A-3157A42E00EB'");
    console.log('Payments Collected:', JSON.stringify(payRes.recordset, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
});
