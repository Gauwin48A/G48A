package com.mhub.app.ui.parity

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Test

class WebParityCatalogTest {

    @Test
    fun keys_are_unique() {
        val keys = WebRouteCatalog.all.map { it.key }
        assertEquals(keys.size, keys.toSet().size)
    }

    @Test
    fun required_alias_mappings_exist() {
        val allPosts = WebRouteCatalog.byKey("all_posts")
        val myHome = WebRouteCatalog.byKey("my_home")
        assertNotNull(allPosts)
        assertNotNull(myHome)
        assertTrueAlias(allPosts!!.aliases.contains("/categories/:slug"))
        assertTrueAlias(myHome!!.aliases.contains("/my-posts"))
    }

    @Test
    fun every_route_has_ux_spec() {
        WebRouteCatalog.all.forEach { route ->
            val spec = WebParitySpecs.spec(route)
            assertFalse("Missing headline for ${route.key}", spec.headline.isBlank())
            assertFalse("Missing primary action for ${route.key}", spec.primaryAction.isBlank())
            assertFalse("Missing sections for ${route.key}", spec.sections.isEmpty())
        }
    }

    private fun assertTrueAlias(condition: Boolean) {
        if (!condition) {
            throw AssertionError("Expected alias mapping not found.")
        }
    }
}
