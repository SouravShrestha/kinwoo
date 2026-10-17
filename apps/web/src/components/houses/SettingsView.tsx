"use client";

import { useAuth } from "@kinwoo/client/auth";
import { useHouseMembers, useHouseSettingsForm, type MemberConfirm } from "@kinwoo/client/houses";
import {
  DANGER_ZONE_TITLE,
  HOUSE_ADDRESS_MAX_LENGTH,
  HOUSE_NAME_MAX_LENGTH,
  leaveState,
  type HouseMembership,
} from "@kinwoo/core/houses";

import { Button } from "../Button";
import { Field } from "./Field";
import { LeaveAction } from "./LeaveAction";
import { SheetHeader } from "./SheetHeader";

export function SettingsView({
  membership,
  confirm,
  onBack,
  onSaved,
}: {
  membership: HouseMembership;
  confirm: MemberConfirm;
  onBack?: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const members = useHouseMembers(membership.house.id);
  const form = useHouseSettingsForm(membership.house, onSaved);
  const isAdmin = membership.role === "admin";
  const locked = !isAdmin || form.submitting;
  const leave = members.data && user ? leaveState(members.data, user.id) : null;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.submit();
      }}
    >
      <SheetHeader onBack={onBack} />
      {!isAdmin ? (
        <p className="mt-4 text-sm text-muted-foreground font-display font-medium">
          Only admins can change the house details.
        </p>
      ) : null}

      <Field
        className="mt-8"
        label="House name"
        value={form.name}
        onValueChange={form.setName}
        maxLength={HOUSE_NAME_MAX_LENGTH}
        autoComplete="off"
        error={form.errors.name}
        disabled={locked}
      />
      <Field
        className="mt-4"
        label="Address"
        value={form.address}
        onValueChange={form.setAddress}
        maxLength={HOUSE_ADDRESS_MAX_LENGTH}
        autoComplete="street-address"
        error={form.errors.address}
        disabled={locked}
      />

      {isAdmin ? (
        <Button
          className="mt-6"
          type="submit"
          label="Save changes"
          loading={form.submitting}
          disabled={!form.dirty}
        />
      ) : null}

      {leave ? (
        <section className="mt-12 border-t border-border pt-6">
          <h3 className="mb-2 text-sm font-display font-medium text-destructive">
            {DANGER_ZONE_TITLE}
          </h3>
          <LeaveAction state={leave} onClick={confirm.askLeave} />
        </section>
      ) : null}
    </form>
  );
}
