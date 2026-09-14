package com.quickpos.app.ui.screens.pos

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.quickpos.app.QuickPosApp
import com.quickpos.app.data.local.entities.Product
import com.quickpos.app.data.repository.Cart
import com.quickpos.app.data.repository.CheckoutResult
import com.quickpos.app.data.repository.CouponCheckResult
import com.quickpos.app.data.repository.PosRepository
import com.quickpos.app.ui.components.AppAlertDialog
import com.quickpos.app.ui.components.AppCard
import com.quickpos.app.ui.components.EmptyState
import com.quickpos.app.ui.components.MoneyField
import com.quickpos.app.ui.components.PaymentMethodSelector
import com.quickpos.app.ui.components.ProductThumb
import com.quickpos.app.ui.components.ScreenBar
import com.quickpos.app.ui.components.StatusPill
import com.quickpos.app.ui.components.TransferSection
import com.quickpos.app.ui.components.paymentMethodLabel
import com.quickpos.app.util.Fmt
import com.quickpos.app.util.Notifier
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PosScreen() {
    val context = LocalContext.current
    val app = QuickPosApp.from(context)
    val pos = app.pos
    val scope = rememberCoroutineScope()

    val carts by pos.carts.collectAsState()
    val activeId by pos.activeCartId.collectAsState()
    val rate by pos.currentRate.collectAsState(initial = 0.0)

    var showScanner by remember { mutableStateOf(false) }
    var showSearch by remember { mutableStateOf(false) }
    var showCheckout by remember { mutableStateOf(false) }
    var snackMessage by remember { mutableStateOf<String?>(null) }

    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            showScanner = true
        } else {
            snackMessage = "إذن الكاميرا مرفوض — لا يمكن فتح الماسح الضوئي"
        }
    }

    val openScanner = {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            showScanner = true
        } else {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    val cart = carts.firstOrNull { it.id == activeId }

    Scaffold(
        topBar = {
            ScreenBar(
                title = "نقطة البيع",
                actions = {
                    IconButton(onClick = { showSearch = true }) {
                        Icon(Icons.Filled.Search, contentDescription = "إضافة منتج")
                    }
                    Text(
                        if (rate > 0) Fmt.sdg(rate) else "؟",
                        style = MaterialTheme.typography.labelLarge,
                        color = if (rate > 0) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(end = 16.dp),
                    )
                },
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = openScanner,
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
            ) {
                Icon(Icons.Filled.QrCodeScanner, contentDescription = "مسح باركود")
            }
        },
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            CartTabs(
                carts = carts,
                activeId = activeId,
                onSelect = pos::switchCart,
                onNew = pos::openNewCart,
                onDiscard = pos::discardCart,
            )

            if (cart == null || cart.lines.isEmpty()) {
                EmptyState("افتح فاتورة جديدة وابدأ بإضافة المنتجات،\nأو استخدم زر الكاميرا لمسح الباركود")
            } else {
                CartContent(
                    cart = cart,
                    rate = rate,
                    pos = pos,
                    onShowSearch = { showSearch = true },
                    onCheckout = { showCheckout = true },
                    onMessage = { snackMessage = it },
                )
            }
        }
    }

    if (showScanner) {
        BarcodeScannerOverlay(
            onBarcodeScanned = { code ->
                showScanner = false
                scope.launch {
                    val product = pos.findProductByBarcode(code)
                    if (product != null) {
                        pos.addProductToActiveCart(product)
                    } else {
                        snackMessage = "المنتج بباركود ($code) غير موجود — أضفه من إدارة المنتجات"
                    }
                }
            },
            onDismiss = { showScanner = false },
        )
    }

    if (showSearch) {
        ProductSearchDialog(
            onSelect = { product ->
                pos.addProductToActiveCart(product)
                showSearch = false
            },
            onDismiss = { showSearch = false },
        )
    }

    if (showCheckout && cart != null) {
        CheckoutDialog(
            cart = cart,
            rate = rate,
            onDismiss = { showCheckout = false },
            onDone = {
                showCheckout = false
                snackMessage = "فاتورة #${it.invoiceNumber} — الباقي ${Fmt.sdg(it.changeLocal)}"
                scope.launch {
                    val low = app.catalog.observeLowStock().first()
                    Notifier.showLowStock(context, low)
                }
            },
        )
    }

    snackMessage?.let { msg ->
        AppAlertDialog(
            title = "تنبيه",
            text = msg,
            onDismiss = { snackMessage = null },
        )
    }
}

