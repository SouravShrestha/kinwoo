---
inclusion: auto
name: Product rules and decisions
description: Who can do what in Kinwoo (houses, members, invites, grocery lists and items, expenses, balances). Read before changing permissions, RPCs, RLS, or any rule-driven UI.
---

# Product rules and decisions

Source of truth is the SQL in `supabase/migrations` (the baseline plus later migrations), then
`.plans/houses_plan.md`. Rules are enforced in the database; the UI only hides what the
database would refuse. When a rule changes, add a new migration (never edit an applied one), update the pgTAP test and the
mirrored client helper in `packages/core` together, on both apps.

Roles: `admin` and `member`. Joiners are always plain members. Money is integer paise (INR).

## Houses and members

- A user belongs to one house for now (`max_houses_per_user()` = 1, `MAX_HOUSES_PER_USER` in core). Raise both to allow more.
- `member_limit` is 15 per house. Joining a full house returns `full`.
- Memberships are never hard-deleted. Former members render as "Former member".
- Only admins change roles, remove members and edit house settings. The last admin cannot leave or be demoted (`LAST_ADMIN`). A sole member leaving soft-deletes the house.
- Admins cannot remove themselves; they use `leave_house` (`USE_LEAVE_HOUSE`).
- Leaving or being removed is blocked while the person has an open balance (`OUTSTANDING_BALANCE`). The `keep_debt` and `acknowledge` flags no longer bypass it.
- Every member can read the name, avatar and email of every active housemate. Non-members read nothing.
- Every non-read write goes through a SECURITY DEFINER RPC. Bad invite codes return a status instead of raising, so the rate-limit row commits. Do not change that to raise.

## Invites

- One fixed code per house. Admins can rotate it (`rotate_invite_code`); there is no expiry or use limit.
- `join_mode` decides who may redeem: anyone, or only confirmed emails on the admin's allowlist. It is read at redemption time.
- Only admins see invites and the allowlist.
- A member who left on their own rejoins directly. A member an admin removed always waits for admin approval.
- 30 invite attempts per 10 minutes per user (`RATE_LIMITED`).

## Grocery lists

- Shared lists are visible to the whole house. A private list is visible to its creator only, admins included. Private lists never produce expenses.
- Creator or admin renames a list and changes its icon. Only the creator changes visibility. Only an admin sets the default list. The default list must stay shared.
- A list cannot become private while items on it are assigned to someone other than its creator.
- Delete and archive of a list: admin or creator. Lists are active or soft-deleted; archiving was removed.

## Grocery items

- Admin or the item's creator edits and deletes a pending item. The claimer can also edit a claimed item.
- Any member who can see a list may add items, claim ("I'll buy"), and assign pending items to a housemate, one or many. Reassigning claimed or assigned items stays with admins and the creator.
- Mark bought: any member who can see the list, whoever claimed or was assigned the item (`20261216000000`).
- Bought items are financial records. "Deleting" one archives it (leaves the Bought tab); its purchase, batch and expense stay. A batch is archived whole.
- Purchases and batches outlive their items.

## Expenses

- Any house member creates expenses. Payers and sharers must be active members (people already on an expense are allowed when editing it).
- Any house member edits or deletes any expense in their house, involved or not (`can_manage_expense`, `20261201000000`). Every edit and delete is logged with its actor, and `updated_by` is recorded. Deleted expenses are soft-deleted; there is no restore.
- Fields: title up to 80 chars, amount 1 to 1,000,000,000 paise, note up to 500, category one of rent, utilities, groceries, internet, household, food_dining, transport, other. Split method is equal, exact, percent or shares. Date may be at most one day ahead of the server date.
- Balance maths: within an expense each sharer owes each payer `share * paid / amount`; pairs are summed exactly and rounded once so both sides mirror to the paisa. A member's net is the sum of their rounded pairs and house nets add to zero.
- Linked purchase or batch: editing the expense updates the purchase price or batch total (per-item prices stay). Deleting the expense soft-deletes the linked bought items too.
- Simplify debts is a house setting any member can change, at most 2 changes per person per 30 minutes (`RATE_LIMITED`). Each change is logged.
- Record payment (`record_settlement`, `20261215000001`): any house member records a payment between any two people, involved or not. Both sides only have to have belonged to the house, so a balance with a former member can be cleared. The Balance Summary offers "Settle up" on every transfer. Amount 1 to 1,000,000,000 paise, not capped at the balance (an overpayment flips the balance). It is logged as `settlement.recorded`.
- A settlement counts like the payee owing the payer, inside the same exact sum as expenses, so pair mirroring and zero-sum house nets still hold. Settlements are never hard-deleted; a reversed one (`reversed_at`) stops counting. Any house member edits (`update_settlement`) or deletes (`reverse_settlement`) any payment in their house, involved or not (`20261206000000`). Both are logged with the actor.

