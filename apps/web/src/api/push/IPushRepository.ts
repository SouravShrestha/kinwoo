export interface IPushRepository {
  register(token: string): Promise<void>;
  unregister(token: string): Promise<void>;
}
