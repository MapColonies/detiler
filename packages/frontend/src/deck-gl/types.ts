export type Bounds = [number, number, number, number];

export interface TargetetEvent<T> {
  target: {
    value: T;
  };
}