## Activity log

- Append-only, read-only for clients. Entries that reference someone else's private list are hidden.
- Expense and member events write entries with actor and payload; House setting edits are not logged yet.

## Push notifications (Android and web)

- A trigger on `activity_log` queues a call to the `send-push` Edge Function for five types only. It never fails the write that caused it. The function decides who is told:
  - `expense.created` and `expense.updated`: the people who share it (for an edit, those on it after the edit).
  - `settlement.recorded`: the other party.
  - `grocery_item.assigned`: the assignee.
  - `join_requested`: active admins.
- The person who acted is never notified. Recipients must still be active members of the house and have `profiles.notifications_enabled`. Entries about a non-shared list are never sent.
- Text includes names, titles and amounts, and passes through Expo and Google (Android) or the browser's push service (web). A tap opens `data.url`, and the app follows only in-app paths (`notificationTarget` in core).
- Tokens live in `push_tokens`, written only by `register_push_token` and `unregister_push_token`. A token moves to whoever registers it next on that phone. Each user keeps their 10 newest. Expo's `DeviceNotRegistered` ticket error, or a 404/410 from a browser push service, deletes a token.
- A browser subscription is stored in `push_tokens` as JSON (`platform = 'web'`) and is accepted only for the browser push services' hosts (`push_token_platform`, mirrored by `isWebPushToken` in core), so `send-push` can never be pointed at another URL. `send-push` encrypts and signs (VAPID) itself in `webpush.ts`; without `VAPID_*` secrets it skips browsers.
- On web the browser permission prompt appears only after a tap: the switch, or "Turn on" in a bottom sheet shown once per login in the installed app (not in a browser tab) while permission is undetermined and `notifications_enabled` is true. The app never asks on page load. The switch shows on only while the browser permission is granted and `notifications_enabled` is true. iPhone and iPad need the app on the Home Screen. A tap on a web push focuses the open app (which marks the row read and navigates) or opens the target and marks the row read from the service worker.
- The switch on the Notifications screen sets `notifications_enabled`. It stops sending but keeps the token. Logging out unregisters the phone's token.
- `notifications_enabled` and `muted_push_types` belong to the account, not a device: turning push off on web also stops it on the phone.
- Not done: push receipts are not polled, and iOS (native) does not receive push.

## Notifications inbox

- The bell on Home opens the Notifications page on web and mobile. It lists what `send-push` told the person about, using the Activity row design grouped by day, newest first, 100 at most.
- `send-push` writes a `notifications` row for every recipient it picks, whether or not they have push on or a registered phone. Clients only read their own rows (RLS) and mark them read through `mark_notification_read` and `mark_notifications_read`. Rows are never deleted by clients.
- A notification is marked read (`read_at`) once opened: tapping a row marks it read, then goes to the expense, payment, tasks or home. "Mark all as read" marks every one of the caller's. Read rows stay in the list with muted text. Tapping a push on Android or web also marks its inbox row read (the push carries `notificationId`). The bell shows the count of unread rows. New rows arrive live over Realtime (inserts only; a read mark on another device shows on the next visit).

## Open items

- Product name is Kinwoo in code and Jhola in some footers.
- Two people can record the same payment.
- No `delete_house` RPC or UI.
