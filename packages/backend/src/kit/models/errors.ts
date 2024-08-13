export class KitAlreadyExistsError extends Error {
  public constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, KitAlreadyExistsError.prototype);
  }
}
