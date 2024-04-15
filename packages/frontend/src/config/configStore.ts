import Lodash from 'lodash';
import { NOT_FOUND_INDEX } from '../utils/constants';

export interface IConfig {
  get: <T>(setting: string) => T;
  has: (setting: string) => boolean;
}

export class ConfigStore implements IConfig {
  private readonly store: Record<string, unknown> = {};

  public get<T>(key: string): T {
    return Lodash.get(this.store, key) as T;
  }

  public has(key: string): boolean {
    return Object.keys(this.store).indexOf(key) !== NOT_FOUND_INDEX;
  }

  public set(key: string, value: unknown): void {
    Lodash.set(this.store, key, value);
  }
}
