export class RequestValidationError extends Error {
  public constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, RequestValidationError.prototype);
  }
}
