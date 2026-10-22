import { toast } from "@kinwoo/client/toast";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";

export async function copyText(text: string, copiedMessage: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(copiedMessage);
  } catch {
    toast.error(TOAST_MESSAGES.copyFailed);
  }
}

export async function shareOrCopy(message: string, copiedMessage: string) {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ text: message });
      return;
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
    }
  }
  await copyText(message, copiedMessage);
}
