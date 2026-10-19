"use client";

import { useBusyWhile } from "@kinwoo/client/activity";
import { useAuth } from "@kinwoo/client/auth";
import {
  expenseErrorFromCause,
  useExpenses,
  useHouseBalances,
  useSetSimplifyDebts,
} from "@kinwoo/client/expenses";
import { useActiveHouse } from "@kinwoo/client/houses";
import { toast } from "@kinwoo/client/toast";
import { MoreVerticalIcon, PlusCircleIcon } from "@kinwoo/icons";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/Button";
import { BalanceSummary } from "@/components/expenses/BalanceSummary";
import { ExpenseActions } from "@/components/expenses/ExpenseActions";
import { ExpenseRow } from "@/components/expenses/ExpenseRow";
import { ExpensesMenuSheet } from "@/components/expenses/ExpensesMenuSheet";
import { SetupHousePrompt } from "@/components/houses/SetupHousePrompt";
import { expensePath, NEW_EXPENSE_PATH, PRIVATE_SPENDING_PATH } from "@/lib/house-navigation";

export function BillsScreen() {
  const router = useRouter();
  const { activeHouse, ready } = useActiveHouse();
  const houseId = activeHouse?.house.id ?? null;
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const [menuOpen, setMenuOpen] = useState(false);

  const {
    data: expenses,
    isLoading,
    hasNextPage,
    isFetchNextPageError,
    isFetchingNextPage,
    fetchNextPage,
  } = useExpenses(houseId);
  const simplifyDebts = activeHouse?.house.simplifyDebts ?? false;
  const setSimplifyDebts = useSetSimplifyDebts(houseId ?? "");
  const { data: balances, isPlaceholderData } = useHouseBalances(houseId, simplifyDebts);
  useBusyWhile(isFetchingNextPage || isPlaceholderData);

  const canLoadMore = hasNextPage && !isFetchNextPageError && !isFetchingNextPage;

  if (ready && !activeHouse) {
    return (
      <main className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center p-6 text-center">
        <SetupHousePrompt
          onCreate={() => router.push("/house/create")}
          onJoin={() => router.push("/house/join")}
        />
      </main>
    );
  }

  const empty = ready && !isLoading && (expenses ?? []).length === 0;

  const menuButton = (
    <button
      type="button"
      onClick={() => setMenuOpen(true)}
      aria-label="Expense options"
      className="-mr-2 flex size-10 items-center justify-center text-foreground transition-opacity hover:cursor-pointer hover:opacity-70"
    >
      <MoreVerticalIcon size={3} />
    </button>
  );

  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col overflow-x-clip px-4 pb-24 pt-6">
      <div className="flex justify-end px-2">{menuButton}</div>
      {balances ? (
        <div className="mt-2 px-2">
          <BalanceSummary balances={balances} />
        </div>
      ) : null}
      {balances ? (
        <div className="mt-9">
          <ExpenseActions />
        </div>
      ) : null}

      <div className="mt-4">
        {!ready || isLoading ? null : empty ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
            <p className="font-display font-medium text-foreground">No expenses yet</p>
            <p className="font-display text-sm text-muted-foreground">
              Add rent, bills or anything you share. Split grocery purchases show up here too.
            </p>
            <Button
              label="Add expense"
              className="mt-2 w-auto"
              onClick={() => router.push(NEW_EXPENSE_PATH)}
            />
          </div>
        ) : (
          <div className="-mx-4">
            <div className="mb-2" />
            <ul>
              {(expenses ?? []).map((expense) => (
                <li key={expense.id}>
                  <ExpenseRow
                    expense={expense}
                    currentUserId={currentUserId}
                    onOpen={() => router.push(expensePath(expense.id))}
                  />
                </li>
              ))}
            </ul>
            {canLoadMore ? (
              <div className="mt-6 px-4">
                <Button
                  label="Show older expenses"
                  variant="outline"
                  onClick={() => void fetchNextPage()}
                />
              </div>
            ) : null}
          </div>
        )}
      </div>

      {empty ? null : (
        <div className="pointer-events-none fixed bottom-22.5 left-1/2 w-full max-w-md -translate-x-1/2 px-4">
          <button
            type="button"
            onClick={() => router.push(NEW_EXPENSE_PATH)}
            className="pointer-events-auto relative ml-auto flex size-12 items-center justify-center text-primary transition-opacity hover:cursor-pointer hover:opacity-90"
            aria-label="Add expense"
          >
            <span className="absolute inset-2.5 rounded-full bg-primary-foreground" />
            <PlusCircleIcon size={48} className="relative" />
          </button>
        </div>
      )}

      <ExpensesMenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        simplifyDebts={simplifyDebts}
        onSimplifyDebtsChange={(enabled) =>
          setSimplifyDebts.mutate(enabled, {
            onError: (error) =>
              toast.error(
                expenseErrorFromCause(error, "Couldn't change simplify debts. Try again."),
              ),
          })
        }
        onViewPrivate={() => {
          setMenuOpen(false);
          router.push(PRIVATE_SPENDING_PATH);
        }}
      />
    </main>
  );
}
