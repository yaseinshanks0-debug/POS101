package com.quickpos.app.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "exchange_rate_history")
data class ExchangeRateRecord(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val rateSdg: Double,
    val date: Long = System.currentTimeMillis(),
    val note: String = ""
)