package com.quickpos.app.data.local.daos

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import com.quickpos.app.data.local.entities.Supplier
import kotlinx.coroutines.flow.Flow

@Dao
interface SupplierDao {
    @Insert
    suspend fun insert(supplier: Supplier): Long

    @Insert
    suspend fun insertAll(suppliers: List<Supplier>)

    @Update
    suspend fun update(supplier: Supplier)

    @Delete
    suspend fun delete(supplier: Supplier)

    @Query("SELECT * FROM suppliers ORDER BY name")
    fun observeAll(): Flow<List<Supplier>>

    @Query("SELECT * FROM suppliers WHERE id = :id LIMIT 1")
    suspend fun getById(id: Long): Supplier?

    @Query("SELECT COUNT(*) FROM purchases WHERE supplierId = :id")
    suspend fun purchaseCount(id: Long): Int

    @Query("DELETE FROM suppliers")
    suspend fun deleteAll()
}
