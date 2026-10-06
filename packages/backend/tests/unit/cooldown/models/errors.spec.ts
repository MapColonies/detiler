import { describe, expect, it } from 'vitest';
import { RequestValidationError } from '../../../../src/cooldown/models/errors';

describe('RequestValidationError', () => {
  it('should be an instance of Error with the given message', () => {
    const error = new RequestValidationError('minZoom must be less than or equal to maxZoom');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(RequestValidationError);
    expect(error.message).toBe('minZoom must be less than or equal to maxZoom');
  });
});
