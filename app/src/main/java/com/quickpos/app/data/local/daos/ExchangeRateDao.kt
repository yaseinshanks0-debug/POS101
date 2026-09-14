package com.quickpos.app.data.local.daos

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.quickpos.app.data.local.entities.ExchangeRateRecord
import kotlinx.coroutines.flow.Flow

@Dao
interface ExchangeRateDao {
    @Insert
    suspend fun insert(record: ExchangeRateRecord): Long

    @Insert
    suspend fun insertAll(records: List<ExchangeRateRecord>)

    @Query("SELECT * FROM exchange_rate_history ORDER BY date DESC")
    fun observeAll(): Flow<List<ExchangeRateRecord>>

    @Query("DELETE FROM exchange_rate_history")
    suspend fun deleteAll()
}