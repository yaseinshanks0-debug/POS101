package com.quickpos.app.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

/** حركة على دَين عميل: تسديد (SETTLE) أو إضافة يدوية (ADJUST_UP) أو تصحيح حذف (ADJUST_DOWN) */
@Entity(tableName = "debt_settlements")
data class DebtSettlement(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val customerId: Long,
    val customerName: String,
    val amountLocal: Double,
    val type: String = "SETTLE", // SETTLE | ADJUST_UP | ADJUST_DOWN
    val method: String = "CASH", // CASH | TRANSFER
    val note: String = "",
    val date: Long = System.currentTimeMillis()
)