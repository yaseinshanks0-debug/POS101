package com.quickpos.app.data.local.daos

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import com.quickpos.app.data.local.entities.Invoice
import kotlinx.coroutines.flow.Flow

/** ناتج تجميع المدفوعات حسب طريقة الدفع في فترة */
data class PaymentMethodSum(
    val paymentMethod: String,
    val totalPaid: Double
)

@Dao
interface InvoiceDao {
    @Insert
    suspend fun insert(invoice: Invoice): Long

    @Insert
    suspend fun insertAll(invoices: List<Invoice>)

    @Update
    suspend fun update(invoice: Invoice)

    @Delete
    suspend fun delete(invoice: Invoice)

    @Query("SELECT * FROM invoices WHERE id = :id")
    suspend fun getById(id: Long): Invoice?

    @Query("SELECT * FROM invoices ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<Invoice>>

    @Query("SELECT MAX(invoice_no) FROM invoices")
    suspend fun maxNumber(): Long?

    @Query("SELECT * FROM invoices WHERE status = 'PAID' AND createdAt BETWEEN :from AND :to ORDER BY createdAt DESC")
    suspend fun getPaidBetween(from: Long, to: Long): List<Invoice>

    @Query("SELECT COALESCE(SUM(totalLocal),0) FROM invoices WHERE status='PAID' AND kind='SALE' AND createdAt BETWEEN :from AND :to")
    suspend fun sumTotalBetween(from: Long, to: Long): Double

    @Query("SELECT COALESCE(SUM(discountLocal),0) FROM invoices WHERE status='PAID' AND kind='SALE' AND createdAt BETWEEN :from AND :to")
    suspend fun sumDiscountBetween(from: Long, to: Long): Double

    @Query("SELECT COUNT(*) FROM invoices WHERE status='PAID' AND kind='SALE' AND createdAt BETWEEN :from AND :to")
    suspend fun countPaidBetween(from: Long, to: Long): Int

    @Query("SELECT * FROM invoices WHERE status='PAID' ORDER BY createdAt DESC LIMIT :limit")
    suspend fun recentPaid(limit: Int): List<Invoice>

    @Query("SELECT paymentMethod, COALESCE(SUM(paidLocal),0) AS totalPaid FROM invoices WHERE status='PAID' AND kind='SALE' AND createdAt BETWEEN :from AND :to GROUP BY paymentMethod")
    suspend fun paidSumByMethodBetween(from: Long, to: Long): List<PaymentMethodSum>

    @Query("SELECT COALESCE(SUM(remainingDebt),0) FROM invoices WHERE status='PARTIAL' AND createdAt BETWEEN :from AND :to")
    suspend fun sumRemainingDebtBetween(from: Long, to: Long): Double

    @Query("SELECT * FROM invoices WHERE customerId = :customerId OR (customerId IS NULL AND customerPhone != '' AND customerPhone = :phone) ORDER BY createdAt DESC")
    suspend fun invoicesForCustomer(customerId: Long, phone: String): List<Invoice>

    @Query("DELETE FROM invoices")
    suspend fun deleteAll()
}