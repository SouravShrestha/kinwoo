import { describe, expect, it } from "vitest";

import { paymentReminderMessage } from "./reminder";

describe("paymentReminderMessage", () => {
  it("names the debtor, creditor, house and amount", () => {
    const message = paymentReminderMessage({
      debtorName: "Asha Rao",
      creditorName: "Ravi Kumar",
      houseName: "Flat 4",
      amountPaise: 125050,
    });
    expect(message).toContain("Hi Asha Rao");
    expect(message).toContain("Ravi Kumar ₹1,250.50");
    expect(message).toContain("Flat 4");
  });
});
