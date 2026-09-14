package com.quickpos.app.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

/** فاتورة استلام بضاعة (مشتريات) من مورد */
@Entity(tableName = "purchases")
data class Purchase(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val number: Long = 0,
    val supplierId: Long? = null,
    val supplierName: String = "",
    val totalCostUsd: Double = 0.0,
    val notes: String = "",
    val createdAt: Long = System.currentTimeMillis()
)
