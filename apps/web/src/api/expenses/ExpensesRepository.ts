import type { Database } from "@kinwoo/core/db";
import { parseExpenseRpcError, type ExpenseParts } from "@kinwoo/core/expenses";
import type { SupabaseClient } from "@supabase/supabase-js";

import { toPublicAvatarUrl } from "../avatars/avatarUrls";
import {
  ExpensesRepositoryError,
  type Expense,
  type ExpenseCursor,
  type ExpenseInput,
  type HouseBalances,
  type IExpensesRepository,
  type MemberNet,
} from "./IExpensesRepository";

const EXPENSE_COLUMNS =
  "id, house_id, title, amount_paise, category, note, spent_on, split_method, purchase_id, batch_id, created_by, created_at, updated_at, updated_by, creator:profiles!created_by(display_name), editor:profiles!updated_by(display_name), expense_payers(user_id, amount_paise, profiles(display_name)), expense_shares(user_id, share_paise, weight, profiles(display_name))";

function one<T>(value: T | T[] | null | undefined): T | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

function toExpense(row: any): Expense {
  const payers: any[] = Array.isArray(row.expense_payers) ? row.expense_payers : [];
  const shares: any[] = Array.isArray(row.expense_shares) ? row.expense_shares : [];
  return {
    id: row.id,
    houseId: row.house_id,
    title: row.title,
    amountPaise: row.amount_paise,
    category: row.category,
    note: row.note ?? null,
    spentOn: row.spent_on,
    splitMethod: row.split_method,
    createdBy: row.created_by,
    createdByName: one<any>(row.creator)?.display_name ?? null,
    updatedBy: row.updated_by ?? null,
    updatedByName: one<any>(row.editor)?.display_name ?? null,
    source: row.purchase_id
      ? { kind: "purchase", id: row.purchase_id }
      : row.batch_id
        ? { kind: "batch", id: row.batch_id }
        : null,
    payers: payers
      .map((payer) => ({
        userId: payer.user_id,
        name: one<any>(payer.profiles)?.display_name ?? null,
        amountPaise: payer.amount_paise,
      }))
      .sort((a, b) => b.amountPaise - a.amountPaise),
    shares: shares
      .map((share) => ({
        userId: share.user_id,
        name: one<any>(share.profiles)?.display_name ?? null,
        sharePaise: share.share_paise,
        weight: share.weight ?? null,
      }))
      .sort((a, b) => b.sharePaise - a.sharePaise),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toRpcParts(parts: ExpenseParts) {
  return {
    split_method: parts.splitMethod,
    payers: parts.payers.map((payer) => ({
      user_id: payer.userId,
      amount_paise: payer.amountPaise,
    })),
    shares: parts.shares.map((share) => ({
      user_id: share.userId,
      share_paise: share.sharePaise,
      weight: share.weight,
    })),
  };
}

function rpcArgs(input: ExpenseInput) {
  const parts = toRpcParts(input.parts);
  return {
    p_title: input.title,
    p_amount_paise: input.amountPaise,
    p_category: input.category,
    // Generated RPC argument types are never nullable, but the function accepts a null note.
    p_note: input.note as string,
    p_spent_on: input.spentOn,
    p_split_method: parts.split_method,
    p_payers: parts.payers,
    p_shares: parts.shares,
  };
}

function fail(error: { message: string }): never {
  throw new ExpensesRepositoryError(error.message, parseExpenseRpcError(error.message));
}

export class ExpensesRepository implements IExpensesRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listExpenses(
    houseId: string,
    limit: number,
    after: ExpenseCursor | null,
  ): Promise<Expense[]> {
    let query = this.client.from("expenses").select(EXPENSE_COLUMNS).eq("house_id", houseId);

    if (after) {
      const { spentOn, createdAt, id } = after;
      query = query.or(
        `spent_on.lt.${spentOn},and(spent_on.eq.${spentOn},created_at.lt.${createdAt}),and(spent_on.eq.${spentOn},created_at.eq.${createdAt},id.lt.${id})`,
      );
    }

    const { data, error } = await query
      .order("spent_on", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);

    if (error) fail(error);
    return (data ?? []).map(toExpense);
  }

  async findExpense(houseId: string, expenseId: string): Promise<Expense | null> {
    const { data, error } = await this.client
      .from("expenses")
      .select(EXPENSE_COLUMNS)
      .eq("house_id", houseId)
      .eq("id", expenseId)
      .maybeSingle();

    if (error) fail(error);
    return data ? toExpense(data) : null;
  }

  async createExpense(houseId: string, input: ExpenseInput): Promise<string> {
    const { data, error } = await this.client.rpc("create_expense", {
      p_house_id: houseId,
      ...rpcArgs(input),
    });

    if (error) fail(error);
    return data as string;
  }

  async updateExpense(expenseId: string, input: ExpenseInput): Promise<void> {
    const { error } = await this.client.rpc("update_expense", {
      p_expense_id: expenseId,
      ...rpcArgs(input),
    });

    if (error) fail(error);
  }

  async deleteExpense(expenseId: string): Promise<void> {
    const { error } = await this.client.rpc("delete_expense", { p_expense_id: expenseId });
    if (error) fail(error);
  }

  async getBalances(houseId: string): Promise<HouseBalances> {
    const { data, error } = await this.client.rpc("house_balances", { p_house_id: houseId });
    if (error) fail(error);

    const pairs = (data ?? []).map((row) => ({
      userId: row.user_id,
      name: row.display_name ?? null,
      avatarUrl: toPublicAvatarUrl(this.client, row.avatar_url),
      netPaise: Number(row.net_paise),
    }));
    return { netPaise: pairs.reduce((sum, pair) => sum + pair.netPaise, 0), pairs };
  }

  async setSimplifyDebts(houseId: string, enabled: boolean): Promise<void> {
    const { error } = await this.client.rpc("set_simplify_debts", {
      p_house_id: houseId,
      p_enabled: enabled,
    });
    if (error) fail(error);
  }

  async getMemberNets(houseId: string): Promise<MemberNet[]> {
    const { data, error } = await this.client.rpc("house_member_nets", { p_house_id: houseId });
    if (error) fail(error);
    return (data ?? []).map((row) => ({
      userId: row.user_id,
      name: row.display_name ?? null,
      avatarUrl: toPublicAvatarUrl(this.client, row.avatar_url),
      netPaise: Number(row.net_paise),
      isSelf: row.is_self,
    }));
  }
}
