package com.quickpos.app.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

/** صنف داخل فاتورة استلام بضاعة */
@Entity(tableName = "purchase_items")
data class PurchaseItem(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val purchaseId: Long,
    val productId: Long,
    val productName: String,
    val quantity: Int,
    val costUsd: Double
)
