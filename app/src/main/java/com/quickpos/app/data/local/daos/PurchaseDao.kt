package com.quickpos.app.data.local.daos

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.quickpos.app.data.local.entities.Purchase
import kotlinx.coroutines.flow.Flow

@Dao
interface PurchaseDao {
    @Insert
    suspend fun insert(purchase: Purchase): Long

    @Insert
    suspend fun insertAll(purchases: List<Purchase>)

    @Query("DELETE FROM purchases")
    suspend fun deleteAll()

    @Query("SELECT * FROM purchases ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<Purchase>>

    @Query("SELECT * FROM purchases WHERE id = :id LIMIT 1")
    suspend fun getById(id: Long): Purchase?

    @Query("SELECT MAX(number) FROM purchases")
    suspend fun maxNumber(): Long?

    @Query("SELECT * FROM purchases ORDER BY createdAt DESC")
    suspend fun getAll(): List<Purchase>
}
