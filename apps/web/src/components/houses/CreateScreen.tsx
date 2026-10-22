"use client";

import { useCreateHouseForm } from "@kinwoo/client/houses";
import {
  CREATE_HOUSE_SUBTITLE,
  HOUSE_ADDRESS_MAX_LENGTH,
  HOUSE_NAME_MAX_LENGTH,
  HOUSE_SCREEN_TITLES,
} from "@kinwoo/core/houses";
import { HousePinIcon } from "@kinwoo/icons";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { useHouseNavigation } from "@/lib/house-navigation";

import { Button } from "../Button";
import { Field } from "./Field";
import { HouseScreen } from "./HouseScreen";

export function CreateScreen() {
  const router = useRouter();
  const { goBack } = useHouseNavigation();
  const form = useCreateHouseForm(() => router.replace("/house/invite"));

  return (
    <HouseScreen title={HOUSE_SCREEN_TITLES.create} hiddenTitle={!form.blocked}>
      {form.blocked ? (
        <div>
          <p className="text-base text-muted-foreground">{form.blockedMessage}</p>
          <Button className="mt-6" variant="outline" label="Back" onClick={goBack} />
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.submit();
          }}
        >
          {/* The artwork is white linework; inverted in light mode so it stays visible. */}
          <Image
            src="/images/build-your-house.webp"
            alt=""
            width={512}
            height={311}
            priority
            className="mx-auto h-36 w-auto invert dark:invert-0"
          />
          <h2 className="mb-3 mt-10 font-display text-3xl font-medium">
            {HOUSE_SCREEN_TITLES.create}
          </h2>

          <p className="mb-8 font-display text-sm font-normal text-muted-foreground">
            {CREATE_HOUSE_SUBTITLE}
          </p>

          <Field
            label="House name"
            value={form.name}
            onValueChange={form.setName}
            placeholder="e.g. Sharma Niwas"
            maxLength={HOUSE_NAME_MAX_LENGTH}
            autoComplete="off"
            error={form.errors.name}
            disabled={form.submitting}
          />
          <Field
            className="mt-6"
            label="Address"
            icon={<HousePinIcon size={20} />}
            value={form.address}
            onValueChange={form.setAddress}
            placeholder="e.g. Flat 302, Sunshine Apartments, Koramangala, Bengaluru"
            maxLength={HOUSE_ADDRESS_MAX_LENGTH}
            autoComplete="street-address"
            error={form.errors.address}
            disabled={form.submitting}
          />

          <Button className="mt-10" label="Create house" type="submit" loading={form.submitting} />
        </form>
      )}
    </HouseScreen>
  );
}
