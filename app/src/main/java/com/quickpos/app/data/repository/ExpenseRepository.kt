package com.quickpos.app.data.repository

import com.quickpos.app.data.local.daos.ExpenseDao
import com.quickpos.app.data.local.entities.Expense
import kotlinx.coroutines.flow.Flow

class ExpenseRepository(private val expenseDao: ExpenseDao) {
    fun observeAll(): Flow<List<Expense>> = expenseDao.observeAll()

    suspend fun add(expense: Expense): Long = expenseDao.insert(expense)

    suspend fun delete(expense: Expense) = expenseDao.delete(expense)

    suspend fun sumBetween(from: Long, to: Long): Double = expenseDao.sumBetween(from, to)

    suspend fun getBetween(from: Long, to: Long): List<Expense> = expenseDao.getBetween(from, to)
}