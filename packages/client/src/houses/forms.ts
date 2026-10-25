import {
  JOIN_SCAN_NOT_INVITE,
  houseAddressErrorMessage,
  houseNameErrorMessage,
  inviteFailureCopy,
  parseInviteInput,
  validateHouseAddress,
  validateHouseName,
  type House,
} from "@kinwoo/core/houses";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

import { toast } from "../toast";
import { houseErrorFromCause } from "./errors";
import { useHouseLimit } from "./house-limit";
import { useCreateHouse, useUpdateHouse } from "./mutations";
import { invitePreviewOptions } from "./queries";

type HouseFields = { name: string; address: string | null };
type FieldErrors = { name?: string; address?: string };

type InitialFields = { name?: string; address?: string | null };

function useHouseFields(initial: InitialFields = {}) {
  const [name, setName] = useState(initial.name ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});

  const clearError = useCallback((field: keyof FieldErrors) => {
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }, []);

  const validate = useCallback((): HouseFields | null => {
    const nextErrors: FieldErrors = {};

    const nameResult = validateHouseName(name);
    if (!nameResult.ok) nextErrors.name = houseNameErrorMessage(nameResult.error);

    const addressResult = validateHouseAddress(address);
    if (!addressResult.ok) nextErrors.address = houseAddressErrorMessage(addressResult.error);

    setErrors(nextErrors);
    if (!nameResult.ok || !addressResult.ok) return null;

    return { name: nameResult.value, address: addressResult.value };
  }, [name, address]);

  return {
    name,
    address,
    errors,
    setName: (value: string) => {
      setName(value);
      clearError("name");
    },
    setAddress: (value: string) => {
      setAddress(value);
      clearError("address");
    },
    validate,
  };
}

export function useCreateHouseForm(onCreated: (house: House) => void) {
  const fields = useHouseFields();
  const create = useCreateHouse();
  const { checking, blocked, message: blockedMessage } = useHouseLimit();
  const [creating, setCreating] = useState(false);

  const submit = async () => {
    if (checking) return;
    if (blocked) {
      toast.warning(blockedMessage);
      return;
    }

    const values = fields.validate();
    if (!values) return;

    setCreating(true);
    try {
      const house = await create.mutateAsync(values);
      toast.success(TOAST_MESSAGES.houseCreated);
      onCreated(house);
    } catch (cause) {
      setCreating(false);
      toast.error(houseErrorFromCause(cause));
    }
  };

  return { ...fields, submit, submitting: creating, checking, blocked, blockedMessage };
}

export function useHouseSettingsForm(house: House, onSaved?: () => void) {
  const fields = useHouseFields(house);
  const update = useUpdateHouse(house.id);

  const dirty =
    fields.name.trim() !== house.name || fields.address.trim() !== (house.address ?? "");

  const submit = async () => {
    const values = fields.validate();
    if (!values) return;

    try {
      await update.mutateAsync(values);
      toast.success(TOAST_MESSAGES.houseSaved);
      onSaved?.();
    } catch (cause) {
      toast.error(houseErrorFromCause(cause));
    }
  };

  return {
    ...fields,
    dirty,
    submit,
    submitting: update.isPending,
  };
}

const LOOKUP_RETAIN_MS = 15_000;

// Checks the code on this screen so a wrong one never costs a navigation. The result stays cached
// just long enough for the preview screen to reuse it instead of spending a second guess.
export function useJoinCodeForm(onCode: (code: string) => void, initial = "") {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const busy = useRef(false);

  const lookup = async (code: string) => {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    setChecking(true);
    try {
      const preview = await queryClient.fetchQuery({
        ...invitePreviewOptions(code),
        staleTime: 0,
        gcTime: LOOKUP_RETAIN_MS,
      });
      if ("houseId" in preview) {
        onCode(code);
      } else {
        const copy = inviteFailureCopy(preview.status);
        setError(`${copy.title}. ${copy.message}`);
      }
    } catch (cause) {
      setError(houseErrorFromCause(cause));
    } finally {
      busy.current = false;
      setChecking(false);
    }
  };

  const submit = () => {
    const parsed = parseInviteInput(value);
    if (!parsed.ok) {
      setError(
        parsed.error === "empty"
          ? "Enter the 6-character code."
          : "That doesn't look like an invite code. Check it and try again.",
      );
      return;
    }
    setValue(parsed.code);
    void lookup(parsed.code);
  };

  // Returns whether the scan was an invite, so the caller knows when to close the camera.
  const scan = (raw: string): boolean => {
    const parsed = parseInviteInput(raw);
    if (!parsed.ok) {
      setError(JOIN_SCAN_NOT_INVITE);
      return false;
    }
    setValue(parsed.code);
    void lookup(parsed.code);
    return true;
  };

  return {
    value,
    error,
    checking,
    submit,
    scan,
    setValue: (next: string) => {
      setValue(next);
      setError(null);
    },
  };
}