@Composable
private fun CartTabs(
    carts: List<Cart>,
    activeId: String,
    onSelect: (String) -> Unit,
    onNew: () -> Unit,
    onDiscard: (String) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 12.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        carts.forEachIndexed { index, c ->
            FilterChip(
                selected = c.id == activeId,
                onClick = { onSelect(c.id) },
                label = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("فاتورة ${index + 1}")
                        if (c.lines.isNotEmpty()) {
                            Text(
                                "  (${c.lines.sumOf { it.quantity }})",
                                style = MaterialTheme.typography.labelSmall,
                            )
                        }
                    }
                },
                trailingIcon = if (carts.size > 1) {
                    {
                        IconButton(
                            onClick = { onDiscard(c.id) },
                            modifier = Modifier.size(20.dp),
                        ) {
                            Icon(Icons.Filled.Close, contentDescription = "إغلاق", modifier = Modifier.size(16.dp))
                        }
                    }
                } else null,
            )
        }
        FilterChip(
            selected = false,
            onClick = onNew,
            label = { Text("+") },
        )
    }
}

@Composable
private fun CartContent(
    cart: Cart,
    rate: Double,
    pos: PosRepository,
    onShowSearch: () -> Unit,
    onCheckout: () -> Unit,
    onMessage: (String) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var couponCode by remember { mutableStateOf(cart.couponCode) }
    var discountInput by remember {
        mutableStateOf(cart.manualDiscountLocal.takeIf { it > 0 }?.toString() ?: "")
    }
    var paidText by remember { mutableStateOf("") }

    Column(modifier = Modifier.fillMaxSize()) {
        OutlinedTextField(
            value = cart.customerName,
            onValueChange = pos::setCustomerName,
            label = { Text("اسم العميل (اختياري)") },
            singleLine = true,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 2.dp),
        )
        OutlinedTextField(
            value = cart.customerPhone,
            onValueChange = pos::setCustomerPhone,
            label = { Text("رقم هاتف العميل (اختياري)") },
            singleLine = true,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 2.dp),
        )

        Text(
            "طريقة الدفع",
            style = MaterialTheme.typography.labelLarge,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
        )
        PaymentMethodSelector(
            selected = cart.paymentMethod,
            onSelect = pos::setPaymentMethod,
            modifier = Modifier.padding(horizontal = 16.dp),
        )

        if (cart.paymentMethod == "TRANSFER") {
            TransferSection(pos = pos, cart = cart, onMessage = onMessage)
        }

        if (cart.paymentMethod == "DEBT" || cart.paymentMethod == "TRANSFER") {
            val total = pos.totalLocal(cart, rate)
            val paid = cart.paidAmountLocal
            MoneyField(
                value = paidText,
                onValueChange = {
                    paidText = it
                    pos.setPaidAmountLocal(it.toDoubleOrNull() ?: 0.0)
                },
                label = "المبلغ المدفوع (جنيه)",
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 2.dp),
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(
                    onClick = {
                        paidText = total.toString()
                        pos.setPaidAmountLocal(total)
                    },
                    enabled = total > 0,
                ) { Text("الكل") }
                TextButton(
                    onClick = {
                        paidText = ""
                        pos.setPaidAmountLocal(0.0)
                    },
                    enabled = paid > 0,
                ) { Text("اجعلها دَيناً كاملاً") }
            }
            val remaining = (total - paid).coerceAtLeast(0.0)
            when {
                paid <= 0 -> Text(
                    "دَين كامل — سيُسجَّل على العميل",
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.labelLarge,
                    modifier = Modifier.padding(horizontal = 16.dp),
                )
                remaining > 0 -> Text(
                    "الرصيد المتبقي (دَين): ${Fmt.sdg(remaining)}",
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.labelLarge,
                    modifier = Modifier.padding(horizontal = 16.dp),
                )
                else -> Text(
                    "مسدّد بالكامل",
                    color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.labelLarge,
                    modifier = Modifier.padding(horizontal = 16.dp),
                )
            }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            OutlinedTextField(
                value = couponCode,
                onValueChange = { couponCode = it },
                label = { Text("كود الخصم") },
                singleLine = true,
                modifier = Modifier.weight(1f),
            )
            Button(onClick = {
                scope.launch {
                    when (val r = pos.applyCoupon(couponCode, rate)) {
                        is CouponCheckResult.Success ->
                            onMessage("تم تطبيق الخصم: ${Fmt.sdg(r.discountLocal)}")
                        is CouponCheckResult.Error -> onMessage(r.message)
                    }
                }
            }) { Text("تطبيق") }
        }

        if (cart.coupon != null) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                StatusPill("كوبون: ${Fmt.sdg(pos.couponDiscountLocal(cart, rate))}", MaterialTheme.colorScheme.secondary)
                TextButtonClear(onClick = pos::clearCoupon)
            }
        }

        Spacer(Modifier.height(4.dp))

        MoneyField(
            value = discountInput,
            onValueChange = {
                discountInput = it
                pos.setManualDiscount(it.toDoubleOrNull() ?: 0.0)
            },
            label = "خصم يدوي (بالجنيه)",
            modifier = Modifier.padding(horizontal = 16.dp),
        )

        Spacer(Modifier.height(4.dp))

        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            items(cart.lines) { line ->
                CartLineRow(
                    name = line.product.name,
                    barcode = line.product.barcode,
                    imagePath = line.product.imagePath,
                    priceUsd = line.priceUsd,
                    rate = rate,
                    quantity = line.quantity,
                    discountLocal = line.discountLocal,
                    onDiscountChange = { v -> pos.setLineDiscount(line.product.id, v, rate) },
                    onMinus = { pos.setQuantity(line.product.id, line.quantity - 1) },
                    onPlus = { pos.setQuantity(line.product.id, line.quantity + 1) },
                    onRemove = { pos.removeLine(line.product.id) },
                )
            }
        }

        AppCard(modifier = Modifier.padding(16.dp)) {
            TotalsRow("المجموع الفرعي", Fmt.sdg(pos.subtotalLocal(cart, rate)))
            val disc = pos.totalDiscountLocal(cart, rate)
            if (disc > 0) TotalsRow("الخصم", "- ${Fmt.sdg(disc)}", error = true)
            TotalsRow("الإجمالي", Fmt.sdg(pos.totalLocal(cart, rate)), bold = true)
            Button(
                onClick = onCheckout,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .padding(top = 10.dp),
                enabled = cart.lines.isNotEmpty() && rate > 0,
            ) { Text("إتمام الفاتورة", style = MaterialTheme.typography.titleSmall) }
            if (rate <= 0) {
                Text(
                    "⚠ سعر الدولار غير محدد — اضبطه من الإعدادات أولاً",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(top = 6.dp),
                )
            }
        }
    }
}

