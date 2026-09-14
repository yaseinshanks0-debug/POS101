package com.quickpos.app.ui.screens.home

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.AddCard
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.quickpos.app.QuickPosApp
import com.quickpos.app.ui.components.AppCard
import com.quickpos.app.ui.components.EmptyState
import com.quickpos.app.ui.components.ScreenBar
import com.quickpos.app.ui.components.SectionCard
import com.quickpos.app.ui.components.StatCard
import com.quickpos.app.ui.navigation.Routes
import com.quickpos.app.util.Fmt
import com.quickpos.app.util.Notifier
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(nav: NavHostController) {
    val app = QuickPosApp.from(LocalContext.current)
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val rate by app.currency.currentRateFlow().collectAsState(initial = 0.0)
    val lowStock by app.catalog.observeLowStock().collectAsState(initial = emptyList())

    var businessName by remember { mutableStateOf("متجري") }
    var todayReport by remember { mutableStateOf<com.quickpos.app.data.repository.FinancialReport?>(null) }

    val notifPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { }

    LaunchedEffect(Unit) {
        businessName = app.settings.businessName()
        Notifier.ensureLowStockChannel(context)
        if (Build.VERSION.SDK_INT >= 33 && !Notifier.notificationsAllowed(context)) {
            notifPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
        scope.launch {
            Notifier.showLowStock(context, app.catalog.observeLowStock().first())
        }
    }

    LaunchedEffect(rate) {
        if (rate > 0) {
            val now = System.currentTimeMillis()
            todayReport = app.reports.report(Fmt.startOfDay(now), Fmt.endOfDay(now), rate)
        }
    }

    Scaffold(
        topBar = { ScreenBar(businessName) },
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                if (rate > 0) {
                    RateBanner(rate = rate)
                } else {
                    RateWarning()
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    todayReport?.let { r ->
                        StatCard(
                            label = "مبيعات اليوم",
                            value = Fmt.sdg(r.grossSalesLocal),
                            icon = Icons.AutoMirrored.Filled.ReceiptLong,
                            accent = true,
                            modifier = Modifier.weight(1f),
                        )
                        StatCard(
                            label = "صافي ربح اليوم",
                            value = Fmt.sdg(r.netProfitLocal),
                            icon = Icons.Filled.AccountBalanceWallet,
                            modifier = Modifier.weight(1f),
                        )
                    } ?: run {
                        StatCard(
                            label = "مبيعات اليوم",
                            value = "…",
                            icon = Icons.AutoMirrored.Filled.ReceiptLong,
                            accent = true,
                            modifier = Modifier.weight(1f),
                        )
                        StatCard(
                            label = "صافي ربح اليوم",
                            value = "…",
                            icon = Icons.Filled.AccountBalanceWallet,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    HomeShortcut(
                        text = "المنتجات",
                        icon = Icons.Filled.Category,
                        onClick = { nav.navigate(Routes.PRODUCTS) },
                        modifier = Modifier.weight(1f),
                    )
                    HomeShortcut(
                        text = "المصروفات",
                        icon = Icons.Filled.AddCard,
                        onClick = { nav.navigate(Routes.EXPENSES) },
                        modifier = Modifier.weight(1f),
                    )
                    HomeShortcut(
                        text = "العروض",
                        icon = Icons.Filled.LocalOffer,
                        onClick = { nav.navigate(Routes.COUPONS) },
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            todayReport?.let { r ->
                item {
                    SectionCard("مصروفات اليوم") {
                        Text(
                            Fmt.sdg(r.expensesLocal),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                }
            }

            item {
                SectionCard("تنبيهات المخزون المنخفض") {
                    if (lowStock.isEmpty()) {
                        EmptyState("المخزون جيد — لا توجد منتجات تحت الحد الأدنى")
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            lowStock.forEach { p ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { nav.navigate(Routes.PRODUCTS) }
                                        .padding(vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    Icon(
                                        Icons.Filled.Warning,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.error,
                                        modifier = Modifier.padding(0.dp),
                                    )
                                    Column(Modifier.weight(1f)) {
                                        Text(p.name, style = MaterialTheme.typography.bodyLarge)
                                        Text(
                                            "المتبقي: ${p.stock} (يتطلب بحد أدنى ${p.lowStockThreshold})",
                                            style = MaterialTheme.typography.labelMedium,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    OutlinedButton(
                        onClick = { nav.navigate(Routes.REPORTS) },
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                    ) {
                        Text("التقارير وتوصيات العروض")
                    }
                    OutlinedButton(
                        onClick = { nav.navigate(Routes.DAY_CLOSE) },
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                    ) {
                        Text("إغلاق اليوم")
                    }
                }
            }
        }
    }
}

@Composable
private fun RateBanner(rate: Double) {
    Surface(
        shape = MaterialTheme.shapes.large,
        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.16f),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.Filled.AccountBalanceWallet,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
            )
            Text(
                "سعر الدولار الحالي: ${Fmt.sdg(rate)}",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onBackground,
            )
        }
    }
}

@Composable
private fun RateWarning() {
    Surface(
        shape = MaterialTheme.shapes.large,
        color = MaterialTheme.colorScheme.error.copy(alpha = 0.16f),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Text(
            "⚠ لم يتم تحديد سعر الدولار — افتح الإعدادات",
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.error,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
        )
    }
}

@Composable
private fun HomeShortcut(
    text: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    FilledTonalButton(
        onClick = onClick,
        modifier = modifier.height(52.dp),
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.padding(end = 6.dp))
        Text(text)
    }
}