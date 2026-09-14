package com.quickpos.app.data.local.entities

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "invoices",
    indices = [Index(value = ["invoice_no"], unique = true)]
)
data class Invoice(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "invoice_no") val number: Long,
    val status: String, // PAID | VOID | PARTIAL
    val customerName: String = "",
    val subTotalLocal: Double = 0.0,
    val discountLocal: Double = 0.0,
    val couponId: Long? = null,
    val couponCode: String = "",
    val totalLocal: Double = 0.0,
    val paidLocal: Double = 0.0,
    val changeLocal: Double = 0.0,
    val paymentMethod: String = "CASH", // CASH | TRANSFER | DEBT
    val transferReceiptPath: String? = null,
    val transferRef: String = "",
    val customerPhone: String = "",
    val customerId: Long? = null,
    val kind: String = "SALE", // SALE | DEBT (إيصال تسديد)
    val remainingDebt: Double = 0.0,
    val createdAt: Long = System.currentTimeMillis()
)