@Composable
private fun TextButtonClear(onClick: () -> Unit) {
    TextButton(onClick = onClick) {
        Text(
            "إلغاء الكوبون",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.error,
        )
    }
}

@Composable
private fun CartLineRow(
    name: String,
    barcode: String,
    imagePath: String?,
    priceUsd: Double,
    rate: Double,
    quantity: Int,
    discountLocal: Double,
    onDiscountChange: (Double) -> Unit,
    onMinus: () -> Unit,
    onPlus: () -> Unit,
    onRemove: () -> Unit,
) {
    val lineTotalLocal = priceUsd * rate * quantity
    Surface(
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                ProductThumb(path = imagePath, size = 42, modifier = Modifier.padding(end = 8.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        name,
                        style = MaterialTheme.typography.titleSmall,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        if (barcode.isNotBlank()) "#$barcode • ${Fmt.usd(priceUsd)} • ${Fmt.sdg(priceUsd * rate)}"
                        else "${Fmt.usd(priceUsd)} • ${Fmt.sdg(priceUsd * rate)}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                IconButton(onClick = onMinus, enabled = quantity > 1, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Filled.Remove, contentDescription = "نقص", modifier = Modifier.size(18.dp))
                }
                Text(quantity.toString(), style = MaterialTheme.typography.titleSmall)
                IconButton(onClick = onPlus, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Filled.Add, contentDescription = "زيادة", modifier = Modifier.size(18.dp))
                }
                Text(
                    Fmt.sdg(lineTotalLocal - discountLocal),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(horizontal = 6.dp),
                )
                IconButton(onClick = onRemove) {
                    Icon(Icons.Filled.Delete, contentDescription = "حذف", tint = MaterialTheme.colorScheme.error)
                }
            }
            if (rate > 0) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    var discountText by remember(name, quantity, priceUsd) {
                        mutableStateOf(discountLocal.takeIf { it > 0 }?.toString() ?: "")
                    }
                    Text(
                        "خصم البند (ج.س):",
                        style = MaterialTheme.typography.labelMedium,
                        modifier = Modifier.padding(end = 8.dp),
                    )
                    OutlinedTextField(
                        value = discountText,
                        onValueChange = { raw ->
                            val clean = buildString {
                                var dotSeen = false
                                var intLen = 0
                                for (c in raw) {
                                    when {
                                        c.isDigit() -> { append(c); if (!dotSeen) intLen++ }
                                        c == '.' && !dotSeen && intLen > 0 -> { append(c); dotSeen = true }
                                    }
                                }
                            }
                            discountText = clean
                            onDiscountChange(clean.toDoubleOrNull() ?: 0.0)
                        },
                        label = { Text("الخصم") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.width(110.dp),
                    )
                    Spacer(Modifier.weight(1f))
                    Text(
                        "الإجمالي بعد الخصم: ${Fmt.sdg((lineTotalLocal - discountLocal).coerceAtLeast(0.0))}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
private fun TotalsRow(label: String, value: String, bold: Boolean = false, error: Boolean = false) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
    ) {
        Text(
            label,
            style = if (bold) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(1f),
        )
        Text(
            value,
            style = if (bold) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
            color = when {
                error -> MaterialTheme.colorScheme.error
                bold -> MaterialTheme.colorScheme.primary
                else -> MaterialTheme.colorScheme.onSurface
            },
        )
    }
}

@Composable
private fun ProductSearchDialog(
    onSelect: (Product) -> Unit,
    onDismiss: () -> Unit,
) {
    val app = QuickPosApp.from(LocalContext.current)
    var query by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<Product>>(emptyList()) }

    LaunchedEffect(query) {
        results = if (query.length < 1) emptyList()
        else app.catalog.searchOnce(query).take(20)
    }

    androidx.compose.ui.window.Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = MaterialTheme.shapes.extraLarge,
            color = MaterialTheme.colorScheme.surface,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(16.dp)) {
                Text(
                    "إضافة منتج",
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.padding(bottom = 12.dp),
                )
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    label = { Text("ابحث بالاسم أو الباركود") },
                    leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(8.dp))
                LazyColumn(modifier = Modifier.height(320.dp)) {
                    items(results, key = { it.id }) { product ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            ProductThumb(path = product.imagePath, size = 40)
                            Column(Modifier.weight(1f)) {
                                Text(product.name, style = MaterialTheme.typography.bodyLarge)
                                Text(
                                    "المخزون: ${product.stock} — ${Fmt.usd(product.priceUsd)}",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            IconButton(onClick = { onSelect(product) }) {
                                Icon(
                                    Icons.Filled.Add,
                                    contentDescription = "إضافة",
                                    tint = MaterialTheme.colorScheme.primary,
                                )
                            }
                        }
                    }
                    if (results.isEmpty() && query.length >= 1) {
                        item { EmptyState("لا توجد نتائج") }
                    }
                }
                TextButton(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) {
                    Text("إغلاق")
                }
            }
        }
    }
}

