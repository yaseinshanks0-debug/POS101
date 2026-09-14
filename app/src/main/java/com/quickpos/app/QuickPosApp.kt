package com.quickpos.app

import android.app.Application
import android.content.Context
import androidx.room.Room
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.quickpos.app.data.local.AppDatabase
import com.quickpos.app.data.local.entities.User
import com.quickpos.app.data.remote.BackupManager
import com.quickpos.app.data.repository.CatalogRepository
import com.quickpos.app.data.repository.CurrencyRepository
import com.quickpos.app.data.repository.ExpenseRepository
import com.quickpos.app.data.repository.PosRepository
import com.quickpos.app.data.repository.PurchasesRepository
import com.quickpos.app.data.repository.ReportRepository
import com.quickpos.app.data.repository.SettingsRepository
import com.quickpos.app.data.repository.UserRepository
import com.quickpos.app.util.Auth
import com.quickpos.app.util.AuthState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class QuickPosApp : Application() {

    lateinit var db: AppDatabase
        private set
    lateinit var currency: CurrencyRepository
        private set
    lateinit var settings: SettingsRepository
        private set
    lateinit var catalog: CatalogRepository
        private set
    lateinit var pos: PosRepository
        private set
    lateinit var reports: ReportRepository
        private set
    lateinit var expenseRepo: ExpenseRepository
        private set
    lateinit var backup: BackupManager
        private set

    lateinit var users: UserRepository
        private set

    lateinit var purchases: PurchasesRepository
        private set

    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        instance = this
        db = Room.databaseBuilder(this, AppDatabase::class.java, AppDatabase.DATABASE_NAME)
            .addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4, MIGRATION_4_5)
            .build()

        currency = CurrencyRepository(db.settingsDao(), db.exchangeRateDao())
        settings = SettingsRepository(db.settingsDao())
        catalog = CatalogRepository(db.productDao(), db.categoryDao(), currency)
        pos = PosRepository(db.productDao(), db.invoiceDao(), db.invoiceItemDao(), db.couponDao(), db.customerDao(), db.debtSettlementDao(), currency)
        reports = ReportRepository(db.invoiceDao(), db.invoiceItemDao(), db.expenseDao(), db.productDao(), db.customerDao(), currency)
        expenseRepo = ExpenseRepository(db.expenseDao())
        backup = BackupManager(this, db)
        users = UserRepository(db.userDao())
        purchases = PurchasesRepository(db.supplierDao(), db.purchaseDao(), db.purchaseItemDao(), db.productDao())
        seedDefaultAdmin()
    }

    /** يعيد فتح جلسة آخر مستخدم سجّل الدخول إن ما زال فعّالاً. */
    suspend fun restoreSession(): Boolean {
        val lastId = settings.getString(SettingsRepository.KEY_LAST_USER_ID, "").toLongOrNull() ?: return false
        val user = users.findById(lastId) ?: return false
        if (!user.active) return false
        AuthState.login(user)
        return true
    }

    suspend fun rememberSession(userId: Long) {
        settings.put(SettingsRepository.KEY_LAST_USER_ID, userId.toString())
    }

    private fun seedDefaultAdmin() {
        appScope.launch {
            runCatching {
                if (db.userDao().findByUsername("admin") == null) {
                    db.userDao().insert(
                        User(
                            username = "admin",
                            passwordHash = Auth.hash("admin"),
                            fullName = "المدير",
                            role = "admin"
                        )
                    )
                }
            }
        }
    }

    companion object {
        lateinit var instance: QuickPosApp
            private set

        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // add product image
                db.execSQL("ALTER TABLE products ADD COLUMN imagePath TEXT")
                // extend invoice for payments/debt
                db.execSQL("ALTER TABLE invoices ADD COLUMN paymentMethod TEXT NOT NULL DEFAULT 'CASH'")
                db.execSQL("ALTER TABLE invoices ADD COLUMN transferReceiptPath TEXT")
                db.execSQL("ALTER TABLE invoices ADD COLUMN transferRef TEXT NOT NULL DEFAULT ''")
                db.execSQL("ALTER TABLE invoices ADD COLUMN customerPhone TEXT NOT NULL DEFAULT ''")
                db.execSQL("ALTER TABLE invoices ADD COLUMN remainingDebt REAL NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE invoice_items ADD COLUMN imagePath TEXT")
                // recreate InvoiceItem not needed; just add column
                db.execSQL("CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', totalDebt REAL NOT NULL DEFAULT 0, createdAt INTEGER NOT NULL)")
                db.execSQL("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, username TEXT NOT NULL, passwordHash TEXT NOT NULL, fullName TEXT NOT NULL DEFAULT '', role TEXT NOT NULL DEFAULT 'cashier', active INTEGER NOT NULL DEFAULT 1, createdAt INTEGER NOT NULL)")
            }
        }

        private val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // لم يتغيّر المخطط بين الإصدارين 2 و3 — ترقية هوية تضمن اكتمال سلسلة الترحيل
            }
        }

        private val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, notes TEXT NOT NULL, createdAt INTEGER NOT NULL)")
                db.execSQL("CREATE TABLE IF NOT EXISTS purchases (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, number INTEGER NOT NULL, supplierId INTEGER, supplierName TEXT NOT NULL, totalCostUsd REAL NOT NULL, notes TEXT NOT NULL, createdAt INTEGER NOT NULL)")
                db.execSQL("CREATE TABLE IF NOT EXISTS purchase_items (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, purchaseId INTEGER NOT NULL, productId INTEGER NOT NULL, productName TEXT NOT NULL, quantity INTEGER NOT NULL, costUsd REAL NOT NULL)")
            }
        }

        private val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // ربط الفواتير بالعميل + نوع الفاتورة (إيصال دَين)
                db.execSQL("ALTER TABLE invoices ADD COLUMN customerId INTEGER")
                db.execSQL("ALTER TABLE invoices ADD COLUMN kind TEXT NOT NULL DEFAULT 'SALE'")
                // سجل حركات ديون العملاء (تسديد/إضافة/تصحيح)
                db.execSQL("CREATE TABLE IF NOT EXISTS debt_settlements (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, customerId INTEGER NOT NULL, customerName TEXT NOT NULL, amountLocal REAL NOT NULL, type TEXT NOT NULL, method TEXT NOT NULL DEFAULT 'CASH', note TEXT NOT NULL DEFAULT '', date INTEGER NOT NULL)")
            }
        }

        fun from(context: Context): QuickPosApp =
            context.applicationContext as QuickPosApp
    }
}