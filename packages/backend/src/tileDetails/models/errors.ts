export class TileDetailsNotFoundError extends Error {
  public constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, TileDetailsNotFoundError.prototype);
  }
}

export class KitNotFoundError extends Error {
  public constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, KitNotFoundError.prototype);
  }
}
