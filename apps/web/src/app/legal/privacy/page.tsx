import { APP_NAME, AUTHOR_NAME, LEGAL_LABELS, LEGAL_PATHS, SUPPORT_EMAIL } from "@kinwoo/core/app";
import type { Metadata } from "next";

import { A, LegalDocument, LegalSection, List, P } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: LEGAL_LABELS.privacy,
  description: `What ${APP_NAME} stores about you, who can see it, who processes it and how to have it corrected or deleted.`,
  alternates: { canonical: LEGAL_PATHS.privacy },
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title={LEGAL_LABELS.privacy}
      intro={`This explains what ${APP_NAME} collects, why, who can see it and what you can do about it. ${APP_NAME} is built and run by ${AUTHOR_NAME}, who is responsible for the information described here.`}
    >
      <LegalSection title="The short version">
        <P>
          {APP_NAME} stores what it needs to run a shared household: your account, the houses you
          belong to, and the lists and activity inside them. There are no ads, no analytics and no
          tracking, and nothing is sold. The people in your house can see more about you than anyone
          else can, and that is covered below.
        </P>
      </LegalSection>

      <LegalSection title="What we collect">
        <List
          items={[
            "Your email address, used to sign you in with a code or through Google.",
            "Your display name, and your avatar: one of our own preset images, or a photo you upload yourself. Your Google profile picture is not copied.",
            "Your preferences: language, theme and the notifications setting.",
            "Your houses: house name, optional address, your role, when you joined or left, and invite activity.",
            "What you add inside a house: lists, items with quantities, urgency and notes, assignments, and purchase records with quantity, price, store and date.",
            "The activity feed, which records who did what in a house.",
          ]}
        />
        <P>
          We do not ask for your contacts, location, photos or payment details. We do not collect
          your phone number.
        </P>
      </LegalSection>

      <LegalSection title="Who can see what">
        <P>
          Inside a house, active members can see each other&apos;s display names, avatars and email
          addresses, plus shared lists, items, purchase records and the activity feed. Admins can
          also see the invite code and manage members. A list marked private is visible only to the
          person who created it.
        </P>
        <P>
          People outside your house cannot read its data. Someone previewing an invite sees only the
          house name, address, the inviter and a few members&apos; names and avatars.
        </P>
      </LegalSection>

      <LegalSection title="How we use it">
        <P>
          To sign you in, show you your house, keep members in sync, and send the codes needed to
          log in. We do not use it for advertising or profiling.
        </P>
      </LegalSection>

      <LegalSection title="Cookies and on-device storage">
        <List
          items={[
            "Web: sign-in cookies set by our authentication provider. They are strictly necessary, because without them the site cannot tell that a request is yours. Your browser also remembers that you accepted the cookie notice.",
            "Mobile: your sign-in session is kept in the app's storage on your device.",
            "Both: your theme, your last active house and an invite code you opened before signing in are kept on your device. They are not sent to us as tracking data.",
          ]}
        />
        <P>
          Clearing this storage or signing out removes it. Blocking the sign-in cookies will sign
          you out.
        </P>
      </LegalSection>

      <LegalSection title="Who processes your data">
        <P>These providers run parts of the service on our behalf:</P>
        <List
          items={[
            "Supabase: the database, sign-in, real-time updates and storage of preset avatar images.",
            "Cloudflare: hosting and delivery of the web app and its API.",
            "Google: sign-in, only if you choose to continue with Google.",
            "An email delivery service: sends the sign-in codes to your address.",
          ]}
        />
        <P>
          Each handles data only to provide its part of the service. Our hosting provider may also
          keep ordinary technical logs, such as IP address and browser type, for security. We may
          disclose information where the law requires it.
        </P>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <P>
          Your account and house data are kept while your account exists. Houses keep a record of
          who took part, so when someone leaves or is deleted, what they did earlier can remain in
          the house history shown to remaining members as a former member.
        </P>
      </LegalSection>

      <LegalSection title="Your choices">
        <List
          items={[
            "Ask for a copy of the information we hold about you, or for it to be corrected.",
            "Ask for your account to be deleted.",
            "Leave a house at any time from the house settings.",
            "Sign out at any time. Signing out does not delete anything.",
          ]}
        />
        <P>
          Email <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A> from the address on your
          account and we will respond within a reasonable period. Account deletion is handled by
          email for now, not from inside the app.
        </P>
      </LegalSection>

      <LegalSection title="Security">
        <P>
          Traffic is encrypted with HTTPS, and database rules limit each house&apos;s data to its
          members. No system is perfectly secure, so please choose what you add with that in mind.
        </P>
      </LegalSection>

      <LegalSection title="Children">
        <P>
          {APP_NAME} is not for anyone under 18, and accounts are not knowingly created for them. If
          you think a child has an account, email us and it will be removed.
        </P>
      </LegalSection>

      <LegalSection title="Changes">
        <P>
          If this policy changes, the date at the top changes with it. Material changes will be
          flagged in the app.
        </P>
      </LegalSection>

      <LegalSection title="Contact and grievances">
        <P>
          {AUTHOR_NAME} handles questions and complaints about privacy at{" "}
          <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A>. Our{" "}
          <A href={LEGAL_PATHS.terms}>{LEGAL_LABELS.terms}</A> are part of how you use {APP_NAME}.
        </P>
      </LegalSection>
    </LegalDocument>
  );
}
