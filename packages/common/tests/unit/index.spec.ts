import { describe, expect, it } from 'vitest';
import { API_STATE, UNSPECIFIED_STATE } from '../../src';

describe('constants', () => {
  it('should expose the expected state constants', () => {
    expect(UNSPECIFIED_STATE).toBe(-1);
    expect(API_STATE).toBe(0);
  });

  it('should keep UNSPECIFIED_STATE and API_STATE distinct', () => {
    expect(UNSPECIFIED_STATE).not.toBe(API_STATE);
  });
});
