package com.quickpos.app.ui.screens.reports

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Savings
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.quickpos.app.QuickPosApp
import com.quickpos.app.data.repository.DayCloseReport
import com.quickpos.app.ui.components.ScreenBar
import com.quickpos.app.ui.components.SectionCard
import com.quickpos.app.ui.components.StatCard
import com.quickpos.app.util.Fmt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DayCloseScreen(nav: NavHostController) {
    val app = QuickPosApp.from(LocalContext.current)
    val rate by app.currency.currentRateFlow().collectAsState(initial = 0.0)
    var report by remember { mutableStateOf<DayCloseReport?>(null) }

    LaunchedEffect(rate) {
        if (rate <= 0) return@LaunchedEffect
        val now = System.currentTimeMillis()
        report = app.reports.dayClose(Fmt.startOfDay(now), Fmt.endOfDay(now), rate)
    }

    Scaffold(
        topBar = { ScreenBar("إغلاق اليوم", onBack = { nav.popBackStack() }) },
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            if (rate <= 0) {
                item {
                    Surface(
                        shape = MaterialTheme.shapes.medium,
                        color = MaterialTheme.colorScheme.errorContainer,
                    ) {
                        Text(
                            "حدد سعر الدولار من الإعدادات أولاً.",
                            modifier = Modifier.padding(14.dp),
                            color = MaterialTheme.colorScheme.onErrorContainer,
                        )
                    }
                }
            }

            val r = report
            if (r != null) {
                item {
                    Text(
                        Fmt.date(System.currentTimeMillis()) + " — ملخص نهاية اليوم",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        StatCard("فواتير", "${r.invoiceCount}", Icons.Filled.Receipt, Modifier.weight(1f), accent = true)
                        StatCard("صافي المبيعات", Fmt.sdg(r.netSalesLocal), Icons.Filled.Calculate, Modifier.weight(1f))
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
                        StatCard("الخصومات", Fmt.sdg(r.discountsLocal), Icons.Filled.Calculate, Modifier.weight(1f))
                    }
                }

                item {
                    SectionCard(title = "المدفوعات المستلمة اليوم") {
                        paymentLine("كاش", Fmt.sdg(r.cashPaidLocal))
                        paymentLine("تحويل", Fmt.sdg(r.transferPaidLocal))
                        paymentLine("دَين (مسدد جزئياً اليوم)", Fmt.sdg(r.debtPaidLocal))
                    }
                }

                item {
                    SectionCard(title = "حركة الديون") {
                        paymentLine(
                            "دَين جديد تكوّن اليوم",
                            Fmt.sdg(r.newDebtLocal),
                            color = if (r.newDebtLocal > 0) MaterialTheme.colorScheme.error else null,
                        )
                        paymentLine(
                            "إجمالي الديون المستحقة على العملاء",
                            Fmt.sdg(r.outstandingDebtsLocal),
                            color = if (r.outstandingDebtsLocal > 0) MaterialTheme.colorScheme.error else null,
                        )
                    }
                }

                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        StatCard("كاش اليوم", Fmt.sdg(r.cashPaidLocal), Icons.Filled.AccountBalanceWallet, Modifier.weight(1f), accent = true)
                        StatCard("تحويلات اليوم", Fmt.sdg(r.transferPaidLocal), Icons.AutoMirrored.Filled.Send, Modifier.weight(1f))
                    }
                }

                if (r.newDebtLocal > 0) {
                    item {
                        Surface(
                            shape = MaterialTheme.shapes.medium,
                            color = MaterialTheme.colorScheme.errorContainer,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                Modifier.padding(14.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                            ) {
                                Icon(
                                    Icons.Filled.Warning,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onErrorContainer,
                                )
                                Text(
                                    "توجد ديون اليوم غير مسدّدة — راجع قائمة العملاء لتسديدها.",
                                    color = MaterialTheme.colorScheme.onErrorContainer,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun paymentLine(label: String, value: String, color: Color? = null) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.weight(1f),
        )
        Text(
            value,
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold,
            color = color ?: MaterialTheme.colorScheme.onSurface,
        )
    }
}