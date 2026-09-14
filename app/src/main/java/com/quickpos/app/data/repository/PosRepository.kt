package com.quickpos.app.data.repository

import com.quickpos.app.data.local.daos.CouponDao
import com.quickpos.app.data.local.daos.CustomerDao
import com.quickpos.app.data.local.daos.DebtSettlementDao
import com.quickpos.app.data.local.daos.InvoiceDao
import com.quickpos.app.data.local.daos.InvoiceItemDao
import com.quickpos.app.data.local.daos.ProductDao
import com.quickpos.app.data.local.entities.Coupon
import com.quickpos.app.data.local.entities.Customer
import com.quickpos.app.data.local.entities.DebtSettlement
import com.quickpos.app.data.local.entities.Invoice
import com.quickpos.app.data.local.entities.InvoiceItem
import com.quickpos.app.data.local.entities.Product
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.util.UUID

/** سطر داخل سلة فاتورة */
class CartLine(
    val product: Product,
    var quantity: Int = 1,
    var overridePriceUsd: Double? = null
) {
    val priceUsd: Double get() = overridePriceUsd ?: product.priceUsd
    val lineUsd: Double get() = priceUsd * quantity

    /** خصم مباشر على هذا البند بالجنيه السوداني */
    var discountLocal: Double = 0.0
}

/** فاتورة مفتوحة (مشروع) — يمكن فتح أكثر من فاتورة في نفس الوقت */
class Cart(val id: String = UUID.randomUUID().toString()) {
    val lines: MutableList<CartLine> = mutableListOf()
    var customerName: String = ""
    var customerPhone: String = ""
    var customerId: Long? = null
    var couponCode: String = ""
    var coupon: Coupon? = null
    var manualDiscountLocal: Double = 0.0
    var paymentMethod: String = "CASH" // CASH | TRANSFER | DEBT
    var transferReceiptPath: String? = null
    var transferRef: String = ""
    var paidAmountLocal: Double = 0.0
    var remainingDebt: Double = 0.0

    fun isEmpty() = lines.isEmpty()
    fun quantityOf(productId: Long): Int = lines.firstOrNull { it.product.id == productId }?.quantity ?: 0
}

sealed class CouponCheckResult {
    data class Success(val coupon: Coupon, val discountLocal: Double, val subTotalLocal: Double) : CouponCheckResult()
    data class Error(val message: String) : CouponCheckResult()
}

data class CheckoutResult(
    val invoiceId: Long,
    val invoiceNumber: Long,
    val totalLocal: Double,
    val paidLocal: Double,
    val changeLocal: Double,
    val status: String = "PAID",
    val remainingDebt: Double = 0.0
)

