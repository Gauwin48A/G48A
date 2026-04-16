pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "MHub"

include(":app")
include(":core:common")
include(":core:ui")
include(":core:network")
include(":core:data")
include(":feature:auth")
include(":feature:home")
include(":feature:listings")
include(":feature:detail")
include(":feature:profile")
include(":feature:notifications")
include(":feature:search")
include(":feature:chat")
include(":feature:settings")
include(":benchmark")
