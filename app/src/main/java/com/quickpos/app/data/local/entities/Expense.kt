package com.quickpos.app.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "expenses")
data class Expense(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val category: String = "عام",
    val amountLocal: Double,
    val date: Long = System.currentTimeMillis(),
    val note: String = ""
)