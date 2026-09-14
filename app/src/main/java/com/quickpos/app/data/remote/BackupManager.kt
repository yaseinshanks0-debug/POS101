package com.quickpos.app.data.remote

import android.content.Context
import com.quickpos.app.data.local.AppDatabase
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
import androidx.room.withTransaction
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

data class BackupData(
    val createdAt: Long = System.currentTimeMillis(),
    val categories: List<Category> = emptyList(),
    val products: List<Product> = emptyList(),
    val coupons: List<Coupon> = emptyList(),
    val expenses: List<Expense> = emptyList(),
    val invoices: List<Invoice> = emptyList(),
    val items: List<InvoiceItem> = emptyList(),
    val rates: List<ExchangeRateRecord> = emptyList(),
    val settings: List<SettingEntity> = emptyList(),
    val customers: List<Customer> = emptyList(),
    val settlements: List<DebtSettlement> = emptyList(),
    val users: List<User> = emptyList(),
    val suppliers: List<Supplier> = emptyList(),
    val purchases: List<Purchase> = emptyList(),
    val purchaseItems: List<PurchaseItem> = emptyList()
) {
    fun isNotEmptyData() = products.isNotEmpty() || invoices.isNotEmpty() || expenses.isNotEmpty()
}

/**
 * إدارة النسخ الاحتياطي المحلي: تصدير/استيراد ملف JSON — يعمل دون اتصال بالكامل.
 */
class BackupManager(
    private val context: Context,
    private val db: AppDatabase
) {
    private val productDao = db.productDao()
    private val categoryDao = db.categoryDao()
    private val invoiceDao = db.invoiceDao()
    private val itemDao = db.invoiceItemDao()
    private val expenseDao = db.expenseDao()
    private val couponDao = db.couponDao()
    private val rateDao = db.exchangeRateDao()
    private val settingsDao = db.settingsDao()
    private val customerDao = db.customerDao()
    private val userDao = db.userDao()
    private val supplierDao = db.supplierDao()
    private val purchaseDao = db.purchaseDao()
    private val purchaseItemDao = db.purchaseItemDao()
    private val settlementDao = db.debtSettlementDao()

    suspend fun collect(): BackupData = withContext(Dispatchers.IO) {
        BackupData(
            categories = categoryDao.observeAll().first(),
            products = productDao.observeAll().first().map { it.toProduct() },
            coupons = couponDao.observeAll().first(),
            expenses = expenseDao.observeAll().first(),
            invoices = invoiceDao.observeAll().first(),
            items = itemDao.all(),
            rates = rateDao.observeAll().first(),
            settings = settingsDao.observeAll().first(),
            customers = customerDao.observeAll().first(),
            settlements = settlementDao.getAll(),
            users = userDao.observeAll().first(),
            suppliers = supplierDao.observeAll().first(),
            purchases = purchaseDao.getAll(),
            purchaseItems = purchaseItemDao.getAll()
        )
    }

    suspend fun restore(data: BackupData): Unit = withContext(Dispatchers.IO) {
        db.withTransaction {
            itemDao.deleteAll()
            invoiceDao.deleteAll()
            purchaseItemDao.deleteAll()
            purchaseDao.deleteAll()
            supplierDao.deleteAll()
            productDao.deleteAll()
            categoryDao.deleteAll()
            couponDao.deleteAll()
            expenseDao.deleteAll()
            rateDao.deleteAll()
            settingsDao.clear()
            customerDao.deleteAll()
            settlementDao.deleteAll()
            userDao.deleteAll()

            categoryDao.insertAll(data.categories)
            productDao.insertAll(data.products)
            couponDao.insertAll(data.coupons)
            expenseDao.insertAll(data.expenses)
            invoiceDao.insertAll(data.invoices)
            itemDao.insertAll(data.items)
            rateDao.insertAll(data.rates)
            data.settings.forEach { settingsDao.put(it) }
            customerDao.insertAll(data.customers)
            settlementDao.insertAll(data.settlements)
            userDao.insertAll(data.users)
            supplierDao.insertAll(data.suppliers)
            purchaseDao.insertAll(data.purchases)
            purchaseItemDao.insertAll(data.purchaseItems)
        }
    }

    // ---------- محلي (ملف JSON) ----------

    suspend fun exportToFile(): Pair<File, String> = withContext(Dispatchers.IO) {
        val data = collect()
        val root = JSONObject(data.toFirestoreMap())
        val dir = File(context.cacheDir, "backup").apply { mkdirs() }
        val file = File(dir, "quickpos_backup_${data.createdAt}.json")
        file.writeText(root.toString(2))
        val message = if (data.isNotEmptyData()) "تم تصدير النسخة ✓" else "لا توجد بيانات بعد"
        file to message
    }

    suspend fun importFromFile(file: File): Result<String> = withContext(Dispatchers.IO) {
        runCatching {
            val root = JSONObject(file.readText())
            val map = root.unWrap()
            val data = fromFirestoreMap(map)
            restore(data)
            "تم استرجاع النسخة من الملف ✓"
        }
    }

    private fun JSONObject.unWrap(): Map<String, Any> {
        val out = LinkedHashMap<String, Any>()
        keys().forEach { key -> out[key] = convert(opt(key)) }
        return out
    }

    private fun convert(v: Any?): Any = when {
        v == null || v == JSONObject.NULL -> ""
        v is JSONObject -> v.unWrap()
        v is JSONArray -> List(v.length()) { convert(v.opt(it)) }
        else -> v
    }
}

