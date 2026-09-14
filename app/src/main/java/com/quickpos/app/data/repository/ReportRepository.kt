package com.quickpos.app.data.repository

import com.quickpos.app.data.local.daos.CustomerDao
import com.quickpos.app.data.local.daos.ExpenseDao
import com.quickpos.app.data.local.daos.InvoiceDao
import com.quickpos.app.data.local.daos.InvoiceItemDao
import com.quickpos.app.data.local.daos.ProductDao
import kotlinx.coroutines.flow.first

/** ملخص مالي للفترة المحددة */
data class FinancialReport(
    val from: Long,
    val to: Long,
    val invoiceCount: Int,
    val itemsCount: Int,
    val grossSalesLocal: Double,
    val discountsLocal: Double,
    val netSalesLocal: Double,
    val costOfGoodsLocal: Double,
    val grossProfitLocal: Double,
    val expensesLocal: Double,
    val netProfitLocal: Double,
    val averageSaleLocal: Double
)

/** اقتراح عرض/تخفيض يقدمه النظام بناءً على تحليل الأداء */
data class PromoSuggestion(
    val title: String,
    val description: String,
    val suggestedDiscountPercent: Int
)

data class TopProduct(
    val productName: String,
    val quantity: Double,
    val revenueLocal: Double
)

/** تقييم المخزون الحالي (الجرد) */
data class InventoryValuation(
    val productCount: Int,
    val totalUnits: Long,
    val valueCostLocal: Double,
    val valuePriceLocal: Double
)

/** إغلاق اليوم: ملخص مالي نهاية اليوم يشمل توزيع المدفوعات وحركة الديون */
data class DayCloseReport(
    val invoiceCount: Int,
    val grossSalesLocal: Double,
    val discountsLocal: Double,
    val netSalesLocal: Double,
    val costOfGoodsLocal: Double,
    val grossProfitLocal: Double,
    val expensesLocal: Double,
    val netProfitLocal: Double,
    val cashPaidLocal: Double,
    val transferPaidLocal: Double,
    val debtPaidLocal: Double,
    val newDebtLocal: Double,
    val outstandingDebtsLocal: Double
)

