package com.quickpos.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp

@Composable
fun PaymentMethodSelector(
    selected: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        PaymentChip(
            value = "CASH",
            label = "كاش",
            icon = Icons.Filled.AccountBalanceWallet,
            selected = selected,
            onSelect = onSelect,
            modifier = Modifier.weight(1f),
        )
        PaymentChip(
            value = "TRANSFER",
            label = "تحويل",
            icon = Icons.Filled.SwapHoriz,
            selected = selected,
            onSelect = onSelect,
            modifier = Modifier.weight(1f),
        )
        PaymentChip(
            value = "DEBT",
            label = "دَين",
            icon = Icons.Filled.WarningAmber,
            selected = selected,
            onSelect = onSelect,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun PaymentChip(
    value: String,
    label: String,
    icon: ImageVector,
    selected: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val isSelected = selected == value
    val danger = value == "DEBT"
    FilterChip(
        selected = isSelected,
        onClick = { onSelect(value) },
        label = { Text(label) },
        leadingIcon = { Icon(icon, contentDescription = null) },
        shape = MaterialTheme.shapes.medium,
        colors = if (danger) {
            FilterChipDefaults.filterChipColors(
                containerColor = if (isSelected) MaterialTheme.colorScheme.error.copy(alpha = 0.2f)
                else MaterialTheme.colorScheme.surfaceVariant,
                labelColor = if (isSelected) MaterialTheme.colorScheme.error
                else MaterialTheme.colorScheme.onSurfaceVariant,
                iconColor = if (isSelected) MaterialTheme.colorScheme.error
                else MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            FilterChipDefaults.filterChipColors(
                containerColor = if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.18f)
                else MaterialTheme.colorScheme.surfaceVariant,
                labelColor = if (isSelected) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.onSurfaceVariant,
                iconColor = if (isSelected) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.onSurfaceVariant,
            )
        },
        modifier = modifier.height(44.dp),
    )
}

fun paymentMethodLabel(method: String?): String = when (method) {
    "TRANSFER" -> "تحويل"
    "DEBT" -> "دَين"
    else -> "كاش"
}