// ---------- تحويل BackupData إلى/من Map (JSON) ----------

fun BackupData.toFirestoreMap(): Map<String, Any> = mapOf(
    "createdAt" to createdAt,
    "categories" to categories.map { categoryToMap(it) },
    "products" to products.map { productToMap(it) },
    "coupons" to coupons.map { couponToMap(it) },
    "expenses" to expenses.map { expenseToMap(it) },
    "invoices" to invoices.map { invoiceToMap(it) },
    "items" to items.map { itemToMap(it) },
    "rates" to rates.map { rateToMap(it) },
    "settings" to settings.map { settingToMap(it) },
    "customers" to customers.map { customerToMap(it) },
    "debtSettlements" to settlements.map { settlementToMap(it) },
    "users" to users.map { userToMap(it) },
    "suppliers" to suppliers.map { supplierToMap(it) },
    "purchases" to purchases.map { purchaseToMap(it) },
    "purchaseItems" to purchaseItems.map { purchaseItemToMap(it) }
)

fun fromFirestoreMap(map: Map<String, Any>): BackupData = BackupData(
    createdAt = map.lng("createdAt"),
    categories = map.mapList("categories").map { categoryFromMap(it) },
    products = map.mapList("products").map { productFromMap(it) },
    coupons = map.mapList("coupons").map { couponFromMap(it) },
    expenses = map.mapList("expenses").map { expenseFromMap(it) },
    invoices = map.mapList("invoices").map { invoiceFromMap(it) },
    items = map.mapList("items").map { itemFromMap(it) },
    rates = map.mapList("rates").map { rateFromMap(it) },
    settings = map.mapList("settings").map { settingFromMap(it) },
    customers = map.mapList("customers").map { customerFromMap(it) },
    settlements = map.mapList("debtSettlements").map { settlementFromMap(it) },
    users = map.mapList("users").map { userFromMap(it) },
    suppliers = map.mapList("suppliers").map { supplierFromMap(it) },
    purchases = map.mapList("purchases").map { purchaseFromMap(it) },
    purchaseItems = map.mapList("purchaseItems").map { purchaseItemFromMap(it) }
)

private fun categoryToMap(c: Category) = mapOf("id" to c.id, "name" to c.name, "createdAt" to c.createdAt)
private fun categoryFromMap(m: Map<String, Any>) = Category(m.lng("id"), m.str("name"), m.lng("createdAt"))

private fun productToMap(p: Product) = mapOf(
    "id" to p.id, "name" to p.name, "barcode" to p.barcode, "categoryId" to (p.categoryId ?: 0),
    "priceUsd" to p.priceUsd, "costUsd" to p.costUsd, "stock" to p.stock,
    "lowStockThreshold" to p.lowStockThreshold, "imagePath" to (p.imagePath ?: ""),
    "createdAt" to p.createdAt, "updatedAt" to p.updatedAt
)
private fun productFromMap(m: Map<String, Any>) = Product(
    id = m.lng("id"), name = m.str("name"), barcode = m.str("barcode"),
    categoryId = m.lng("categoryId").takeIf { it != 0L },
    priceUsd = m.dbl("priceUsd"), costUsd = m.dbl("costUsd"), stock = m.int("stock"),
    lowStockThreshold = m.int("lowStockThreshold"),
    imagePath = m.str("imagePath").ifBlank { null },
    createdAt = m.lng("createdAt"), updatedAt = m.lng("updatedAt")
)

