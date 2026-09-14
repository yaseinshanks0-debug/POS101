package com.quickpos.app.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "customers")
data class Customer(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val phone: String = "",
    val totalDebt: Double = 0.0,
    val createdAt: Long = System.currentTimeMillis()
)