class PosRepository(
    private val productDao: ProductDao,
    private val invoiceDao: InvoiceDao,
    private val invoiceItemDao: InvoiceItemDao,
    private val couponDao: CouponDao,
    private val customerDao: CustomerDao,
    private val debtSettlementDao: DebtSettlementDao,
    private val currency: CurrencyRepository
) {
    private val _carts = MutableStateFlow<List<Cart>>(listOf(Cart()))
    val carts: StateFlow<List<Cart>> = _carts.asStateFlow()

    private val _activeCartId = MutableStateFlow(_carts.value.first().id)
    val activeCartId: StateFlow<String> = _activeCartId.asStateFlow()

    val currentRate: Flow<Double> = currency.currentRateFlow()

    /** تدفق جميع الفواتير (لتاريخ الفواتير) */
    fun invoicesFlow(): Flow<List<Invoice>> = invoiceDao.observeAll()

    /** تفاصيل فاتورة معينة */
    suspend fun invoiceWithItems(id: Long): Pair<Invoice?, List<InvoiceItem>> =
        (invoiceDao.getById(id) to invoiceItemDao.itemsForInvoice(id))

    // ---------- إدارة الكوبونات ----------

    fun couponsFlow(): Flow<List<Coupon>> = couponDao.observeAll()

    suspend fun addCoupon(coupon: Coupon): Long = couponDao.insert(coupon)

    suspend fun updateCoupon(coupon: Coupon) = couponDao.update(coupon)

    suspend fun deleteCoupon(coupon: Coupon) = couponDao.delete(coupon)

    fun activeCart(): Cart = _carts.value.first { it.id == _activeCartId.value }

    /** العثور على منتج بواسطة الباركود (يستخدم بعد المسح الضوئي) */
    suspend fun findProductByBarcode(code: String): Product? = productDao.getByBarcode(code)

    fun switchCart(id: String) {
        if (_carts.value.any { it.id == id }) _activeCartId.value = id
    }

    fun openNewCart() {
        _carts.update { it + Cart() }
        _activeCartId.value = _carts.value.last().id
    }

    fun discardCart(cartId: String) {
        _carts.update { list ->
            val remaining = list.filter { it.id != cartId }
            if (remaining.isEmpty()) listOf(Cart()) else remaining
        }
        if (_carts.value.none { it.id == _activeCartId.value }) {
            _activeCartId.value = _carts.value.last().id
        }
    }

    fun addProductToActiveCart(product: Product, qty: Int = 1) {
        val cart = activeCart()
        val existing = cart.lines.firstOrNull { it.product.id == product.id }
        if (existing != null) {
            existing.quantity += qty
        } else {
            cart.lines.add(CartLine(product = product, quantity = qty))
        }
        _carts.update { it.toList() }
    }

    fun setQuantity(productId: Long, quantity: Int) {
        val cart = activeCart()
        val line = cart.lines.firstOrNull { it.product.id == productId } ?: return
        line.quantity = quantity.coerceAtLeast(1)
        _carts.update { it.toList() }
    }

    fun setOverridePrice(productId: Long, priceUsd: Double) {
        val cart = activeCart()
        cart.lines.firstOrNull { it.product.id == productId }?.overridePriceUsd = priceUsd.coerceAtLeast(0.0)
        _carts.update { it.toList() }
    }

    /** خصم مباشر على بند داخل الفاتورة (بالجنيه) — يُقيَّد بألا يتجاوز إجمالي البند */
    fun setLineDiscount(productId: Long, amountLocal: Double, rate: Double) {
        val cart = activeCart()
        val line = cart.lines.firstOrNull { it.product.id == productId } ?: return
        val cap = currency.toLocal(line.lineUsd, rate)
        line.discountLocal = amountLocal.coerceIn(0.0, cap)
        _carts.update { it.toList() }
    }

    fun removeLine(productId: Long) {
        val cart = activeCart()
        cart.lines.removeAll { it.product.id == productId }
        _carts.update { it.toList() }
    }

    fun setCustomerName(name: String) {
        activeCart().customerName = name.trim()
        _carts.update { it.toList() }
    }

    fun setCustomerPhone(phone: String) {
        activeCart().customerPhone = phone.trim()
        _carts.update { it.toList() }
    }

    fun setPaymentMethod(method: String) {
        val cart = activeCart()
        cart.paymentMethod = method
        cart.remainingDebt = 0.0
        _carts.update { it.toList() }
    }

    fun setTransferRef(ref: String) {
        activeCart().transferRef = ref.trim()
        _carts.update { it.toList() }
    }

    fun setPaidAmountLocal(amount: Double) {
        activeCart().paidAmountLocal = amount.coerceAtLeast(0.0)
        _carts.update { it.toList() }
    }

    fun setTransferReceiptPath(path: String?) {
        activeCart().transferReceiptPath = path
        _carts.update { it.toList() }
    }

    fun setManualDiscount(local: Double) {
        activeCart().manualDiscountLocal = local.coerceAtLeast(0.0)
        _carts.update { it.toList() }
    }

    fun clearCoupon() {
        val cart = activeCart()
        cart.coupon = null
        cart.couponCode = ""
        _carts.update { it.toList() }
    }

    /** التحقق من الكوبون وربطه بالفاتورة الحالية */
    suspend fun applyCoupon(code: String, rate: Double): CouponCheckResult {
        val cart = activeCart()
        if (cart.lines.isEmpty()) return CouponCheckResult.Error("الفاتورة فارغة")
        if (code.isBlank()) return CouponCheckResult.Error("أدخل كود الخصم")

        val coupon = couponDao.findByCode(code.trim())
            ?: return CouponCheckResult.Error("الكود غير صحيح")

        val now = System.currentTimeMillis()
        if (!coupon.active) return CouponCheckResult.Error("هذا الكوبون معطّل")
        if (coupon.usedCount >= coupon.maxUses) return CouponCheckResult.Error("تم استهلاك كل مرات الاستخدام")
        if (now < coupon.startAt) return CouponCheckResult.Error("الكوبون لم يبدأ بعد")
        if (now > coupon.endAt) return CouponCheckResult.Error("انتهت صلاحية الكوبون")

        val subTotalLocal = currency.toLocal(subtotalUsd(cart), rate)
        val discount = couponDiscount(coupon, subTotalLocal)

        cart.coupon = coupon
        cart.couponCode = coupon.code
        _carts.update { it.toList() }
        return CouponCheckResult.Success(coupon, discount, subTotalLocal)
    }

    private fun couponDiscount(coupon: Coupon, subTotalLocal: Double): Double = when (coupon.type) {
        "PERCENT" -> currency.round2(subTotalLocal * coupon.value / 100.0)
        else -> Math.min(coupon.value, subTotalLocal)
    }

    fun subtotalUsd(cart: Cart): Double = cart.lines.sumOf { it.lineUsd }

    fun subtotalLocal(cart: Cart, rate: Double): Double = currency.toLocal(subtotalUsd(cart), rate)

    fun couponDiscountLocal(cart: Cart, rate: Double): Double {
        val coupon = cart.coupon ?: return 0.0
        return couponDiscount(coupon, subtotalLocal(cart, rate))
    }

    /** مجموع خصومات البنود المباشرة (بالجنيه) */
    fun lineDiscountsLocal(cart: Cart): Double =
        currency.round2(cart.lines.sumOf { it.discountLocal })

    fun totalDiscountLocal(cart: Cart, rate: Double): Double =
        currency.round2(lineDiscountsLocal(cart) + cart.manualDiscountLocal + couponDiscountLocal(cart, rate))

    fun totalLocal(cart: Cart, rate: Double): Double =
        Math.max(0.0, currency.round2(subtotalLocal(cart, rate) - totalDiscountLocal(cart, rate)))

    /** تسليم الفاتورة: حفظها + تنزيل المخزون + زيادة استخدام الكوبون */
    suspend fun checkout(cart: Cart, rate: Double, paidLocal: Double): CheckoutResult {
        require(cart.lines.isNotEmpty()) { "الفاتورة فارغة" }

        val coupon = cart.coupon?.let {
            val fresh = couponDao.findByCode(it.code) ?: return@let null
            check(fresh.active) { "هذا الكوبون معطّل" }
            check(fresh.usedCount < fresh.maxUses) { "تم استهلاك كل مرات استخدام الكوبون" }
            check(System.currentTimeMillis() in fresh.startAt..fresh.endAt) { "الكوبون غير متاح الآن" }
            fresh
        }

        // التحقق من توفر المخزون قبل التنزيل
        for (line in cart.lines) {
            val current = productDao.getById(line.product.id)
                ?: throw IllegalStateException("المنتج ${line.product.name} لم يعد موجوداً")
            check(current.stock >= line.quantity) { "الكمية المطلوبة من ${current.name} أكبر من المتوفر (${current.stock})" }
        }

        val subTotalLocal = subtotalLocal(cart, rate)
        val couponDiscount = coupon?.let { couponDiscount(it, subTotalLocal) } ?: 0.0
        val totalDiscount = currency.round2(lineDiscountsLocal(cart) + cart.manualDiscountLocal + couponDiscount)
        val total = Math.max(0.0, currency.round2(subTotalLocal - totalDiscount))

        // حساب الدفع: يسمح بسداد جزئي (دَين) لأي طريقة دفع، وسداد كامل مع باقي للعميل
        val paid = currency.round2(paidLocal.coerceAtLeast(0.0))
        val hasDebt = paid < total
        val status: String = if (hasDebt) "PARTIAL" else "PAID"
        val change: Double = if (!hasDebt) currency.round2((paid - total).coerceAtLeast(0.0)) else 0.0
        val remainingDebt: Double = if (hasDebt) currency.round2((total - paid).coerceAtLeast(0.0)) else 0.0

        // ربط/إنشاء العميل في حالة وجود دَين غير مسدّد
        var linkedCustomer: Customer? = null
        if (remainingDebt > 0 && (cart.customerName.isNotBlank() || cart.customerPhone.isNotBlank())) {
            val existing = if (cart.customerPhone.isNotBlank())
                customerDao.findByPhone(cart.customerPhone)
            else
                customerDao.findByName(cart.customerName)
            val cust = existing ?: run {
                val id = customerDao.insert(
                    Customer(
                        name = cart.customerName.ifBlank { "عميل دَين" },
                        phone = cart.customerPhone
                    )
                )
                Customer(id = id, name = cart.customerName, phone = cart.customerPhone)
            }
            customerDao.addDebt(cust.id, remainingDebt)
            linkedCustomer = cust
        }

        val number = (invoiceDao.maxNumber() ?: 0L) + 1L

        val invoice = Invoice(
            number = number,
            status = status,
            customerName = cart.customerName,
            customerPhone = cart.customerPhone,
            customerId = linkedCustomer?.id,
            subTotalLocal = subTotalLocal,
            discountLocal = totalDiscount,
            couponId = coupon?.id,
            couponCode = coupon?.code ?: "",
            totalLocal = total,
            paidLocal = paid,
            changeLocal = change,
            paymentMethod = cart.paymentMethod,
            transferReceiptPath = cart.transferReceiptPath,
            transferRef = cart.transferRef,
            remainingDebt = remainingDebt
        )
        val invoiceId = invoiceDao.insert(invoice)

        invoiceItemDao.insertAll(cart.lines.map { line ->
            InvoiceItem(
                invoiceId = invoiceId,
                productId = line.product.id,
                productName = line.product.name,
                barcode = line.product.barcode,
                quantity = line.quantity,
                priceUsd = line.priceUsd,
                priceLocal = currency.toLocal(line.priceUsd, rate),
                costUsd = line.product.costUsd,
                costLocal = currency.toLocal(line.product.costUsd, rate),
                imagePath = line.product.imagePath
            )
        })

        for (line in cart.lines) {
            productDao.decreaseStock(line.product.id, line.quantity)
        }
        coupon?.let { couponDao.incrementUsed(it.id) }

        // إزالة الفاتورة المسلّمة من القائمة المفتوحة
        _carts.update { list ->
            val remaining = list.filter { it.id != cart.id }
            if (remaining.isEmpty()) listOf(Cart()) else remaining
        }
        if (_carts.value.none { it.id == _activeCartId.value }) {
            _activeCartId.value = _carts.value.last().id
        }

        return CheckoutResult(invoiceId, number, total, paid, change, status, remainingDebt)
    }

    // ---------- العملاء (الدَين) ----------

    fun customersFlow(): Flow<List<Customer>> = customerDao.observeAll()

    suspend fun findCustomerByPhone(phone: String): Customer? = customerDao.findByPhone(phone)

    suspend fun getCustomer(id: Long): Customer? = customerDao.getById(id)

    /** فواتير العميل (مبيعات + إيصالات تسديد) مع ربط قديم بالهاتف عند غياب customerId */
    suspend fun customerInvoices(customer: Customer): List<Invoice> =
        invoiceDao.invoicesForCustomer(customer.id, customer.phone)

    /** سجل حركات الدَين الخاص بالعميل */
    fun settlementsFlow(customerId: Long): Flow<List<DebtSettlement>> =
        debtSettlementDao.observeForCustomer(customerId)

    /**
     * تسديد جزء من الدَين: يُحدّث الدَين + يسجّل حركة تسديد + ينشئ إيصالاً رسمياً
     * في سجل الفواتير (facture مع رقم تسلسلي) ليظهر في تاریخ الفواتير.
     */
    suspend fun settleDebt(customerId: Long, amountLocal: Double, method: String, note: String): Long {
        require(amountLocal > 0) { "أدخل مبلغاً أكبر من صفر" }
        val cust = customerDao.getById(customerId) ?: error("العميل غير موجود")
        val newDebt = currency.round2((cust.totalDebt - amountLocal).coerceAtLeast(0.0))
        customerDao.setDebt(customerId, newDebt)
        val settlementId = debtSettlementDao.insert(
            DebtSettlement(
                customerId = customerId,
                customerName = cust.name,
                amountLocal = amountLocal,
                type = "SETTLE",
                method = method,
                note = note
            )
        )
        val number = (invoiceDao.maxNumber() ?: 0L) + 1L
        invoiceDao.insert(
            Invoice(
                number = number,
                status = "PAID",
                customerName = cust.name,
                customerPhone = cust.phone,
                customerId = customerId,
                totalLocal = amountLocal,
                paidLocal = amountLocal,
                paymentMethod = method,
                kind = "DEBT"
            )
        )
        return settlementId
    }

    /** إضافة دَين يدوي (إضافة سطر/تصحيح خصم) مع تسجيل في سجل الحركات */
    suspend fun addCustomerCharge(customerId: Long, amountLocal: Double, note: String) {
        require(amountLocal > 0) { "أدخل مبلغاً أكبر من صفر" }
        val cust = customerDao.getById(customerId) ?: error("العميل غير موجود")
        customerDao.addDebt(customerId, amountLocal)
        debtSettlementDao.insert(
            DebtSettlement(
                customerId = customerId,
                customerName = cust.name,
                amountLocal = amountLocal,
                type = "ADJUST_UP",
                note = note
            )
        )
    }

    /** تصحيح يدوي يُخفّض الدَين (لتسوية أخطاء) مع تسجيل في سجل الحركات */
    suspend fun correctCustomerDebt(customerId: Long, amountLocal: Double, note: String) {
        require(amountLocal > 0) { "أدخل مبلغاً أكبر من صفر" }
        val cust = customerDao.getById(customerId) ?: error("العميل غير موجود")
        val newDebt = currency.round2((cust.totalDebt - amountLocal).coerceAtLeast(0.0))
        customerDao.setDebt(customerId, newDebt)
        debtSettlementDao.insert(
            DebtSettlement(
                customerId = customerId,
                customerName = cust.name,
                amountLocal = amountLocal,
                type = "ADJUST_DOWN",
                note = note
            )
        )
    }
}