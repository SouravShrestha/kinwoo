import { router } from "expo-router";

export function goHome() {
  router.dismissTo("/");
}

export function openMarkBought(listId: string, itemId: string) {
  router.push({ pathname: "/item/bought", params: { listId, itemId } });
}

export function openBatchMarkBought(listId: string, itemIds: readonly string[]) {
  router.push({ pathname: "/item/bought-batch", params: { listId, itemIds: itemIds.join(",") } });
}

// A deep link can land on a house screen with nothing underneath it to go back to.
export function goBack() {
  if (router.canGoBack()) router.back();
  else goHome();
}
