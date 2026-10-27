import type { Database } from "@kinwoo/core/db";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { IPushRepository } from "./IPushRepository";

// Takes the session-scoped client: the RPCs read the caller from the JWT, so a user can only
// ever touch their own tokens.
export class PushRepository implements IPushRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async register(token: string): Promise<void> {
    const { error } = await this.client.rpc("register_push_token", { p_token: token });
    if (error) throw new Error(error.message);
  }

  async unregister(token: string): Promise<void> {
    const { error } = await this.client.rpc("unregister_push_token", { p_token: token });
    if (error) throw new Error(error.message);
  }
}
