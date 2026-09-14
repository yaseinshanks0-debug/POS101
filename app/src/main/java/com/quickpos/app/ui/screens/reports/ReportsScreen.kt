package com.quickpos.app.ui.screens.reports

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.ShoppingBasket
import androidx.compose.material.icons.filled.Savings
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.quickpos.app.QuickPosApp
import com.quickpos.app.data.repository.FinancialReport
import com.quickpos.app.data.repository.InventoryValuation
import com.quickpos.app.data.repository.PromoSuggestion
import com.quickpos.app.data.repository.TopProduct
import com.quickpos.app.ui.components.AppAlertDialog
import com.quickpos.app.ui.components.AppCard
import com.quickpos.app.ui.components.DetailRow
import com.quickpos.app.ui.components.EmptyState
import com.quickpos.app.ui.components.ScreenBar
import com.quickpos.app.ui.components.StatCard
import com.quickpos.app.ui.navigation.Routes
import com.quickpos.app.util.Fmt
import com.quickpos.app.util.ReportExporter
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsScreen(nav: NavHostController) {
    val app = QuickPosApp.from(LocalContext.current)
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val rate by app.currency.currentRateFlow().collectAsState(initial = 0.0)
    var period by remember { mutableIntStateOf(0) }
    var report by remember { mutableStateOf<FinancialReport?>(null) }
    var topProducts by remember { mutableStateOf<List<TopProduct>>(emptyList()) }
    var suggestions by remember { mutableStateOf<List<PromoSuggestion>>(emptyList()) }
    var valuation by remember { mutableStateOf<InventoryValuation?>(null) }
    var exporting by remember { mutableStateOf(false) }
    var exportMessage by remember { mutableStateOf<String?>(null) }

    fun periodRange(): Pair<Long, Long> {
        val now = System.currentTimeMillis()
        return when (period) {
            0 -> Fmt.startOfDay(now) to Fmt.endOfDay(now)
            1 -> Fmt.daysAgo(6) to now
            2 -> Fmt.daysAgo(29) to now
            else -> 0L to Long.MAX_VALUE
        }
    }

    LaunchedEffect(period, rate) {
        if (rate <= 0) return@LaunchedEffect
        val (from, to) = periodRange()
        report = app.reports.report(from, to, rate)
        topProducts = app.reports.topProducts(from, to, rate)
        suggestions = app.reports.suggestions(rate)
        valuation = app.reports.inventoryValuation(rate)
    }

    Scaffold(
        topBar = { ScreenBar("التقارير", onBack = { nav.popBackStack() }) },
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("اليوم", "7 أيام", "30 يوم", "الكل").forEachIndexed { index, label ->
                        FilterChip(
                            selected = period == index,
                            onClick = { period = index },
                            label = { Text(label) },
                        )
                    }
                }
            }

            item {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    val expEnabled = !exporting && report != null && rate > 0
                    OutlinedButton(
                        onClick = {
                            val r = report ?: return@OutlinedButton
                            val (from, to) = periodRange()
                            exporting = true
                            scope.launch {
                                runCatching {
                                    ReportExporter.exportPdf(context, r, topProducts, rate, from, to)
                                }.onSuccess { file ->
                                    exportMessage = if (ReportExporter.shareFile(context, file, "application/pdf")) {
                                        "تم تصدير تقرير PDF وشاشته"
                                    } else {
                                        "فشل فتح المشاركة (الملف محفوظ: ${file.absolutePath})"
                                    }
                                }.onFailure { exportMessage = it.message ?: "فشل تصدير PDF" }
                                exporting = false
                            }
                        },
                        enabled = expEnabled,
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                    ) {
                        Icon(Icons.Filled.Share, contentDescription = null)
                        Text("تصدير PDF", modifier = Modifier.padding(start = 6.dp))
                    }
                    OutlinedButton(
                        onClick = {
                            val r = report ?: return@OutlinedButton
                            val (from, to) = periodRange()
                            exporting = true
                            scope.launch {
                                runCatching {
                                    ReportExporter.exportCsv(context, r, topProducts, rate, from, to)
                                }.onSuccess { file ->
                                    exportMessage = if (ReportExporter.shareFile(context, file, "text/csv")) {
                                        "تم تصدير ملف Excel (CSV) وشاشته"
                                    } else {
                                        "فشل فتح المشاركة (الملف محفوظ: ${file.absolutePath})"
                                    }
                                }.onFailure { exportMessage = it.message ?: "فشل تصدير CSV" }
                                exporting = false
                            }
                        },
                        enabled = expEnabled,
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                    ) {
                        Icon(Icons.Filled.Share, contentDescription = null)
                        Text("تصدير Excel", modifier = Modifier.padding(start = 6.dp))
                    }
                }
            }

            if (rate <= 0) {
                item {
                    Surface(
                        shape = MaterialTheme.shapes.medium,
                        color = MaterialTheme.colorScheme.errorContainer,
                    ) {
                        Text(
                            "حدد سعر الدولار من الإعدادات أولاً لحساب الأرباح بالجنيه.",
                            modifier = Modifier.padding(14.dp),
                            color = MaterialTheme.colorScheme.onErrorContainer,
                        )
                    }
                }
            }

            val r = report
            if (r != null) {
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        StatCard("إجمالي المبيعات", Fmt.sdg(r.grossSalesLocal), Icons.Filled.Receipt, Modifier.weight(1f), accent = true)
                        StatCard("الخصومات", Fmt.sdg(r.discountsLocal), Icons.Filled.LocalOffer, Modifier.weight(1f))
                    }
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        StatCard("صافي المبيعات", Fmt.sdg(r.netSalesLocal), Icons.Filled.Calculate, Modifier.weight(1f))
                        StatCard("تكلفة البضاعة", Fmt.sdg(r.costOfGoodsLocal), Icons.Filled.ShoppingBasket, Modifier.weight(1f))
                    }
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        StatCard("إجمالي الربح", Fmt.sdg(r.grossProfitLocal), Icons.Filled.Calculate, Modifier.weight(1f), accent = true)
                        StatCard("المصروفات", Fmt.sdg(r.expensesLocal), Icons.Filled.Savings, Modifier.weight(1f))
                    }
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        StatCard("صافي الربح", Fmt.sdg(r.netProfitLocal), Icons.Filled.Calculate, Modifier.weight(1f), accent = r.netProfitLocal > 0)
                        StatCard("عدد الفواتير", "${r.invoiceCount}", Icons.Filled.Receipt, Modifier.weight(1f))
                    }
                }
                item {
                    AppCard {
                        DetailRow(label = "متوسط قيمة الفاتورة", value = Fmt.sdg(r.averageSaleLocal))
                    }
                }
            }

            val v = valuation
            if (v != null) {
                item {
                    Text(
                        "تقييم المخزون (الجرد)",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        StatCard("عدد الأصناف", "${v.productCount}", Icons.Filled.ShoppingBasket, Modifier.weight(1f))
                        StatCard("القطع بالمخزون", "${v.totalUnits}", Icons.Filled.ShoppingBasket, Modifier.weight(1f))
                    }
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        StatCard("قيمة المخزون (تكلفة)", Fmt.sdg(v.valueCostLocal), Icons.Filled.Calculate, Modifier.weight(1f), accent = true)
                        StatCard("قيمة المخزون (بيع)", Fmt.sdg(v.valuePriceLocal), Icons.Filled.Calculate, Modifier.weight(1f))
                    }
                }
            }

            item {
                OutlinedButton(onClick = { nav.navigate(Routes.EXPENSES) }, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Filled.Savings, contentDescription = null)
                    Text("إدارة المصروفات", modifier = Modifier.padding(start = 8.dp))
                }
            }

            if (suggestions.isNotEmpty()) {
                item {
                    Text(
                        "توصيات العروض",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
                items(suggestions) { s ->
                    AppCard {
                        Column {
                            Text(s.title, style = MaterialTheme.typography.titleSmall)
                            Spacer(Modifier.height(4.dp))
                            Text(
                                s.description,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Spacer(Modifier.height(6.dp))
                            Text(
                                "الخصم المقترح: ${Fmt.pct(s.suggestedDiscountPercent.toDouble())}",
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.primary,
                            )
                            Spacer(Modifier.height(4.dp))
                            Button(onClick = { nav.navigate(Routes.COUPONS) }, modifier = Modifier.fillMaxWidth()) {
                                Text("أنشئ كوبون بهذا الخصم")
                            }
                        }
                    }
                }
            }

            if (topProducts.isNotEmpty()) {
                item {
                    Text(
                        "الأكثر مبيعاً في الفترة",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
                items(topProducts) { p ->
                    AppCard {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                        ) {
                            Text(p.productName, modifier = Modifier.weight(1f))
                            Text("كمية: ${Fmt.money(p.quantity)}", style = MaterialTheme.typography.labelMedium)
                            Text(
                                Fmt.sdg(p.revenueLocal),
                                style = MaterialTheme.typography.titleSmall,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.padding(start = 12.dp),
                            )
                        }
                    }
                }
            } else {
                item { EmptyState("لا توجد مبيعات في هذه الفترة بعد") }
            }
        }
    }

    exportMessage?.let {
        AppAlertDialog(title = "تصدير التقرير", text = it, onDismiss = { exportMessage = null })
    }
}