@Composable
private fun CheckoutDialog(
    cart: Cart,
    rate: Double,
    onDismiss: () -> Unit,
    onDone: (CheckoutResult) -> Unit,
) {
    val app = QuickPosApp.from(LocalContext.current)
    val scope = rememberCoroutineScope()
    val total = app.pos.totalLocal(cart, rate)
    val isDebtDefault = cart.paymentMethod == "DEBT"
    var paid by remember {
        mutableStateOf(
            if (isDebtDefault) ""
            else if (cart.paidAmountLocal > 0) cart.paidAmountLocal.toString()
            else total.toString(),
        )
    }
    var busy by remember { mutableStateOf(false) }
    var errorText by remember { mutableStateOf<String?>(null) }
    var result by remember { mutableStateOf<CheckoutResult?>(null) }

    androidx.compose.ui.window.Dialog(onDismissRequest = { if (!busy) onDismiss() }) {
        Surface(
            shape = MaterialTheme.shapes.extraLarge,
            color = MaterialTheme.colorScheme.surface,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    if (result == null) "إتمام الفاتورة" else "تم بنجاح",
                    style = MaterialTheme.typography.titleLarge,
                )
                val r = result
                if (r != null) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        DetailRowCopy("رقم الفاتورة", "${r.invoiceNumber}")
                        DetailRowCopy("طريقة الدفع", paymentMethodLabel(cart.paymentMethod))
                        DetailRowCopy("الإجمالي", Fmt.sdg(r.totalLocal))
                        DetailRowCopy("المدفوع", Fmt.sdg(r.paidLocal))
                        if (r.remainingDebt > 0) {
                            DetailRowCopy("دَين (رصيد متبقٍ)", Fmt.sdg(r.remainingDebt), error = true)
                        } else {
                            DetailRowCopy("الباقي للعميل", Fmt.sdg(r.changeLocal), primary = true)
                        }
                    }
                    Button(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) {
                        Text("إغلاق")
                    }
                } else {
                    TotalsRow("الإجمالي", Fmt.sdg(total), bold = true)
                    TotalsRow("طريقة الدفع", paymentMethodLabel(cart.paymentMethod))

                    MoneyField(
                        value = paid,
                        onValueChange = { paid = it },
                        label = "المبلغ المدفوع (جنيه) — اتركه للحالة الافتراضية",
                        modifier = Modifier.padding(top = 4.dp),
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        TextButton(onClick = { paid = total.toString() }, enabled = !busy) { Text("الكل") }
                        if (!isDebtDefault) {
                            TextButton(onClick = { paid = (total / 2).toString() }, enabled = !busy) { Text("النصف") }
                        }
                        TextButton(onClick = { paid = "0" }, enabled = !busy) { Text("دَين كامل") }
                    }

                    val effectivePaid = if (!isDebtDefault && paid.isBlank()) total else (paid.toDoubleOrNull() ?: 0.0)
                    val effRemaining = (total - effectivePaid).coerceAtLeast(0.0)
                    val effOver = (effectivePaid - total).coerceAtLeast(0.0)
                    when {
                        effRemaining > 0 -> TotalsRow("سيُسجَّل دَين على العميل", Fmt.sdg(effRemaining), error = true)
                        effOver > 0 -> TotalsRow("الباقي للعميل", Fmt.sdg(effOver))
                        else -> TotalsRow("الحالة", "مسدّد بالكامل")
                    }
                    if (effRemaining > 0 && cart.customerName.isBlank() && cart.customerPhone.isBlank()) {
                        Text(
                            "تنبيه: الدَين يتطلّب اسم العميل أو هاتفه ليظهر في قائمة العملاء",
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }

                    errorText?.let {
                        Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                    }

                    Button(
                        enabled = !busy,
                        onClick = {
                            busy = true
                            scope.launch {
                                val paidAmount = if (!isDebtDefault && paid.isBlank()) total else (paid.toDoubleOrNull() ?: 0.0)
                                runCatching {
                                    app.pos.checkout(cart, rate, paidAmount)
                                }.onSuccess {
                                    result = it
                                    onDone(it)
                                }.onFailure {
                                    errorText = it.message ?: "حدث خطأ"
                                }
                                busy = false
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text(if (busy) "جارٍ الحفظ..." else "تأكيد الدفع") }
                    TextButton(
                        onClick = onDismiss,
                        enabled = !busy,
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("إلغاء") }
                }
            }
        }
    }
}

@Composable
private fun DetailRowCopy(label: String, value: String, error: Boolean = false, primary: Boolean = false) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = when {
                error -> MaterialTheme.colorScheme.error
                primary -> MaterialTheme.colorScheme.primary
                else -> MaterialTheme.colorScheme.onSurface
            },
        )
    }
}