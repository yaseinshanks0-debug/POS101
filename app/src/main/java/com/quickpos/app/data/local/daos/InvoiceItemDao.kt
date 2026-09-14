package com.quickpos.app.data.local.daos

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.quickpos.app.data.local.entities.InvoiceItem

data class ProductSales(
    val productId: Long,
    val productName: String,
    val totalQty: Double,
    val totalRevenue: Double
)

@Dao
interface InvoiceItemDao {
    @Insert
    suspend fun insert(item: InvoiceItem): Long

    @Insert
    suspend fun insertAll(items: List<InvoiceItem>)

    @Query("SELECT * FROM invoice_items WHERE invoiceId = :invoiceId")
    suspend fun itemsForInvoice(invoiceId: Long): List<InvoiceItem>

    @Query("SELECT * FROM invoice_items")
    suspend fun all(): List<InvoiceItem>

    @Query(
        "SELECT COALESCE(SUM(costLocal * quantity),0) FROM invoice_items " +
            "WHERE invoiceId IN (SELECT id FROM invoices WHERE status='PAID' AND createdAt BETWEEN :from AND :to)"
    )
    suspend fun sumCostBetween(from: Long, to: Long): Double

    @Query(
        "SELECT productId, productName, SUM(quantity) AS totalQty, SUM(priceLocal * quantity) AS totalRevenue " +
            "FROM invoice_items " +
            "WHERE invoiceId IN (SELECT id FROM invoices WHERE status='PAID' AND createdAt BETWEEN :from AND :to) " +
            "GROUP BY productId ORDER BY totalQty DESC LIMIT 10"
    )
    suspend fun topProductsBetween(from: Long, to: Long): List<ProductSales>

    @Query(
        "SELECT DISTINCT productId FROM invoice_items " +
            "WHERE invoiceId IN (SELECT id FROM invoices WHERE status='PAID' AND createdAt > :since)"
    )
    suspend fun soldProductIdsSince(since: Long): List<Long>

    @Query("SELECT COUNT(DISTINCT productId) FROM invoice_items WHERE invoiceId IN (SELECT id FROM invoices WHERE status='PAID' AND createdAt BETWEEN :from AND :to)")
    suspend fun distinctProductsBetween(from: Long, to: Long): Int

    @Query("DELETE FROM invoice_items")
    suspend fun deleteAll()
}