package com.quickpos.app.ui.screens.invoices

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.quickpos.app.QuickPosApp
import com.quickpos.app.ui.components.AppCard
import com.quickpos.app.ui.components.EmptyState
import com.quickpos.app.ui.components.ScreenBar
import com.quickpos.app.ui.components.StatusPill
import com.quickpos.app.ui.navigation.Routes
import com.quickpos.app.util.Fmt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvoicesScreen(nav: NavHostController) {
    val app = QuickPosApp.from(LocalContext.current)
    val invoices by app.pos.invoicesFlow().collectAsState(initial = emptyList())

    Scaffold(
        topBar = { ScreenBar("الفواتير", onBack = { nav.popBackStack() }) },
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
    ) { padding ->
        if (invoices.isEmpty()) {
            EmptyState("لا توجد فواتير بعد", Modifier.padding(padding))
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(invoices) { invoice ->
                    AppCard(modifier = Modifier.clickable { nav.navigate(Routes.invoiceDetail(invoice.id)) }) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.ReceiptLong,
                                contentDescription = null,
                                tint = if (invoice.status == "PAID") MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.error,
                            )
                            Column(Modifier.weight(1f).padding(start = 12.dp)) {
                                Text(
                                    "فاتورة #${invoice.number}",
                                    style = MaterialTheme.typography.titleSmall,
                                    color = MaterialTheme.colorScheme.onSurface,
                                )
                                Text(
                                    buildString {
                                        append(Fmt.dateTime(invoice.createdAt))
                                        if (invoice.customerName.isNotBlank()) append("  •  ${invoice.customerName}")
                                        if (invoice.couponCode.isNotBlank()) append("  •  كوبون")
                                    },
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1,
                                )
                            }
                            StatusPill(
                                text = Fmt.sdg(invoice.totalLocal),
                                color = if (invoice.status == "PAID") MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.error,
                            )
                        }
                    }
                }
            }
        }
    }
}