package com.quickpos.app.data.local.daos

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import com.quickpos.app.data.local.entities.Product
import kotlinx.coroutines.flow.Flow

data class ProductWithCategory(
    val id: Long,
    val name: String,
    val barcode: String,
    val categoryId: Long?,
    val categoryName: String?,
    val priceUsd: Double,
    val costUsd: Double,
    val stock: Int,
    val lowStockThreshold: Int,
    val imagePath: String?,
    val createdAt: Long,
    val updatedAt: Long
) {
    fun toProduct() = Product(
        id = id, name = name, barcode = barcode, categoryId = categoryId,
        priceUsd = priceUsd, costUsd = costUsd, stock = stock,
        lowStockThreshold = lowStockThreshold, imagePath = imagePath,
        createdAt = createdAt, updatedAt = updatedAt
    )
}

@Dao
interface ProductDao {
    @Insert
    suspend fun insert(product: Product): Long

    @Insert
    suspend fun insertAll(products: List<Product>)

    @Update
    suspend fun update(product: Product)

    @Delete
    suspend fun delete(product: Product)

    @Query("SELECT * FROM products WHERE id = :id")
    suspend fun getById(id: Long): Product?

    @Query("SELECT * FROM products WHERE barcode = :barcode LIMIT 1")
    suspend fun getByBarcode(barcode: String): Product?

    @Query("SELECT MAX(CAST(SUBSTR(barcode, 2) AS INTEGER)) FROM products WHERE barcode GLOB 'S[0-9]*'")
    suspend fun maxSerialSuffix(): Int?

    @Query(
        "SELECT products.*, categories.name AS categoryName FROM products " +
            "LEFT JOIN categories ON products.categoryId = categories.id ORDER BY products.name"
    )
    fun observeAll(): Flow<List<ProductWithCategory>>

    @Query(
        "SELECT products.*, categories.name AS categoryName FROM products " +
            "LEFT JOIN categories ON products.categoryId = categories.id " +
            "WHERE products.name LIKE '%' || :q || '%' OR products.barcode LIKE '%' || :q || '%' " +
            "ORDER BY products.name"
    )
    fun search(q: String): Flow<List<ProductWithCategory>>

    @Query("SELECT * FROM products WHERE name LIKE '%' || :q || '%' OR barcode LIKE '%' || :q || '%' ORDER BY name")
    suspend fun searchOnce(q: String): List<Product>

    @Query("UPDATE products SET stock = stock - :qty WHERE id = :id")
    suspend fun decreaseStock(id: Long, qty: Int)

    @Query("UPDATE products SET stock = stock + :qty WHERE id = :id")
    suspend fun increaseStock(id: Long, qty: Int)

    @Query(
        "SELECT products.*, categories.name AS categoryName FROM products " +
            "LEFT JOIN categories ON products.categoryId = categories.id " +
            "WHERE products.stock <= products.lowStockThreshold ORDER BY products.stock ASC"
    )
    fun observeLowStock(): Flow<List<ProductWithCategory>>

    @Query("SELECT COUNT(*) FROM products")
    suspend fun count(): Int

    @Query("SELECT * FROM products WHERE stock > 0")
    suspend fun inStock(): List<Product>

    @Query("DELETE FROM products")
    suspend fun deleteAll()
}