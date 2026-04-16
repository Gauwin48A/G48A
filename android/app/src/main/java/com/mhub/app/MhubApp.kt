package com.mhub.app

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.mhub.app.navigation.MhubNavHost
import com.mhub.app.navigation.TopLevelRoute
import com.mhub.core.common.util.ConnectivityObserver
import com.mhub.core.common.util.ConnectivityStatus

@Composable
fun MhubApp(
    viewModel: MainViewModel = hiltViewModel(),
) {
    val isAuthenticated by viewModel.isAuthenticated.collectAsStateWithLifecycle()
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    val topLevelRoutes = remember {
        listOf(
            TopLevelRoute("home", "Home", Icons.Filled.Home, Icons.Outlined.Home),
            TopLevelRoute("listings?category={category}", "Listings", Icons.Filled.GridView, Icons.Outlined.GridView),
            TopLevelRoute("add_post", "Sell", Icons.Filled.AddCircle, Icons.Outlined.AddCircle),
            TopLevelRoute("notifications", "Alerts", Icons.Filled.Notifications, Icons.Outlined.Notifications),
            TopLevelRoute("profile", "Profile", Icons.Filled.Person, Icons.Outlined.Person),
        )
    }

    val showBottomBar = currentDestination?.hierarchy?.any { dest ->
        topLevelRoutes.any { it.route == dest.route }
    } == true

    val connectivityStatus by viewModel.connectivityStatus.collectAsStateWithLifecycle()
    val isOffline = connectivityStatus != ConnectivityStatus.AVAILABLE

    Scaffold(
        topBar = {
            AnimatedVisibility(
                visible = isOffline,
                enter = slideInVertically(),
                exit = slideOutVertically(),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.errorContainer)
                        .padding(8.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        "No internet connection",
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        style = MaterialTheme.typography.labelMedium,
                        textAlign = TextAlign.Center,
                    )
                }
            }
        },
        bottomBar = {
            if (showBottomBar && isAuthenticated) {
                NavigationBar {
                    topLevelRoutes.forEach { route ->
                        val selected = currentDestination?.hierarchy?.any { it.route == route.route } == true
                        NavigationBarItem(
                            icon = {
                                Icon(
                                    imageVector = if (selected) route.selectedIcon else route.unselectedIcon,
                                    contentDescription = route.label,
                                )
                            },
                            label = { Text(route.label) },
                            selected = selected,
                            onClick = {
                                navController.navigate(route.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                        )
                    }
                }
            }
        },
    ) { innerPadding ->
        MhubNavHost(
            navController = navController,
            isAuthenticated = isAuthenticated,
            modifier = Modifier.padding(innerPadding),
        )
    }

    // Bootstrap CSRF on launch
    LaunchedEffect(Unit) {
        viewModel.bootstrap()
    }
}
