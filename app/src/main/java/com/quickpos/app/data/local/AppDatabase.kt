package com.quickpos.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.quickpos.app.data.local.daos.CategoryDao
import com.quickpos.app.data.local.daos.CouponDao
import com.quickpos.app.data.local.daos.CustomerDao
import com.quickpos.app.data.local.daos.DebtSettlementDao
import com.quickpos.app.data.local.daos.ExchangeRateDao
import com.quickpos.app.data.local.daos.ExpenseDao
import com.quickpos.app.data.local.daos.InvoiceDao
import com.quickpos.app.data.local.daos.InvoiceItemDao
import com.quickpos.app.data.local.daos.ProductDao
import com.quickpos.app.data.local.daos.PurchaseDao
import com.quickpos.app.data.local.daos.PurchaseItemDao
import com.quickpos.app.data.local.daos.SettingsDao
import com.quickpos.app.data.local.daos.SupplierDao
import com.quickpos.app.data.local.daos.UserDao
import com.quickpos.app.data.local.entities.Category
import com.quickpos.app.data.local.entities.Coupon
import com.quickpos.app.data.local.entities.Customer
import com.quickpos.app.data.local.entities.DebtSettlement
import com.quickpos.app.data.local.entities.ExchangeRateRecord
import com.quickpos.app.data.local.entities.Expense
import com.quickpos.app.data.local.entities.Invoice
import com.quickpos.app.data.local.entities.InvoiceItem
import com.quickpos.app.data.local.entities.Product
import com.quickpos.app.data.local.entities.Purchase
import com.quickpos.app.data.local.entities.PurchaseItem
import com.quickpos.app.data.local.entities.SettingEntity
import com.quickpos.app.data.local.entities.Supplier
import com.quickpos.app.data.local.entities.User

@Database(
    entities = [
        Category::class,
        Product::class,
        Invoice::class,
        InvoiceItem::class,
        Expense::class,
        Coupon::class,
        ExchangeRateRecord::class,
        SettingEntity::class,
        Customer::class,
        DebtSettlement::class,
        User::class,
        Supplier::class,
        Purchase::class,
        PurchaseItem::class
    ],
    version = 5,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun categoryDao(): CategoryDao
    abstract fun productDao(): ProductDao
    abstract fun invoiceDao(): InvoiceDao
    abstract fun invoiceItemDao(): InvoiceItemDao
    abstract fun expenseDao(): ExpenseDao
    abstract fun couponDao(): CouponDao
    abstract fun exchangeRateDao(): ExchangeRateDao
    abstract fun settingsDao(): SettingsDao
    abstract fun customerDao(): CustomerDao
    abstract fun debtSettlementDao(): DebtSettlementDao
    abstract fun userDao(): UserDao
    abstract fun supplierDao(): SupplierDao
    abstract fun purchaseDao(): PurchaseDao
    abstract fun purchaseItemDao(): PurchaseItemDao
    companion object {
        const val DATABASE_NAME = "quickpos.db"
    }
}