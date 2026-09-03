package com.zaruda.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.TrendingDown
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Gradient badge: Escrow Protection — emerald gradient with lock icon */
@Composable
fun EscrowBadge(modifier: Modifier = Modifier) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        modifier = modifier,
    ) {
        Box(
            modifier = Modifier
                .background(Brush.horizontalGradient(listOf(Color(0xFF059669), Color(0xFF10B981))))
                .padding(horizontal = 8.dp, vertical = 4.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Icon(Icons.Default.Lock, null, tint = Color.White, modifier = Modifier.size(12.dp))
                Text("Escrow", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

/** Gradient badge: Verified Seller — blue shield */
@Composable
fun VerifiedSellerBadge(
    modifier: Modifier = Modifier,
    trustLevel: String = "KYC Verified",
) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        modifier = modifier,
    ) {
        Box(
            modifier = Modifier
                .background(Brush.horizontalGradient(listOf(Color(0xFF2563EB), Color(0xFF3B82F6))))
                .padding(horizontal = 8.dp, vertical = 4.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Icon(Icons.Default.Shield, null, tint = Color.White, modifier = Modifier.size(12.dp))
                Text(trustLevel, color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

/** Price drop trend tag — "Was ₹12,000 → Now ₹9,500" */
@Composable
fun PriceDropTag(
    originalPrice: Double,
    currentPrice: Double,
    modifier: Modifier = Modifier,
) {
    val discount = ((originalPrice - currentPrice) / originalPrice * 100).toInt()
    if (discount <= 0) return

    Surface(
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFFFEF2F2),
        modifier = modifier,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Icon(Icons.Default.TrendingDown, null, tint = Color(0xFFDC2626), modifier = Modifier.size(12.dp))
            Text(
                "\u20B9${"%,.0f".format(originalPrice)} \u2192 \u20B9${"%,.0f".format(currentPrice)}",
                fontSize = 10.sp,
                color = Color(0xFF991B1B),
                fontWeight = FontWeight.SemiBold,
            )
            Surface(
                shape = RoundedCornerShape(4.dp),
                color = Color(0xFFDC2626),
            ) {
                Text(
                    "-${discount}%",
                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp),
                    fontSize = 9.sp,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
    }
}

/** Rounded product card shape — 20dp corners as per blueprint §6 */
object ProductCardShapes {
    val card = RoundedCornerShape(20.dp)
    val badge = RoundedCornerShape(8.dp)
    val image = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)
}
