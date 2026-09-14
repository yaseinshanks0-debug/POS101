package com.quickpos.app.data.local.daos

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import com.quickpos.app.data.local.entities.Customer
import kotlinx.coroutines.flow.Flow

@Dao
interface CustomerDao {
    @Insert
    suspend fun insert(customer: Customer): Long

    @Insert
    suspend fun insertAll(customers: List<Customer>)

    @Update
    suspend fun update(customer: Customer)

    @Delete
    suspend fun delete(customer: Customer)

    @Query("SELECT * FROM customers")
    fun observeAll(): Flow<List<Customer>>

    @Query("SELECT * FROM customers ORDER BY name")
    suspend fun getAll(): List<Customer>

    @Query("SELECT * FROM customers WHERE id = :id LIMIT 1")
    suspend fun getById(id: Long): Customer?

    @Query("SELECT * FROM customers WHERE LOWER(name) = LOWER(:name) LIMIT 1")
    suspend fun findByName(name: String): Customer?

    @Query("SELECT * FROM customers WHERE phone = :phone LIMIT 1")
    suspend fun findByPhone(phone: String): Customer?

    @Query("UPDATE customers SET totalDebt = totalDebt + :amount WHERE id = :id")
    suspend fun addDebt(id: Long, amount: Double)

    @Query("UPDATE customers SET totalDebt = :amount WHERE id = :id")
    suspend fun setDebt(id: Long, amount: Double)

    @Query("SELECT COALESCE(SUM(totalDebt),0) FROM customers")
    suspend fun sumTotalDebt(): Double

    @Query("DELETE FROM customers")
    suspend fun deleteAll()
}
