require("dotenv").config();
const { poolPromise } = require("../config/db");
const sql = require("mssql");

async function shiftSalesDates() {
  console.log("🔄 Connecting to database...");
  const pool = await poolPromise;
  console.log("✅ Connected.");

  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    console.log("🚀 Transaction started.");

    // Delete empty log entries for 2026-08-10 to prevent UNIQUE KEY violations during shift
    const reqDeleteLog = new sql.Request(transaction);
    const delLogRes = await reqDeleteLog.query(`DELETE FROM BusinessDayLog WHERE BusinessDate = '2026-08-10'`);
    console.log(`🗑️ Deleted existing empty BusinessDayLog for 2026-08-10: ${delLogRes.rowsAffected[0]} row(s).`);

    const reqDeleteAudit = new sql.Request(transaction);
    const delAuditRes = await reqDeleteAudit.query(`DELETE FROM BusinessDayAuditLog WHERE BusinessDate = '2026-08-10'`);
    console.log(`🗑️ Deleted existing empty BusinessDayAuditLog for 2026-08-10: ${delAuditRes.rowsAffected[0]} row(s).`);

    const queries = [
      {
        desc: "SettlementHeader",
        sql: `UPDATE SettlementHeader 
              SET start_date = DATEADD(day, -1, start_date),
                  LastSettlementDate = DATEADD(day, -1, LastSettlementDate),
                  LastDayEndDate = DATEADD(day, -1, LastDayEndDate),
                  CreatedOn = DATEADD(day, -1, CreatedOn),
                  CancelledDate = CASE WHEN CancelledDate IS NOT NULL THEN DATEADD(day, -1, CancelledDate) ELSE CancelledDate END
              WHERE start_date BETWEEN '2026-08-11' AND '2026-08-13'`
      },
      {
        desc: "SettlementItemDetail",
        sql: `UPDATE SettlementItemDetail
              SET start_date = DATEADD(day, -1, start_date),
                  OrderDateTime = DATEADD(day, -1, OrderDateTime)
              WHERE start_date BETWEEN '2026-08-11' AND '2026-08-13'`
      },
      {
        desc: "PaymentDetail",
        sql: `UPDATE PaymentDetail
              SET start_date = DATEADD(day, -1, start_date),
                  PaymentCollectedOn = DATEADD(day, -1, PaymentCollectedOn),
                  CreatedOn = DATEADD(day, -1, CreatedOn),
                  ModifiedOn = DATEADD(day, -1, ModifiedOn)
              WHERE start_date BETWEEN '2026-08-11' AND '2026-08-13'`
      },
      {
        desc: "PaymentDetailCur",
        sql: `UPDATE PaymentDetailCur
              SET start_date = DATEADD(day, -1, start_date),
                  PaymentCollectedOn = DATEADD(day, -1, PaymentCollectedOn),
                  CreatedOn = DATEADD(day, -1, CreatedOn),
                  ModifiedOn = DATEADD(day, -1, ModifiedOn)
              WHERE start_date BETWEEN '2026-08-11' AND '2026-08-13'`
      },
      {
        desc: "RestaurantInvoice",
        sql: `UPDATE RestaurantInvoice
              SET start_date = DATEADD(day, -1, start_date),
                  InvoiceDate = DATEADD(day, -1, InvoiceDate),
                  CreatedOn = DATEADD(day, -1, CreatedOn),
                  ModifiedOn = DATEADD(day, -1, ModifiedOn)
              WHERE start_date BETWEEN '2026-08-11' AND '2026-08-13'`
      },
      {
        desc: "RestaurantInvoicecur",
        sql: `UPDATE RestaurantInvoicecur
              SET start_date = DATEADD(day, -1, start_date),
                  InvoiceDate = DATEADD(day, -1, InvoiceDate),
                  CreatedOn = DATEADD(day, -1, CreatedOn),
                  ModifiedOn = DATEADD(day, -1, ModifiedOn)
              WHERE start_date BETWEEN '2026-08-11' AND '2026-08-13'`
      },
      {
        desc: "RestaurantOrderDetail",
        sql: `UPDATE RestaurantOrderDetail
              SET START_DATE = DATEADD(day, -1, START_DATE),
                  CreatedOn = DATEADD(day, -1, CreatedOn),
                  ModifiedOn = DATEADD(day, -1, ModifiedOn)
              WHERE START_DATE BETWEEN '2026-08-11' AND '2026-08-13'`
      },
      {
        desc: "RestaurantOrderDetailCur",
        sql: `UPDATE RestaurantOrderDetailCur
              SET START_DATE = DATEADD(day, -1, START_DATE),
                  CreatedOn = DATEADD(day, -1, CreatedOn),
                  ModifiedOn = DATEADD(day, -1, ModifiedOn)
              WHERE START_DATE BETWEEN '2026-08-11' AND '2026-08-13'`
      },
      {
        desc: "RestaurantOrder",
        sql: `UPDATE RestaurantOrder
              SET start_date = DATEADD(day, -1, start_date),
                  OrderDateTime = DATEADD(day, -1, OrderDateTime),
                  CreatedOn = DATEADD(day, -1, CreatedOn),
                  ModifiedOn = DATEADD(day, -1, ModifiedOn)
              WHERE start_date BETWEEN '2026-08-11' AND '2026-08-13'`
      },
      {
        desc: "RestaurantOrderCur",
        sql: `UPDATE RestaurantOrderCur
              SET start_date = DATEADD(day, -1, start_date),
                  OrderDateTime = DATEADD(day, -1, OrderDateTime),
                  CreatedOn = DATEADD(day, -1, CreatedOn),
                  ModifiedOn = DATEADD(day, -1, ModifiedOn)
              WHERE start_date BETWEEN '2026-08-11' AND '2026-08-13'`
      },
      {
        desc: "CustomerCreditTransactions",
        sql: `UPDATE CustomerCreditTransactions
              SET CreatedDate = DATEADD(day, -1, CreatedDate),
                  UpdatedDate = CASE WHEN UpdatedDate IS NOT NULL THEN DATEADD(day, -1, UpdatedDate) ELSE UpdatedDate END
              WHERE CAST(CreatedDate AS DATE) BETWEEN '2026-08-11' AND '2026-08-13'`
      },
      {
        desc: "CustomerCreditAllocations",
        sql: `UPDATE CustomerCreditAllocations
              SET CreatedDate = DATEADD(day, -1, CreatedDate)
              WHERE CAST(CreatedDate AS DATE) BETWEEN '2026-08-11' AND '2026-08-13'`
      },
      {
        desc: "DateEntry",
        sql: `UPDATE DateEntry
              SET StartDate = DATEADD(day, -1, StartDate),
                  CreatedDate = DATEADD(day, -1, CreatedDate)
              WHERE StartDate BETWEEN '2026-08-11' AND '2026-08-13'`
      },
      {
        desc: "BusinessDayLog",
        sql: `UPDATE BusinessDayLog
              SET BusinessDate = DATEADD(day, -1, BusinessDate),
                  StartedAt = CASE WHEN StartedAt IS NOT NULL THEN DATEADD(day, -1, StartedAt) ELSE StartedAt END,
                  EndedAt = CASE WHEN EndedAt IS NOT NULL THEN DATEADD(day, -1, EndedAt) ELSE EndedAt END
              WHERE BusinessDate BETWEEN '2026-08-11' AND '2026-08-13'`
      },
      {
        desc: "BusinessDayAuditLog",
        sql: `UPDATE BusinessDayAuditLog
              SET BusinessDate = DATEADD(day, -1, BusinessDate),
                  EventTime = DATEADD(day, -1, EventTime)
              WHERE BusinessDate BETWEEN '2026-08-11' AND '2026-08-13'`
      },
      {
        desc: "dishOrderItemShare",
        sql: `UPDATE dishOrderItemShare
              SET FromDate = DATEADD(day, -1, FromDate),
                  ToDate = DATEADD(day, -1, ToDate),
                  CreatedDate = DATEADD(day, -1, CreatedDate)
              WHERE CAST(FromDate AS DATE) BETWEEN '2026-08-11' AND '2026-08-13'`
      },
      {
        desc: "ArtistCashBox",
        sql: `UPDATE ArtistCashBox
              SET start_date = DATEADD(day, -1, start_date),
                  CreatedDate = DATEADD(day, -1, CreatedDate)
              WHERE start_date BETWEEN '2026-08-11' AND '2026-08-13'`
      },
      {
        desc: "OpeningCashDenomination",
        sql: `UPDATE OpeningCashDenomination
              SET start_date = DATEADD(day, -1, start_date),
                  CreatedOn = DATEADD(day, -1, CreatedOn)
              WHERE start_date BETWEEN '2026-08-11' AND '2026-08-13'`
      },
      {
        desc: "CashInEntry",
        sql: `UPDATE CashInEntry
              SET start_date = DATEADD(day, -1, start_date),
                  CashInDate = DATEADD(day, -1, CashInDate),
                  CreatedOn = DATEADD(day, -1, CreatedOn)
              WHERE start_date BETWEEN '2026-08-11' AND '2026-08-13'`
      },
      {
        desc: "CashOutEntry",
        sql: `UPDATE CashOutEntry
              SET start_date = DATEADD(day, -1, start_date),
                  CashOutDate = DATEADD(day, -1, CashOutDate),
                  CreatedOn = DATEADD(day, -1, CreatedOn)
              WHERE start_date BETWEEN '2026-08-11' AND '2026-08-13'`
      }
    ];

    for (const q of queries) {
      const request = new sql.Request(transaction);
      const res = await request.query(q.sql);
      console.log(`✅ Table ${q.desc}: ${res.rowsAffected[0]} row(s) updated.`);
    }

    await transaction.commit();
    console.log("🎉 SUCCESS: All sales and log dates shifted backward by 1 day successfully!");
    process.exit(0);

  } catch (error) {
    console.error("❌ ERROR occurred during transaction, rolling back...", error);
    try {
      await transaction.rollback();
      console.log("🔄 Transaction rolled back successfully.");
    } catch (rbErr) {
      console.error("❌ Failed to roll back transaction:", rbErr);
    }
    process.exit(1);
  }
}

shiftSalesDates();
