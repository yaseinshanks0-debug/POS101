package com.quickpos.app.data.local.daos

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.quickpos.app.data.local.entities.DebtSettlement
import kotlinx.coroutines.flow.Flow

@Dao
interface DebtSettlementDao {
    @Insert
    suspend fun insert(settlement: DebtSettlement): Long

    @Insert
    suspend fun insertAll(settlements: List<DebtSettlement>)

    @Query("SELECT * FROM debt_settlements WHERE customerId = :customerId ORDER BY date DESC")
    fun observeForCustomer(customerId: Long): Flow<List<DebtSettlement>>

    @Query("SELECT * FROM debt_settlements WHERE customerId = :customerId ORDER BY date DESC")
    suspend fun forCustomer(customerId: Long): List<DebtSettlement>

    @Query("SELECT * FROM debt_settlements ORDER BY date DESC")
    suspend fun getAll(): List<DebtSettlement>

    @Query("DELETE FROM debt_settlements")
    suspend fun deleteAll()
}