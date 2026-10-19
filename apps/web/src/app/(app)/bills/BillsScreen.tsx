"use client";

import { useBusyWhile } from "@kinwoo/client/activity";
import { useAuth } from "@kinwoo/client/auth";
import { useExpenses, useHouseBalances } from "@kinwoo/client/expenses";
import { useGroceryLists } from "@kinwoo/client/grocery";
import { useActiveHouse } from "@kinwoo/client/houses";
import { groupExpensesByMonth } from "@kinwoo/core/expenses";
import { hasOwnPrivateList } from "@kinwoo/core/grocery";
import { PlusCircleIcon } from "@kinwoo/icons";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { BalanceSummary } from "@/components/expenses/BalanceSummary";
import { BillsTabView, type BillsView } from "@/components/expenses/BillsTabView";
import { ExpenseRow } from "@/components/expenses/ExpenseRow";
import { PrivateSpending } from "@/components/expenses/PrivateSpending";
import { SetupHousePrompt } from "@/components/houses/SetupHousePrompt";
import { expensePath, NEW_EXPENSE_PATH } from "@/lib/house-navigation";

export function BillsScreen() {
  const router = useRouter();
  const { activeHouse, ready } = useActiveHouse();
  const houseId = activeHouse?.house.id ?? null;
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const [selectedView, setSelectedView] = useState<BillsView>("shared");
  const { data: lists } = useGroceryLists(houseId);
  const hasPrivateList = hasOwnPrivateList(lists ?? [], currentUserId);
  const view = hasPrivateList ? selectedView : "shared";

  const {
    data: expenses,
    isLoading,
    hasNextPage,
    isFetchNextPageError,
    isFetchingNextPage,
    fetchNextPage,
  } = useExpenses(houseId);
  const { data: balances } = useHouseBalances(houseId);
  useBusyWhile(isFetchingNextPage);

  const months = useMemo(() => groupExpensesByMonth(expenses ?? []), [expenses]);
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

  const empty = ready && !isLoading && months.length === 0;

  const sharedBills = (
    <>
      {balances ? <BalanceSummary balances={balances} /> : null}

      <div className="mt-6">
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
          <div className="space-y-6">
            {months.map((month) => (
              <section key={month.key} aria-labelledby={`month-${month.key}`}>
                <h2
                  id={`month-${month.key}`}
                  className="mb-3 font-display text-sm font-medium text-muted-foreground"
                >
                  {month.label}
                </h2>
                <ul className="space-y-2.5">
                  {month.expenses.map((expense) => (
                    <li key={expense.id}>
                      <ExpenseRow
                        expense={expense}
                        currentUserId={currentUserId}
                        onOpen={() => router.push(expensePath(expense.id))}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {canLoadMore ? (
              <Button
                label="Show older expenses"
                variant="outline"
                onClick={() => void fetchNextPage()}
              />
            ) : null}
          </div>
        )}
      </div>
    </>
  );

  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col overflow-x-clip px-6 pb-24">
      {hasPrivateList && houseId ? (
        <BillsTabView
          value={view}
          onChange={setSelectedView}
          renderPage={(page) =>
            page === "private" ? <PrivateSpending houseId={houseId} /> : sharedBills
          }
        />
      ) : (
        <div className="pt-6">{sharedBills}</div>
      )}

      {empty || view === "private" ? null : (
        <div className="pointer-events-none fixed bottom-22.5 left-1/2 w-full max-w-md -translate-x-1/2 px-6">
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
    </main>
  );
}
