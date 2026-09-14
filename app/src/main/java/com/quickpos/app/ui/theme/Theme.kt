package com.quickpos.app.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/* ── colour tokens ────────────────────────────────────────────── */

private val Background      = Color(0xFF0D1117)
private val Surface         = Color(0xFF161B22)
private val SurfaceVariant  = Color(0xFF21262D)
private val OnSurface       = Color(0xFFE6EDF3)
private val OnSurfaceVar    = Color(0xFF8B949E)
private val Outline         = Color(0xFF30363D)

private val Primary         = Color(0xFF2DD4BF)
private val OnPrimary       = Color(0xFF0D1117)
private val PrimaryCont     = Color(0xFF134E4A)
private val OnPrimaryCont   = Color(0xFF5EEAD4)

private val Secondary       = Color(0xFF818CF8)
private val OnSecondary     = Color(0xFF1E1B4B)
private val SecondaryCont   = Color(0xFF312E81)
private val OnSecondaryCont = Color(0xFFC7D2FE)

private val Tertiary        = Color(0xFFF59E0B)
private val OnTertiary      = Color(0xFF451A03)
private val TertiaryCont    = Color(0xFF78350F)
private val OnTertiaryCont  = Color(0xFFFDE68A)

private val Error           = Color(0xFFF87171)
private val OnError         = Color(0xFF1C1917)
private val ErrorContainer  = Color(0xFF7F1D1D)
private val OnErrorCont     = Color(0xFFFCA5A5)

/* ── scheme ───────────────────────────────────────────────────── */

private val DarkScheme = darkColorScheme(
    primary               = Primary,
    onPrimary             = OnPrimary,
    primaryContainer      = PrimaryCont,
    onPrimaryContainer    = OnPrimaryCont,
    secondary             = Secondary,
    onSecondary           = OnSecondary,
    secondaryContainer    = SecondaryCont,
    onSecondaryContainer  = OnSecondaryCont,
    tertiary              = Tertiary,
    onTertiary            = OnTertiary,
    tertiaryContainer     = TertiaryCont,
    onTertiaryContainer   = OnTertiaryCont,
    background            = Background,
    onBackground          = OnSurface,
    surface               = Surface,
    onSurface             = OnSurface,
    surfaceVariant        = SurfaceVariant,
    onSurfaceVariant      = OnSurfaceVar,
    surfaceTint           = Primary,
    outline               = Outline,
    error                 = Error,
    onError               = OnError,
    errorContainer        = ErrorContainer,
    onErrorContainer      = OnErrorCont,
    inverseSurface        = OnSurface,
    inverseOnSurface      = Background,
    inversePrimary        = Color(0xFF0D9488),
)

/* ── shapes ───────────────────────────────────────────────────── */

private val AppShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small      = RoundedCornerShape(12.dp),
    medium     = RoundedCornerShape(16.dp),
    large      = RoundedCornerShape(20.dp),
    extraLarge = RoundedCornerShape(28.dp),
)

/* ── typography ───────────────────────────────────────────────── */

private val AppTypography = Typography()

/* ── theme entry point ────────────────────────────────────────── */

@Composable
fun QuickPosTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkScheme,
        shapes      = AppShapes,
        typography  = AppTypography,
        content     = content,
    )
}
