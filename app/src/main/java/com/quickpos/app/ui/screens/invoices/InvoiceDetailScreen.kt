package com.quickpos.app.ui.screens.invoices

import android.content.Intent
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
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.quickpos.app.QuickPosApp
import com.quickpos.app.data.local.entities.Invoice
import com.quickpos.app.data.local.entities.InvoiceItem
import com.quickpos.app.ui.components.AppCard
import com.quickpos.app.ui.components.ClickablePhoto
import com.quickpos.app.ui.components.DetailRow
import com.quickpos.app.ui.components.EmptyState
import com.quickpos.app.ui.components.ScreenBar
import com.quickpos.app.ui.components.StatusPill
import com.quickpos.app.ui.components.paymentMethodLabel
import com.quickpos.app.util.Fmt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvoiceDetailScreen(invoiceId: Long, onBack: () -> Unit) {
    val app = QuickPosApp.from(LocalContext.current)
    var invoice by remember { mutableStateOf<Invoice?>(null) }
    var items by remember { mutableStateOf<List<InvoiceItem>>(emptyList()) }

    LaunchedEffect(invoiceId) {
        val (inv, its) = app.pos.invoiceWithItems(invoiceId)
        invoice = inv
        items = its
    }

    val inv = invoice
    Scaffold(
        topBar = {
            ScreenBar(
                title = "فاتورة #${inv?.number}",
                onBack = onBack,
                actions = {
                    inv?.let { ShareInvoiceButton(invoice = it) }
                },
            )
        },
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
    ) { padding ->
        if (inv == null) {
            EmptyState("الفاتورة غير موجودة", Modifier.padding(padding))
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                item {
                    AppCard {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                "فاتورة #${inv.number}",
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.primary,
                            )
                            StatusPill(
                                text = when (inv.status) {
                                    "PAID" -> "مدفوعة"
                                    "PARTIAL" -> "دَين"
                                    else -> "ملغاة"
                                },
                                color = when (inv.status) {
                                    "PAID" -> MaterialTheme.colorScheme.primary
                                    "PARTIAL" -> MaterialTheme.colorScheme.tertiary
                                    else -> MaterialTheme.colorScheme.error
                                },
                            )
                        }
                        Spacer(Modifier.height(6.dp))
                        DetailRow("التاريخ", Fmt.dateTimeLong(inv.createdAt))
                        if (inv.customerName.isNotBlank()) DetailRow("العميل", inv.customerName)
                        if (inv.customerPhone.isNotBlank()) DetailRow("الهاتف", inv.customerPhone)
                        DetailRow("طريقة الدفع", paymentMethodLabel(inv.paymentMethod))
                        if (inv.transferRef.isNotBlank()) DetailRow("مرجع التحويل", inv.transferRef)
                        inv.transferReceiptPath?.let { path ->
                            Spacer(Modifier.height(8.dp))
                            Text("إشعار التحويل", style = MaterialTheme.typography.labelLarge)
                            Spacer(Modifier.height(4.dp))
                            ClickablePhoto(
                                path = path,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(220.dp),
                            )
                        }
                        if (inv.kind == "DEBT") DetailRow("النوع", "إيصال تسديد دَين")
                    }
                }
                if (items.isNotEmpty()) {
                    item {
                        Text(
                            "الأصناف",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 4.dp, bottom = 2.dp),
                        )
                    }
                    items(items) { it ->
                        AppCard {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(Modifier.weight(1f)) {
                                    Text(it.productName, style = MaterialTheme.typography.bodyMedium)
                                    if (it.barcode.isNotBlank()) {
                                        Text(
                                            "#${it.barcode}",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                                Text(
                                    "${it.quantity} × ${Fmt.sdg(it.priceLocal)}",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Text(
                                    Fmt.sdg(it.priceLocal * it.quantity),
                                    style = MaterialTheme.typography.titleSmall,
                                    color = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.padding(start = 10.dp),
                                )
                            }
                        }
                    }
                }
                item {
                    AppCard {
                        DetailRow("المجموع الفرعي", Fmt.sdg(inv.subTotalLocal))
                        if (inv.discountLocal > 0) DetailRow("الخصم", "- ${Fmt.sdg(inv.discountLocal)}")
                        DetailRow("الإجمالي", Fmt.sdg(inv.totalLocal), bold = true)
                        DetailRow("المدفوع", Fmt.sdg(inv.paidLocal))
                        if (inv.remainingDebt > 0) DetailRow("دَين", Fmt.sdg(inv.remainingDebt), bold = true)
                        if (inv.changeLocal > 0) DetailRow("الباقي للعميل", Fmt.sdg(inv.changeLocal))
                    }
                }
            }
        }
    }
}

@Composable
private fun ShareInvoiceButton(invoice: Invoice) {
    val context = LocalContext.current
    IconButton(onClick = {
        val text = buildString {
            append("فاتورة #${invoice.number}\n")
            append("التاريخ: ${Fmt.dateTimeLong(invoice.createdAt)}\n")
            append("العميل: ${invoice.customerName}\n")
            append("الإجمالي: ${Fmt.sdg(invoice.totalLocal)}\n")
            append("الحالة: ${invoice.status}\n")
            append("---\nQuickPOS")
        }
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, text)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "مشاركة الفاتورة عبر"))
    }) {
        Icon(Icons.Filled.Share, contentDescription = "مشاركة")
    }
}