package com.quickpos.app.data.local.daos

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.quickpos.app.data.local.entities.PurchaseItem

@Dao
interface PurchaseItemDao {
    @Insert
    suspend fun insertAll(items: List<PurchaseItem>)

    @Query("DELETE FROM purchase_items")
    suspend fun deleteAll()

    @Query("SELECT * FROM purchase_items WHERE purchaseId = :purchaseId")
    suspend fun getForPurchase(purchaseId: Long): List<PurchaseItem>

    @Query("SELECT * FROM purchase_items")
    suspend fun getAll(): List<PurchaseItem>
}
