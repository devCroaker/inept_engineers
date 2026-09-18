import type { Metadata } from "next";

import { Bullets, LegalPage, P, Section } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What the Inept Engineers site stores about you, who can see it, and how to have it removed.",
};

const CONTACT = "privacy@ineptengineers.com";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      updated="18 September 2026"
      summary="This site is run by the Inept Engineers, an SCA household, to organise our own events. It is not a business and it does not make money. We collect what is needed to run an event and look after the people at it, and nothing else."
    >
      <Section heading="Who runs this">
        <P>
          The Inept Engineers household. The site is maintained by members of
          the household, and the data lives in our own database on Amazon Web
          Services. Nobody outside the household administers it.
        </P>
      </Section>

      <Section heading="What we store, and why">
        <P>
          Some of this you give us when you sign up. The rest is optional, and
          exists so that the people running an event can feed you safely and
          reach someone if something goes wrong.
        </P>
        <Bullets
          items={[
            "Your name and email address, so you have an account and can be sent event mail.",
            "How you sign in. If you use Google or Discord, we store the identifier they give us for you and the tokens that keep you signed in. We do not receive your password from them. If you use a password here instead, we store it hashed, never as text.",
            "Your SCA name, pronouns, city and state, and a short bio, if you fill them in. This is the part other members see.",
            "Your legal name, phone number, and any accessibility needs, if you fill them in.",
            "Emergency contacts: who to call, their phone number, and how they know you.",
            "Allergies and dietary restrictions, so the kitchen does not poison you.",
            "Medications and medical conditions, so that whoever is holding the first aid kit knows what they are dealing with.",
            "Your replies to events: whether you are coming, when you are arriving and leaving, how many guests you are bringing, and anything you tell the organisers.",
          ]}
        />
        <P>
          There is no analytics, no advertising, and no tracking of any kind. We
          do not know what pages you look at.
        </P>
      </Section>

      <Section heading="Who can see it">
        <P>
          Not everyone in the household can see everything. Access is decided by
          role, and the rules are enforced by the site itself rather than left
          to good manners. You can always see all of your own data.
        </P>
        <Bullets
          items={[
            "SCA name, pronouns, city and state, bio: any signed-in member.",
            "Legal name, phone, accessibility notes: sisters and officers.",
            "Emergency contacts: sisters and officers.",
            "Allergies and dietary restrictions: the medical and kitchen roles.",
            "Medications and conditions: the medical role only. This is the most restricted data on the site.",
            "Event replies, including arrival dates and guest counts: any signed-in member, because knowing who is coming is the point of the site.",
          ]}
        />
      </Section>

      <Section heading="Who we share it with">
        <P>
          Nobody. We do not sell it, trade it, or hand it to anyone outside the
          household. Three companies necessarily touch it because they run the
          machinery:
        </P>
        <Bullets
          items={[
            "Amazon Web Services, which hosts the site and the database, and sends our email.",
            "Google, if you choose to sign in with Google. They tell us your name, email, and profile picture.",
            "Discord, if you choose to sign in with Discord. The same applies.",
          ]}
        />
        <P>
          If you never use Google or Discord to sign in, neither of them learns
          anything about you from us.
        </P>
      </Section>

      <Section heading="Cookies">
        <P>
          One cookie, which records that you are signed in. It is not used to
          track you, it is not shared, and there are no third-party cookies on
          this site. That is why you will never see a cookie banner here: there
          is nothing to consent to.
        </P>
      </Section>

      <Section heading="How long we keep it">
        <P>
          For as long as you have an account. If you leave the household, or
          simply want out, ask and we will delete it. Deleting your account
          removes your profile, your contact details, your emergency contacts,
          your dietary and medical information, and your event replies.
        </P>
        <P>
          Events you created are kept, because an event is a household record
          rather than a personal one, but they stop being linked to you.
        </P>
      </Section>

      <Section heading="What you can ask for">
        <P>
          Ask and we will tell you everything the site holds about you, correct
          anything wrong, or delete all of it. You do not need a reason and we
          will not make it difficult. There is no form, because there are not
          enough of us to need one.
        </P>
        <P>
          The household is based in California. Our size means the California
          Consumer Privacy Act does not apply to us, but the rights it describes
          are ones we will honour anyway, because refusing them would be a
          strange way to treat people we camp with.
        </P>
      </Section>

      <Section heading="Children">
        <P>
          Accounts are for adults. Children attend our events with their
          parents, and we do not create accounts for them or store information
          about them here. Where a child has an allergy the kitchen needs to
          know about, record it on the parent&apos;s account.
        </P>
      </Section>

      <Section heading="Changes">
        <P>
          If this policy changes in a way that matters, we will say so in the
          household Discord rather than quietly editing the page and changing
          the date.
        </P>
      </Section>

      <Section heading="Contact">
        <P>
          Questions, corrections, and deletion requests: <b>{CONTACT}</b>
        </P>
      </Section>
    </LegalPage>
  );
}
