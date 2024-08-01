export interface Kit {
  name: string;
}

export interface ExtendedKit extends Kit {
  maxUpdatedAt: number;
  maxState: number;
}
