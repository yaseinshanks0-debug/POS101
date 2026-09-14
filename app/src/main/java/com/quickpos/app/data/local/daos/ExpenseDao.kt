package com.quickpos.app.data.local.daos

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import com.quickpos.app.data.local.entities.Expense
import kotlinx.coroutines.flow.Flow

@Dao
interface ExpenseDao {
    @Insert
    suspend fun insert(expense: Expense): Long

    @Insert
    suspend fun insertAll(expenses: List<Expense>)

    @Update
    suspend fun update(expense: Expense)

    @Delete
    suspend fun delete(expense: Expense)

    @Query("SELECT * FROM expenses ORDER BY date DESC")
    fun observeAll(): Flow<List<Expense>>

    @Query("SELECT COALESCE(SUM(amountLocal),0) FROM expenses WHERE date BETWEEN :from AND :to")
    suspend fun sumBetween(from: Long, to: Long): Double

    @Query("SELECT * FROM expenses WHERE date BETWEEN :from AND :to ORDER BY date DESC")
    suspend fun getBetween(from: Long, to: Long): List<Expense>

    @Query("SELECT * FROM expenses WHERE date >= :fromDate ORDER BY date ASC LIMIT 1")
    suspend fun oldestExpenseAtOrAfter(fromDate: Long): Expense?

    @Query("DELETE FROM expenses")
    suspend fun deleteAll()
}