private fun couponToMap(c: Coupon) = mapOf(
    "id" to c.id, "code" to c.code, "type" to c.type, "value" to c.value,
    "maxUses" to c.maxUses, "usedCount" to c.usedCount, "startAt" to c.startAt,
    "endAt" to c.endAt, "active" to c.active, "createdAt" to c.createdAt
)
private fun couponFromMap(m: Map<String, Any>) = Coupon(
    id = m.lng("id"), code = m.str("code"), type = m.str("type"), value = m.dbl("value"),
    maxUses = m.int("maxUses"), usedCount = m.int("usedCount"), startAt = m.lng("startAt"),
    endAt = m.lng("endAt"), active = m.bool("active"), createdAt = m.lng("createdAt")
)

private fun expenseToMap(e: Expense) = mapOf(
    "id" to e.id, "title" to e.title, "category" to e.category,
    "amountLocal" to e.amountLocal, "date" to e.date, "note" to e.note
)
private fun expenseFromMap(m: Map<String, Any>) = Expense(
    id = m.lng("id"), title = m.str("title"), category = m.str("category"),
    amountLocal = m.dbl("amountLocal"), date = m.lng("date"), note = m.str("note")
)

private fun invoiceToMap(i: Invoice) = mapOf(
    "id" to i.id, "invoice_no" to i.number, "status" to i.status, "customerName" to i.customerName,
    "subTotalLocal" to i.subTotalLocal, "discountLocal" to i.discountLocal,
    "couponId" to (i.couponId ?: 0), "couponCode" to i.couponCode, "totalLocal" to i.totalLocal,
    "paidLocal" to i.paidLocal, "changeLocal" to i.changeLocal, "createdAt" to i.createdAt,
    "paymentMethod" to i.paymentMethod, "transferReceiptPath" to (i.transferReceiptPath ?: ""),
    "transferRef" to i.transferRef, "customerPhone" to i.customerPhone,
    "customerId" to (i.customerId ?: 0), "kind" to i.kind,
    "remainingDebt" to i.remainingDebt
)
private fun invoiceFromMap(m: Map<String, Any>) = Invoice(
    id = m.lng("id"), number = m.lng("invoice_no"), status = m.str("status"), customerName = m.str("customerName"),
    subTotalLocal = m.dbl("subTotalLocal"), discountLocal = m.dbl("discountLocal"),
    couponId = m.lng("couponId").takeIf { it != 0L }, couponCode = m.str("couponCode"),
    totalLocal = m.dbl("totalLocal"), paidLocal = m.dbl("paidLocal"), changeLocal = m.dbl("changeLocal"),
    createdAt = m.lng("createdAt"),
    paymentMethod = m.str("paymentMethod").ifBlank { "CASH" },
    transferReceiptPath = m.str("transferReceiptPath").ifBlank { null },
    transferRef = m.str("transferRef"), customerPhone = m.str("customerPhone"),
    customerId = m.lng("customerId").takeIf { it != 0L },
    kind = m.str("kind").ifBlank { "SALE" },
    remainingDebt = m.dbl("remainingDebt")
)

private fun itemToMap(it: InvoiceItem) = mapOf(
    "id" to it.id, "invoiceId" to it.invoiceId, "productId" to it.productId,
    "productName" to it.productName, "barcode" to it.barcode, "quantity" to it.quantity,
    "priceUsd" to it.priceUsd, "priceLocal" to it.priceLocal,
    "costUsd" to it.costUsd, "costLocal" to it.costLocal, "imagePath" to (it.imagePath ?: "")
)
private fun itemFromMap(m: Map<String, Any>) = InvoiceItem(
    id = m.lng("id"), invoiceId = m.lng("invoiceId"), productId = m.lng("productId"),
    productName = m.str("productName"), barcode = m.str("barcode"), quantity = m.int("quantity"),
    priceUsd = m.dbl("priceUsd"), priceLocal = m.dbl("priceLocal"),
    costUsd = m.dbl("costUsd"), costLocal = m.dbl("costLocal"),
    imagePath = m.str("imagePath").ifBlank { null }
)

private fun rateToMap(r: ExchangeRateRecord) = mapOf("id" to r.id, "rateSdg" to r.rateSdg, "date" to r.date, "note" to r.note)
private fun rateFromMap(m: Map<String, Any>) = ExchangeRateRecord(m.lng("id"), m.dbl("rateSdg"), m.lng("date"), m.str("note"))

