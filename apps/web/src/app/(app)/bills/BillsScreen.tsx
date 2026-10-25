"use client";

import { useBusyWhile } from "@kinwoo/client/activity";
import { useAuth } from "@kinwoo/client/auth";
import {
  expenseErrorFromCause,
  useExpenses,
  useHouseBalances,
  useSetSimplifyDebts,
  useSettlements,
} from "@kinwoo/client/expenses";
import { useActiveHouse } from "@kinwoo/client/houses";
import { toast } from "@kinwoo/client/toast";
import { expenseFeed } from "@kinwoo/core/expenses";
import { MoreVerticalIcon, PlusCircleIcon } from "@kinwoo/icons";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { LoadMoreSentinel } from "@/components/LoadMoreSentinel";
import { BalanceSummary } from "@/components/expenses/BalanceSummary";
import { ExpenseActions } from "@/components/expenses/ExpenseActions";
import { ExpenseRow } from "@/components/expenses/ExpenseRow";
import { ExpensesMenuSheet } from "@/components/expenses/ExpensesMenuSheet";
import { PaymentRow } from "@/components/expenses/PaymentRow";
import { EmptyItems } from "@/components/grocery/EmptyItems";
import { SetupHousePrompt } from "@/components/houses/SetupHousePrompt";
import {
  BalanceSummarySkeleton,
  ExpenseActionsSkeleton,
  ExpenseRowsSkeleton,
} from "@/components/skeleton/skeletons";
import {
  expensePath,
  NEW_EXPENSE_PATH,
  paymentPath,
  PRIVATE_SPENDING_PATH,
} from "@/lib/house-navigation";

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
  const { data: settlements } = useSettlements(houseId);
  const feed = useMemo(
    () => expenseFeed(expenses ?? [], settlements ?? [], !!hasNextPage),
    [expenses, settlements, hasNextPage],
  );
  const simplifyDebts = activeHouse?.house.simplifyDebts ?? false;
  const setSimplifyDebts = useSetSimplifyDebts(houseId ?? "");
  const {
    data: balances,
    isPending: balancesPending,
    isPlaceholderData,
  } = useHouseBalances(houseId, simplifyDebts);
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

  const empty = ready && !isLoading && feed.length === 0;

  const menuButton = (
    <button
      type="button"
      onClick={() => setMenuOpen(true)}
      aria-label="Expense options"
      className="-mr-3 flex size-10 items-center justify-center text-foreground transition-opacity hover:cursor-pointer hover:opacity-70"
    >
      <MoreVerticalIcon size={3.5} />
    </button>
  );

  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col overflow-x-clip px-4 pb-24 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <div className="flex justify-end px-2">{menuButton}</div>
      {balances ? (
        <div className="mt-2 px-2">
          <BalanceSummary balances={balances} />
        </div>
      ) : balancesPending ? (
        <div className="mt-2 px-2">
          <BalanceSummarySkeleton />
        </div>
      ) : null}
      {balances ? (
        <div className="mb-1 mt-8">
          <ExpenseActions />
        </div>
      ) : balancesPending ? (
        <div className="mb-1 mt-8">
          <ExpenseActionsSkeleton />
        </div>
      ) : null}

      <div className="mt-4">
        {!ready || isLoading ? (
          <ExpenseRowsSkeleton />
        ) : empty ? (
          <div className="py-12">
            <EmptyItems
              image="expense"
              title="Nothing to see here"
              hint="Add rent, bills or anything you share. Split grocery purchases show up here too."
            >
              <Button
                label="Add expense"
                className="w-auto"
                onClick={() => router.push(NEW_EXPENSE_PATH)}
              />
            </EmptyItems>
          </div>
        ) : (
          <div className="-mx-4">
            <ul>
              {feed.map((item) => (
                <li key={item.id}>
                  {item.kind === "expense" ? (
                    <ExpenseRow
                      expense={item.expense}
                      currentUserId={currentUserId}
                      onOpen={() => router.push(expensePath(item.id))}
                    />
                  ) : (
                    <PaymentRow
                      settlement={item.settlement}
                      currentUserId={currentUserId}
                      onOpen={() => router.push(paymentPath(item.id))}
                    />
                  )}
                </li>
              ))}
            </ul>
            {isFetchingNextPage ? <ExpenseRowsSkeleton count={2} /> : null}
            <LoadMoreSentinel active={canLoadMore} onLoadMore={() => void fetchNextPage()} />
          </div>
        )}
      </div>

      {empty ? null : (
        <div className="pointer-events-none fixed bottom-[calc(5.625rem+env(safe-area-inset-bottom))] left-1/2 w-full max-w-md -translate-x-1/2 px-4">
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