class ReportRepository(
    private val invoiceDao: InvoiceDao,
    private val invoiceItemDao: InvoiceItemDao,
    private val expenseDao: ExpenseDao,
    private val productDao: ProductDao,
    private val customerDao: CustomerDao,
    private val currency: CurrencyRepository
) {
    suspend fun report(from: Long, to: Long, rate: Double): FinancialReport {
        val grossSales = invoiceDao.sumTotalBetween(from, to)
        val discounts = invoiceDao.sumDiscountBetween(from, to)
        val netSales = currency.round2(grossSales - discounts)
        val cost = invoiceItemDao.sumCostBetween(from, to)
        val grossProfit = currency.round2(netSales - cost)
        val expenses = expenseDao.sumBetween(from, to)
        val netProfit = currency.round2(grossProfit - expenses)
        val count = invoiceDao.countPaidBetween(from, to)
        val itemsCount = invoiceItemDao.distinctProductsBetween(from, to)

        return FinancialReport(
            from = from,
            to = to,
            invoiceCount = count,
            itemsCount = itemsCount,
            grossSalesLocal = grossSales,
            discountsLocal = discounts,
            netSalesLocal = netSales,
            costOfGoodsLocal = cost,
            grossProfitLocal = grossProfit,
            expensesLocal = expenses,
            netProfitLocal = netProfit,
            averageSaleLocal = if (count > 0) currency.round2(grossSales / count) else 0.0
        )
    }

    suspend fun topProducts(from: Long, to: Long, rate: Double): List<TopProduct> =
        invoiceItemDao.topProductsBetween(from, to).map {
            TopProduct(it.productName, it.totalQty, currency.round2(it.totalRevenue))
        }

    /** إغلاق اليوم: ملخص نهاية اليوم يشمل توزيع المدفوعات حسب الطريقة وحركة الديون */
    suspend fun dayClose(from: Long, to: Long, rate: Double): DayCloseReport {
        val gross = invoiceDao.sumTotalBetween(from, to)
        val discounts = invoiceDao.sumDiscountBetween(from, to)
        val netSales = currency.round2(gross - discounts)
        val cost = invoiceItemDao.sumCostBetween(from, to)
        val grossProfit = currency.round2(netSales - cost)
        val expenses = expenseDao.sumBetween(from, to)
        val netProfit = currency.round2(grossProfit - expenses)

        val paidByMethod = invoiceDao.paidSumByMethodBetween(from, to)
            .associate { it.paymentMethod to it.totalPaid }
        val newDebt = invoiceDao.sumRemainingDebtBetween(from, to)
        val outstanding = customerDao.sumTotalDebt()

        return DayCloseReport(
            invoiceCount = invoiceDao.countPaidBetween(from, to),
            grossSalesLocal = gross,
            discountsLocal = discounts,
            netSalesLocal = netSales,
            costOfGoodsLocal = cost,
            grossProfitLocal = grossProfit,
            expensesLocal = expenses,
            netProfitLocal = netProfit,
            cashPaidLocal = paidByMethod["CASH"] ?: 0.0,
            transferPaidLocal = paidByMethod["TRANSFER"] ?: 0.0,
            debtPaidLocal = paidByMethod["DEBT"] ?: 0.0,
            newDebtLocal = newDebt,
            outstandingDebtsLocal = outstanding
        )
    }

    /** تقييم المخزون الحالي: عدد الأصناف/القطع وقيمة المخزون بالتكلفة وبسعر البيع */
    suspend fun inventoryValuation(rate: Double): InventoryValuation {
        val inStock = productDao.inStock()
        val units = inStock.sumOf { it.stock.toLong() }
        val valueCost = currency.round2(inStock.sumOf { it.stock * it.costUsd * rate })
        val valuePrice = currency.round2(inStock.sumOf { it.stock * it.priceUsd * rate })
        return InventoryValuation(inStock.size, units, valueCost, valuePrice)
    }

    /** محرك الاقتراحات: يحلل حركة البيع والمخزون ويقترح عروضاً ذكية */
    suspend fun suggestions(rate: Double): List<PromoSuggestion> {
        val result = mutableListOf<PromoSuggestion>()
        val now = System.currentTimeMillis()

        val soldSince = now - SLOW_PERIOD_MS
        val soldProductIds = invoiceItemDao.soldProductIdsSince(soldSince).toSet()
        val inStock = productDao.inStock()

        // 1) منتجات بطيئة الحركة (مخزون موجود ولم تُبِع منذ 3 أسابيع)
        val slowMovers = inStock.filter { it.id !in soldProductIds }
        if (slowMovers.isNotEmpty()) {
            val sample = slowMovers.take(3).joinToString("، ") { it.name }
            val suggested = if (slowMovers.size >= 3) 15 else 10
            result.add(
                PromoSuggestion(
                    title = "تخفيض على البطيء الحركة",
                    description = "${slowMovers.size} منتج لم يُبع أخيراً (أبرزها: $sample). خصم نسبته $suggested% يسرّع تصريفها ويحرّر سيولة.",
                    suggestedDiscountPercent = suggested
                )
            )
        }

        // 2) مخزون مكدّس (أكثر من 4 أضعاف حد التنبيه)
        val overstock = inStock.filter { it.lowStockThreshold > 0 && it.stock >= it.lowStockThreshold * 4 }
        if (overstock.isNotEmpty()) {
            val names = overstock.take(3).joinToString("، ") { it.name }
            result.add(
                PromoSuggestion(
                    title = "تنبيه: مخزون مكدّس",
                    description = "كميات كبيرة متراكمة في: $names. عرض \u201Cبكمية+هدية\u201D أو خصم 10% سيحسّن الدوران.",
                    suggestedDiscountPercent = 10
                )
            )
        }

        // 3) إجمالي البيع ضعيف مؤخراً → اقتراح خصم شامل قصير
        val weekAgo = now - WEEK_MS
        val weekSales = invoiceDao.sumTotalBetween(weekAgo, now)
        if (invoiceDao.countPaidBetween(weekAgo, now) == 0 || weekSales > 0.0) {
            // لا اقتراح إضافي هنا لتجنب الازدحام
        }

        // 4) اقتراح ثابت: كوبونات وقتية لتنشيط المبيعات
        result.add(
            PromoSuggestion(
                title = "كوبون وقت محدود",
                description = "أنشئ كوداً خصماً (مثلاً 10% لمدة 48 ساعة وعدد استخدامات 25) لتحفيز الشراء بسرعة.",
                suggestedDiscountPercent = 10
            )
        )

        return result.distinctBy { it.title }.take(5)
    }

    private companion object {
        const val DAY_MS = 86_400_000L * 1L
        const val WEEK_MS = DAY_MS * 7
        const val SLOW_PERIOD_MS = DAY_MS * 21
    }
}