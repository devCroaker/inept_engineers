import type { Metadata } from "next";

import { Bullets, LegalPage, P, Section } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "The terms for using the Inept Engineers site: who it is for, what is expected, and what it does not do.",
};

const CONTACT = "privacy@ineptengineers.com";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms"
      updated="18 September 2026"
      summary="This is a private site run by one SCA household for its own events. These terms are short because the situation is simple: be decent, keep other people's information to yourself, and do not rely on this site for anything that matters more than a camping trip."
    >
      <Section heading="Who this is for">
        <P>
          Members of the Inept Engineers, and friends of the household who have
          been given an account. It is not open to the public. Being able to
          reach the site does not make you a member, and an account can be
          withdrawn at any time by the household leadership.
        </P>
      </Section>

      <Section heading="Your account">
        <P>
          One account per person, and it is yours alone. Do not share the
          sign-in. If you think somebody else has got into your account, say so
          straight away, because your account can see other members&apos;
          contact details and, depending on your roles, a good deal more.
        </P>
      </Section>

      <Section heading="Other people's information">
        <P>
          This is the part that actually matters. The site holds phone numbers,
          emergency contacts, allergies, and medical information, and it shows
          each of those only to the people who need them.
        </P>
        <Bullets
          items={[
            "Use what you can see for the event you are helping run, and nothing else.",
            "Do not copy it, export it, screenshot it into a group chat, or pass it on to anyone, inside the household or out.",
            "If you hold the medical or kitchen role, you are seeing information people gave us so they would be safe at an event. Treat it accordingly.",
          ]}
        />
        <P>
          Misusing other members&apos; information will cost you your account,
          and is a household matter beyond that.
        </P>
      </Section>

      <Section heading="What you tell us">
        <P>
          Keep your own details accurate, especially allergies, medications, and
          emergency contacts. We will act on what is written here. If it is out
          of date, wrong, or missing, we cannot know that.
        </P>
        <P>
          This site is a convenience, not a medical record and not a substitute
          for telling the person cooking about your allergy in person. At an
          actual event, say it out loud as well.
        </P>
      </Section>

      <Section heading="Events and money">
        <P>
          The site does not take payment. It records who owes what for a food
          buy-in, and money changes hands between people directly, outside this
          site. We do not process card payments, hold funds, or act as
          anyone&apos;s bank. A balance shown here is a note between friends
          about who owes whom, not an invoice.
        </P>
        <P>
          Some SCA events charge their own fees. Where an event does, the site
          links you to the organisers and you pay them, not us.
        </P>
      </Section>

      <Section heading="What this site is worth">
        <P>
          It is run by volunteers in their spare time. It will sometimes be
          down, lose something, or be wrong. Use it for organising events and do
          not build anything important on top of it. To put it in the usual
          words: it is provided as is, without warranty of any kind, and the
          household is not liable for any loss arising from using it.
        </P>
      </Section>

      <Section heading="Changes">
        <P>
          These terms may change as the site grows. Changes worth knowing about
          will be mentioned in the household Discord.
        </P>
      </Section>

      <Section heading="Governing law">
        <P>
          California law governs these terms, and any dispute belongs in the
          California courts. We would very much rather sort it out over a fire.
        </P>
      </Section>

      <Section heading="Contact">
        <P>
          Questions about these terms: <b>{CONTACT}</b>
        </P>
      </Section>
    </LegalPage>
  );
}
