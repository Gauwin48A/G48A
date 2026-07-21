package com.zaruda.app.core

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

object ContentRefreshBus {
    private val _feedVersion = MutableStateFlow(0L)
    val feedVersion = _feedVersion.asStateFlow()

    fun feedPublished() {
        _feedVersion.value += 1
    }
}