private fun settingToMap(s: SettingEntity) = mapOf("key" to s.key, "value" to s.value)
private fun settingFromMap(m: Map<String, Any>) = SettingEntity(m.str("key"), m.str("value"))

private fun customerToMap(c: Customer) = mapOf(
    "id" to c.id, "name" to c.name, "phone" to c.phone,
    "totalDebt" to c.totalDebt, "createdAt" to c.createdAt
)
private fun customerFromMap(m: Map<String, Any>) = Customer(
    id = m.lng("id"), name = m.str("name"), phone = m.str("phone"),
    totalDebt = m.dbl("totalDebt"), createdAt = m.lng("createdAt")
)

private fun settlementToMap(s: DebtSettlement) = mapOf(
    "id" to s.id, "customerId" to s.customerId, "customerName" to s.customerName,
    "amountLocal" to s.amountLocal, "type" to s.type, "method" to s.method,
    "note" to s.note, "date" to s.date
)
private fun settlementFromMap(m: Map<String, Any>) = DebtSettlement(
    id = m.lng("id"), customerId = m.lng("customerId"), customerName = m.str("customerName"),
    amountLocal = m.dbl("amountLocal"), type = m.str("type").ifBlank { "SETTLE" },
    method = m.str("method").ifBlank { "CASH" }, note = m.str("note"), date = m.lng("date")
)

private fun userToMap(u: User) = mapOf(
    "id" to u.id, "username" to u.username, "passwordHash" to u.passwordHash,
    "fullName" to u.fullName, "role" to u.role, "active" to u.active, "createdAt" to u.createdAt
)
private fun userFromMap(m: Map<String, Any>) = User(
    id = m.lng("id"), username = m.str("username"), passwordHash = m.str("passwordHash"),
    fullName = m.str("fullName"), role = m.str("role").ifBlank { "cashier" },
    active = m.bool("active"), createdAt = m.lng("createdAt")
)

private fun supplierToMap(s: Supplier) = mapOf(
    "id" to s.id, "name" to s.name, "phone" to s.phone,
    "notes" to s.notes, "createdAt" to s.createdAt
)
private fun supplierFromMap(m: Map<String, Any>) = Supplier(
    id = m.lng("id"), name = m.str("name"), phone = m.str("phone"),
    notes = m.str("notes"), createdAt = m.lng("createdAt")
)

private fun purchaseToMap(p: Purchase) = mapOf(
    "id" to p.id, "number" to p.number, "supplierId" to (p.supplierId ?: 0),
    "supplierName" to p.supplierName, "totalCostUsd" to p.totalCostUsd,
    "notes" to p.notes, "createdAt" to p.createdAt
)
private fun purchaseFromMap(m: Map<String, Any>) = Purchase(
    id = m.lng("id"), number = m.lng("number"), supplierId = m.lng("supplierId").takeIf { it != 0L },
    supplierName = m.str("supplierName"), totalCostUsd = m.dbl("totalCostUsd"),
    notes = m.str("notes"), createdAt = m.lng("createdAt")
)

private fun purchaseItemToMap(it: PurchaseItem) = mapOf(
    "id" to it.id, "purchaseId" to it.purchaseId, "productId" to it.productId,
    "productName" to it.productName, "quantity" to it.quantity, "costUsd" to it.costUsd
)
private fun purchaseItemFromMap(m: Map<String, Any>) = PurchaseItem(
    id = m.lng("id"), purchaseId = m.lng("purchaseId"), productId = m.lng("productId"),
    productName = m.str("productName"), quantity = m.int("quantity"), costUsd = m.dbl("costUsd")
)

private fun Map<String, Any>.lng(k: String): Long = (get(k) as? Number)?.toLong() ?: 0L
private fun Map<String, Any>.dbl(k: String): Double = (get(k) as? Number)?.toDouble() ?: 0.0
private fun Map<String, Any>.int(k: String): Int = (get(k) as? Number)?.toInt() ?: 0
private fun Map<String, Any>.bool(k: String): Boolean = get(k) as? Boolean ?: false
private fun Map<String, Any>.str(k: String): String = get(k) as? String ?: ""

@Suppress("UNCHECKED_CAST")
private fun Map<String, Any>.mapList(k: String): List<Map<String, Any>> =
    (get(k) as? List<*>)?.mapNotNull { m -> m as? Map<String, Any> } ?: emptyList()