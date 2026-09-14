package com.quickpos.app.data.repository

import com.quickpos.app.data.local.daos.CategoryDao
import com.quickpos.app.data.local.daos.ProductDao
import com.quickpos.app.data.local.daos.ProductWithCategory
import com.quickpos.app.data.local.entities.Category
import com.quickpos.app.data.local.entities.Product
import kotlinx.coroutines.flow.Flow

class CatalogRepository(
    private val productDao: ProductDao,
    private val categoryDao: CategoryDao,
    private val currency: CurrencyRepository
) {

    fun observeProducts(): Flow<List<ProductWithCategory>> = productDao.observeAll()

    fun search(q: String): Flow<List<ProductWithCategory>> = productDao.search(q)

    suspend fun searchOnce(q: String): List<Product> = productDao.searchOnce(q)

    fun observeLowStock(): Flow<List<ProductWithCategory>> = productDao.observeLowStock()

    suspend fun getById(id: Long): Product? = productDao.getById(id)

    suspend fun getByBarcode(barcode: String): Product? = productDao.getByBarcode(barcode)

    fun observeCategories(): Flow<List<Category>> = categoryDao.observeAll()

    suspend fun addCategory(name: String): Long {
        val clean = name.trim()
        require(clean.isNotEmpty()) { "اسم الصنف مطلوب" }
        return categoryDao.insert(Category(name = clean))
    }

    suspend fun barcodeExists(barcode: String, excludeId: Long = 0): Boolean {
        if (barcode.isBlank()) return false
        val existing = productDao.getByBarcode(barcode) ?: return false
        return existing.id != excludeId
    }

    suspend fun addProduct(product: Product): Long {
        require(product.name.isNotBlank()) { "اسم المنتج مطلوب" }
        require(product.priceUsd >= 0 && product.costUsd >= 0) { "الأسعار لا يمكن أن تكون سالبة" }
        // إذا لم يوجد باركود، نولّد رقماً تسلسلياً فريداً يُمسح بالكاميرا كباركود
        val final = product.copy(barcode = effectiveBarcode(product.barcode))
        require(!barcodeExists(final.barcode)) { "الباركود موجود مسبقاً" }
        return productDao.insert(final)
    }

    suspend fun updateProduct(product: Product) {
        require(product.name.isNotBlank()) { "اسم المنتج مطلوب" }
        val barcode = product.barcode.ifBlank { productDao.getById(product.id)?.barcode ?: "" }
        val final = product.copy(barcode = barcode, updatedAt = System.currentTimeMillis())
        require(!barcodeExists(final.barcode, product.id)) { "الباركود موجود لمنتج آخر" }
        productDao.update(final)
    }

    /** توليد رقم تسلسلي فريد (يُمسح بالكاميرا كباركود) — يبدأ بـ S متبوعاً برقم يتزايد حتى لا يحدث تعارض. */
    private suspend fun effectiveBarcode(input: String): String {
        if (input.isNotBlank()) return input.trim()
        val max = productDao.maxSerialSuffix() ?: 0
        var next = max + 1
        var candidate = "S$next"
        while (productDao.getByBarcode(candidate) != null) {
            next++
            candidate = "S$next"
        }
        return candidate
    }

    suspend fun deleteProduct(product: Product) = productDao.delete(product)

    suspend fun adjustStock(id: Long, delta: Int) {
        if (delta >= 0) productDao.increaseStock(id, delta) else productDao.decreaseStock(id, -delta)
    }

    suspend fun count(): Int = productDao.count()

    suspend fun inStock(): List<Product> = productDao.inStock()
}