package com.mhub.app.data.local.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface AddressDao {
    @Query("SELECT * FROM addresses ORDER BY isDefault DESC, createdAt DESC")
    fun observeAll(): Flow<List<AddressEntity>>

    @Query("SELECT * FROM addresses ORDER BY isDefault DESC, createdAt DESC")
    suspend fun getAll(): List<AddressEntity>

    @Query("SELECT * FROM addresses WHERE isDefault = 1 LIMIT 1")
    suspend fun getDefault(): AddressEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(address: AddressEntity)

    @Update
    suspend fun update(address: AddressEntity)

    @Query("UPDATE addresses SET isDefault = 0")
    suspend fun clearDefault()

    @Query("UPDATE addresses SET isDefault = 1 WHERE id = :id")
    suspend fun setDefault(id: String)

    @Query("DELETE FROM addresses WHERE id = :id")
    suspend fun delete(id: String)
}
