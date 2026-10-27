import { FEEDBACK_TYPES } from "@kinwoo/core/app";

import type { IFeedbackRepository } from "./IFeedbackRepository";
import type { Feedback } from "./IFeedbackService";

// Read per call, not at import: runtime secrets are absent while the app builds.
function readTelegramEnv() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variables");
  }
  return {
    token,
    chatIds: chatId
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatFeedbackMessage({ email, subject, description, type }: Feedback): string {
  const typeLabel = FEEDBACK_TYPES.find((option) => option.id === type)?.label ?? type;
  return [
    "💬 <b>New Feedback - Kinwoo</b>",
    "",
    `🏷 <b>Type:</b> ${escapeHtml(typeLabel)}`,
    `📧 <b>Email:</b> ${escapeHtml(email)}`,
    `📌 <b>Subject:</b> ${escapeHtml(subject)}`,
    "",
    "📝 <b>Description:</b>",
    escapeHtml(description),
  ].join("\n");
}

export class FeedbackRepository implements IFeedbackRepository {
  async send(feedback: Feedback): Promise<void> {
    const { token, chatIds } = readTelegramEnv();
    const text = formatFeedbackMessage(feedback);

    await Promise.all(
      chatIds.map(async (chatId) => {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) {
          throw new Error(`Telegram API error for chat ${chatId}: ${await response.text()}`);
        }
      }),
    );
  }
}
