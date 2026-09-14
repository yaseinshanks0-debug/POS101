package com.quickpos.app.ui.components

import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Image
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import java.io.File

/**
 * صورة قابلة للنقر: تعرض الصورة من مسار ملف، والضغط عليها يفتحها ملء الشاشة.
 * تستخدم لعرض إشعارات التحويل وصور المنتجات.
 */
@Composable
fun ClickablePhoto(
    path: String?,
    modifier: Modifier = Modifier,
    cornerRadius: Int = 10
) {
    val bitmap by produceState<ImageBitmap?>(initialValue = null, key1 = path) {
        value = runCatching {
            path?.let {
                val f = File(it)
                if (f.exists()) BitmapFactory.decodeFile(it)?.asImageBitmap() else null
            }
        }.getOrNull()
    }
    var showFull by remember { mutableStateOf(false) }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(cornerRadius.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .clickable(enabled = bitmap != null) { showFull = true },
        contentAlignment = Alignment.Center
    ) {
        if (bitmap != null) {
            Image(
                bitmap = bitmap!!,
                contentDescription = "الصورة",
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        } else {
            Icon(
                Icons.Filled.Image,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(32.dp)
            )
        }
    }

    if (showFull && bitmap != null) {
        FullScreenImage(
            bitmap = bitmap!!,
            onDismiss = { showFull = false }
        )
    }
}

@Composable
private fun FullScreenImage(bitmap: ImageBitmap, onDismiss: () -> Unit) {
    Dialog(onDismissRequest = onDismiss) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(androidx.compose.ui.graphics.Color.Black)
                .clickable { onDismiss() },
            contentAlignment = Alignment.Center
        ) {
            Image(
                bitmap = bitmap,
                contentDescription = "عرض الصورة",
                contentScale = ContentScale.Fit,
                modifier = Modifier.fillMaxSize()
            )
            IconButton(
                onClick = onDismiss,
                modifier = Modifier.align(Alignment.TopEnd)
            ) {
                Icon(Icons.Filled.Close, contentDescription = "إغلاق", tint = androidx.compose.ui.graphics.Color.White)
            }
        }
    }
}
