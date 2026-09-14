package com.quickpos.app.ui.navigation

import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.PointOfSale
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.ui.Alignment
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.quickpos.app.QuickPosApp
import com.quickpos.app.ui.screens.coupons.CouponsScreen
import com.quickpos.app.ui.screens.customers.CustomerDetailScreen
import com.quickpos.app.ui.screens.customers.CustomersScreen
import com.quickpos.app.ui.screens.expenses.ExpensesScreen
import com.quickpos.app.ui.screens.home.HomeScreen
import com.quickpos.app.ui.screens.invoices.InvoiceDetailScreen
import com.quickpos.app.ui.screens.invoices.InvoicesScreen
import com.quickpos.app.ui.screens.login.LoginScreen
import com.quickpos.app.ui.screens.pos.PosScreen
import com.quickpos.app.ui.screens.products.ProductsScreen
import com.quickpos.app.ui.screens.reports.DayCloseScreen
import com.quickpos.app.ui.screens.reports.ReportsScreen
import com.quickpos.app.ui.screens.settings.SettingsScreen
import com.quickpos.app.ui.screens.suppliers.ReceiveGoodsScreen
import com.quickpos.app.ui.screens.suppliers.SuppliersScreen
import com.quickpos.app.ui.screens.users.UsersScreen
import com.quickpos.app.util.AuthState
import kotlinx.coroutines.launch

object Routes {
    const val HOME = "home"
    const val POS = "pos"
    const val PRODUCTS = "products"
    const val INVOICES = "invoices"
    const val INVOICE_DETAIL = "invoice/{id}"
    const val REPORTS = "reports"
    const val EXPENSES = "expenses"
    const val COUPONS = "coupons"
    const val SETTINGS = "settings"
    const val USERS = "users"
    const val CUSTOMERS = "customers"
    const val CUSTOMER_DETAIL = "customer/{id}"
    const val SUPPLIERS = "suppliers"
    const val RECEIVE_GOODS = "receive_goods"
    const val DAY_CLOSE = "day_close"

    fun invoiceDetail(id: Long) = "invoice/$id"
    fun customerDetail(id: Long) = "customer/$id"
}

private data class Tab(val route: String, val label: String, val icon: ImageVector)

private val tabs = listOf(
    Tab(Routes.HOME, "الرئيسية", Icons.Filled.Home),
    Tab(Routes.POS, "البيع", Icons.Filled.PointOfSale),
    Tab(Routes.INVOICES, "الفواتير", Icons.AutoMirrored.Filled.ReceiptLong),
    Tab(Routes.REPORTS, "التقارير", Icons.Filled.BarChart),
    Tab(Routes.SETTINGS, "الإعدادات", Icons.Filled.Settings),
)

@Composable
fun AppRoot() {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val context = LocalContext.current
    val app = QuickPosApp.from(context)
    val scope = rememberCoroutineScope()
    var sessionChecked by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        app.restoreSession()
        sessionChecked = true
    }

    CompositionLocalProvider(
        LocalLayoutDirection provides LayoutDirection.Rtl,
    ) {
        if (!sessionChecked) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return@CompositionLocalProvider
        }

        val currentUser by AuthState.currentUser.collectAsState()

        if (currentUser == null) {
            LoginScreen(
                onLoggedIn = { user ->
                    AuthState.login(user)
                    scope.launch { app.rememberSession(user.id) }
                },
            )
            return@CompositionLocalProvider
        }

        val showBottomBar = tabs.any { it.route == currentRoute }
        Scaffold(
            contentWindowInsets = WindowInsets(0, 0, 0, 0),
            bottomBar = {
                if (showBottomBar) {
                    ModernBottomBar(
                        currentRoute = currentRoute,
                        onNavigate = { route ->
                            navController.navigate(route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                    )
                }
            },
        ) { padding ->
            NavHost(
                navController = navController,
                startDestination = Routes.HOME,
                modifier = Modifier
                    .padding(padding)
                    .fillMaxSize(),
            ) {
                composable(Routes.HOME) { HomeScreen(navController) }
                composable(Routes.POS) { PosScreen() }
                composable(Routes.PRODUCTS) { ProductsScreen(navController) }
                composable(Routes.INVOICES) { InvoicesScreen(navController) }
                composable(
                    Routes.INVOICE_DETAIL,
                    arguments = listOf(androidx.navigation.navArgument("id") { type = androidx.navigation.NavType.LongType }),
                ) { entry ->
                    InvoiceDetailScreen(
                        invoiceId = entry.arguments?.getLong("id") ?: 0L,
                        onBack = { navController.popBackStack() },
                    )
                }
                composable(Routes.REPORTS) { ReportsScreen(navController) }
                composable(Routes.EXPENSES) { ExpensesScreen(navController) }
                composable(Routes.COUPONS) { CouponsScreen(navController) }
                composable(Routes.SETTINGS) { SettingsScreen(navController) }
                composable(Routes.USERS) { UsersScreen(navController) }
                composable(Routes.CUSTOMERS) { CustomersScreen(navController) }
                composable(
                    Routes.CUSTOMER_DETAIL,
                    arguments = listOf(androidx.navigation.navArgument("id") { type = androidx.navigation.NavType.LongType }),
                ) { entry ->
                    CustomerDetailScreen(
                        nav = navController,
                        customerId = entry.arguments?.getLong("id") ?: 0L,
                    )
                }
                composable(Routes.SUPPLIERS) { SuppliersScreen(navController) }
                composable(Routes.RECEIVE_GOODS) { ReceiveGoodsScreen(navController) }
                composable(Routes.DAY_CLOSE) { DayCloseScreen(navController) }
            }
        }
    }
}

@Composable
private fun ModernBottomBar(
    currentRoute: String?,
    onNavigate: (String) -> Unit,
) {
    NavigationBar(
        windowInsets = WindowInsets(0, 0, 0, 0),
    ) {
        tabs.forEach { tab ->
            NavigationBarItem(
                selected = currentRoute == tab.route,
                onClick = { onNavigate(tab.route) },
                icon = { Icon(tab.icon, contentDescription = tab.label) },
                label = { Text(tab.label) },
                colors = NavigationBarItemDefaults.colors(
                    indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.18f),
                    selectedIconColor = androidx.compose.material3.MaterialTheme.colorScheme.primary,
                    selectedTextColor = androidx.compose.material3.MaterialTheme.colorScheme.primary,
                    unselectedIconColor = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant,
                    unselectedTextColor = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant,
                ),
            )
        }
    }
}