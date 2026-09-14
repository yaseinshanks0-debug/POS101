package com.quickpos.app.data.repository

import com.quickpos.app.data.local.daos.ProductDao
import com.quickpos.app.data.local.daos.PurchaseDao
import com.quickpos.app.data.local.daos.PurchaseItemDao
import com.quickpos.app.data.local.daos.SupplierDao
import com.quickpos.app.data.local.entities.Product
import com.quickpos.app.data.local.entities.Purchase
import com.quickpos.app.data.local.entities.PurchaseItem
import com.quickpos.app.data.local.entities.Supplier
import kotlinx.coroutines.flow.Flow

data class ReceiveLine(
    val product: Product,
    val quantity: Int,
    val costUsd: Double
)

class PurchasesRepository(
    private val supplierDao: SupplierDao,
    private val purchaseDao: PurchaseDao,
    private val purchaseItemDao: PurchaseItemDao,
    private val productDao: ProductDao
) {
    // ---------- الموردون ----------
    fun suppliersFlow(): Flow<List<Supplier>> = supplierDao.observeAll()

    suspend fun addSupplier(supplier: Supplier): Long {
        require(supplier.name.isNotBlank()) { "اسم المورد مطلوب" }
        return supplierDao.insert(supplier)
    }

    suspend fun updateSupplier(supplier: Supplier) {
        require(supplier.name.isNotBlank()) { "اسم المورد مطلوب" }
        supplierDao.update(supplier)
    }

    suspend fun deleteSupplier(supplier: Supplier) {
        val count = supplierDao.purchaseCount(supplier.id)
        if (count > 0) throw IllegalStateException("لا يمكن حذف مورد له فواتير استلام (${count})")
        supplierDao.delete(supplier)
    }

    // ---------- استلام البضاعة ----------
    fun purchasesFlow(): Flow<List<Purchase>> = purchaseDao.observeAll()

    suspend fun getPurchaseItems(purchaseId: Long): List<PurchaseItem> = purchaseItemDao.getForPurchase(purchaseId)

    /** تسجيل فاتورة استلام: تضاف كميات للمخزون وتُحدَّث تكلفة المنتجات والمورد. */
    suspend fun receiveGoods(supplier: Supplier?, items: List<ReceiveLine>, notes: String): Purchase {
        require(items.isNotEmpty()) { "أضف صنفاً واحداً على الأقل" }
        require(supplier != null) { "اختر المورد" }

        val totalUsd = items.sumOf { it.costUsd * it.quantity }

        val purchaseId = purchaseDao.insert(
            Purchase(
                number = (purchaseDao.maxNumber() ?: 0L) + 1L,
                supplierId = supplier.id,
                supplierName = supplier.name,
                totalCostUsd = totalUsd,
                notes = notes.trim()
            )
        )

        purchaseItemDao.insertAll(items.map {
            PurchaseItem(
                purchaseId = purchaseId,
                productId = it.product.id,
                productName = it.product.name,
                quantity = it.quantity,
                costUsd = it.costUsd
            )
        })

        // تحديث المخزون والتكلفة
        for (line in items) {
            productDao.increaseStock(line.product.id, line.quantity)
            val fresh = productDao.getById(line.product.id) ?: continue
            if (line.costUsd > 0) {
                productDao.update(fresh.copy(costUsd = line.costUsd, updatedAt = System.currentTimeMillis()))
            }
        }

        return purchaseDao.getById(purchaseId) ?: error("فشل حفظ فاتورة الاستلام")
    }
}
