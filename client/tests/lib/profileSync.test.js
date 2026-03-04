import { describe, expect, it } from 'vitest';
import { hasUserSnapshotChanged, mergeProfileIntoAuthUser } from './profileSync';

const resolveUserId = (userData) => {
  const candidate = userData?.id ?? userData?.user_id ?? null;
  return candidate === null || candidate === undefined || candidate === '' ? null : String(candidate);
};

describe('profileSync', () => {
  it('merges profile payload into auth user while preserving stable ids', () => {
    const previousUser = {
      id: '123',
      user_id: '123',
      role: 'user',
      name: 'Old Name'
    };
    const profilePayload = {
      full_name: 'New Name',
      name: 'New Name',
      email: 'new@example.com'
    };

    const merged = mergeProfileIntoAuthUser(previousUser, profilePayload, resolveUserId);

    expect(merged.id).toBe('123');
    expect(merged.user_id).toBe('123');
    expect(merged.name).toBe('New Name');
    expect(merged.email).toBe('new@example.com');
  });

  it('produces identical snapshot for equivalent profile data', () => {
    const previousUser = {
      id: 'u-1',
      user_id: 'u-1',
      name: 'User One',
      email: 'user1@example.com'
    };
    const profilePayload = {
      id: 'u-1',
      user_id: 'u-1',
      name: 'User One',
      email: 'user1@example.com'
    };

    const merged = mergeProfileIntoAuthUser(previousUser, profilePayload, resolveUserId);
    expect(hasUserSnapshotChanged(previousUser, merged)).toBe(false);
  });
});

