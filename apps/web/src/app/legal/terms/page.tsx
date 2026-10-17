import { APP_NAME, AUTHOR_NAME, LEGAL_LABELS, LEGAL_PATHS, SUPPORT_EMAIL } from "@kinwoo/core/app";
import type { Metadata } from "next";

import { A, LegalDocument, LegalSection, List, P } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: LEGAL_LABELS.terms,
  description: `The terms for using ${APP_NAME}, including houses, shared lists and your responsibilities.`,
  alternates: { canonical: LEGAL_PATHS.terms },
};

export default function TermsPage() {
  return (
    <LegalDocument
      title={LEGAL_LABELS.terms}
      intro={`These terms apply when you use ${APP_NAME} on the web or on your phone. By creating an account or continuing to use ${APP_NAME}, you agree to them.`}
    >
      <LegalSection title="What Kinwoo is">
        <P>
          {APP_NAME} helps the people in a shared home keep track of what the home needs. You create
          or join a house, then work with your housemates on shared lists, see who did what in the
          activity feed, and manage the house together.
        </P>
      </LegalSection>

      <LegalSection title="Your account">
        <List
          items={[
            "You must be at least 18 years old to use Kinwoo.",
            "Sign in with your own email address or Google account, and give accurate details.",
            "Keep your sign-in secure. What happens under your account is your responsibility.",
            "One person, one account. Do not share an account or create accounts to get around a removal.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Houses and housemates">
        <P>
          A house is shared by design. Everyone who joins can see the house name and address, the
          members, their display names, avatars and email addresses, shared lists and items, who
          bought what and for how much, and the activity feed. Lists marked private are visible only
          to the person who made them.
        </P>
        <List
          items={[
            "Only invite people you trust. Anyone holding a house's invite code or link can join, unless the house is set to invited emails only.",
            "House admins can invite people, change roles, edit house settings and remove members.",
            "A member can leave a house at any time. Once someone has left or been removed, they lose access to it.",
          ]}
        />
      </LegalSection>

      <LegalSection title="What you add">
        <P>
          Names, notes, prices and anything else you enter stay yours. You give {APP_NAME}{" "}
          permission to store them and show them to the other members of your house, because that is
          how the service works. You are responsible for what you add, and you confirm you are
          allowed to add it.
        </P>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <List
          items={[
            "No harassment, hate speech or abuse toward housemates or anyone else, including in house names, list names, item names and notes.",
            "No pretending to be someone else, and no offensive or misleading display names or avatars.",
            "No attempts to break, probe or overload the service, to reach data that is not yours, or to automate the app in ways it was not built for.",
            "No unlawful content or use.",
          ]}
        />
        <P>
          We can remove content, or suspend or close an account, that breaks these terms or harms
          other people or the service.
        </P>
      </LegalSection>

      <LegalSection title="Not a payment or financial service">
        <P>
          {APP_NAME} lets you record what was bought and what it cost. It does not take payments,
          hold money, move money between people or give financial advice. Amounts are what members
          enter, and settling up between housemates happens outside the app.
        </P>
      </LegalSection>

      <LegalSection title="Availability and changes">
        <P>
          {APP_NAME} is provided free and as it is. Features come and go, and parts that are marked
          as not built yet may never ship. The service may be unavailable from time to time, and we
          may change or stop it with reasonable notice where we can.
        </P>
      </LegalSection>

      <LegalSection title="Ending your use">
        <P>
          You can stop using {APP_NAME} at any time and leave your house from the house settings. To
          have your account deleted, email <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A>{" "}
          from the address on the account. What happens to your data is covered in the{" "}
          <A href={LEGAL_PATHS.privacy}>{LEGAL_LABELS.privacy}</A>.
        </P>
      </LegalSection>

      <LegalSection title="No warranty and limits on liability">
        <P>
          {APP_NAME} is offered without any warranty that it will be accurate, uninterrupted or
          error free. Please do not rely on it for anything where a mistake would cause serious
          harm, such as medication or allergy information.
        </P>
        <P>
          To the extent the law allows, {AUTHOR_NAME} is not liable for indirect or consequential
          loss, lost data, or disputes between housemates arising from your use of {APP_NAME}.
        </P>
      </LegalSection>

      <LegalSection title="Changes to these terms">
        <P>
          If these terms change, the date at the top changes with them. Material changes will be
          flagged in the app. Continuing to use {APP_NAME} after a change means you accept it.
        </P>
      </LegalSection>

      <LegalSection title="Governing law">
        <P>These terms are governed by the laws of India.</P>
      </LegalSection>

      <LegalSection title="Contact">
        <P>
          Questions about these terms go to <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A>.
        </P>
      </LegalSection>
    </LegalDocument>
  );
}
