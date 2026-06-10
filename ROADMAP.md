# CUTickets — Roadmap & Feasibility Notes

Planned features beyond the current MVP, with feasibility research. Status as of
2026-06-10.

---

## 1. Onboarding flow (name + email + phone) — ✅ Easy, mostly already there

Onboarding (`src/app/(app)/onboarding/OnboardingForm.tsx` + `src/lib/actions/onboarding.ts`)
already collects name (autofilled from Google), school, and class year. Adding
phone is a small change:

- **Full name** — already autofilled from Google (`defaultName`). ✓
- **Email locked/uneditable** — render the Google account email as read-only
  text (not an input), so it physically can't be edited.
- **Phone number** — add a `phone` field to the `User` model + a validated input
  (libphonenumber for formatting). Small migration + form change.

**Effort: ~1–2 hours.** No external dependencies.

## 2. Phone verification by code (SMS OTP) — ✅ Possible, costs money

Standard pattern: send a 6-digit code via SMS, user enters it, confirm. Two ways:

| Option | How | Cost |
|---|---|---|
| **Twilio Verify** (recommended) | Managed — Twilio generates/sends/validates the code, handles rate-limiting & fraud | ~**$0.05 per successful verification + ~$0.0083/SMS** (US) |
| **Twilio SMS + own code** | Generate the code, store a hash, send via SMS | Cheaper per-msg but you build rate-limiting/expiry/anti-abuse yourself |

For a campus MVP, **Twilio Verify** is the right call — it handles abuse vectors
(code spamming) you'd otherwise build yourself. At a few hundred students this is
a few dollars total. Add `phoneVerifiedAt` to the schema and gate listing
creation on it.

**Effort: ~half a day.** Needs a Twilio account (free trial credit to start).

## 3. Anonymous until match — ✅ ~80% already built

The hard part is done: `PUBLIC_USER_SELECT` (`src/lib/public-profile.ts`)
structurally excludes email, and the market shows only "first name + last
initial." Email is revealed only on a confirmed match. To make it **fully**
anonymous, also hide the name until match (show "Columbia '27 · ★4.8" instead of
"Jordan M."). Small change.

## 4. Auto-add matched users to an iMessage group — ⚠️ Possible, but not recommended

**Apple has no iMessage API.** No SDK, no endpoint, no developer program. Nothing
official lets a server create an iMessage group.

**Third-party "bridges" exist** (Sendblue, LoopMessage, Blooio) — they run real
Mac minis logged into Apple IDs and script the Messages app. Some support group
creation. Dealbreakers for our use case:

1. **A bridge phone number is always a participant.** These services send from
   their own Apple-registered number, so the group would be
   `[Student A, Student B, +1-CUTickets-bot]` — a third number sits in every
   chat. You can't silently create a 1:1-feeling group between two strangers;
   someone has to be the bridge.
2. **Cost is steep for a free campus app.** Sendblue's outbound/group plans run
   **$500–$1,000/month per dedicated line**; LoopMessage is cheaper (~$16/mo +
   per-message) but scales with volume. Business-sales pricing, not
   student-marketplace pricing.
3. **Apple actively bans these numbers.** Apple periodically deregisters bridge
   Apple IDs, so deliverability is flaky and the feature can break overnight.
   Also against Apple's ToS.
4. **Consent/privacy.** Auto-dumping two students into a group chat using phone
   numbers given for *verification* is a privacy surprise.

### ✅ Better alternative (free, no ToS risk, better UX)

Don't auto-create the group server-side. On match, give each user a one-tap
**"Message" button** that opens *their own* Messages app with a pre-filled group
draft:

```
sms:/open?addresses=+1AAA,+1BBB&body=Hey! CUTickets match for Bacchanal 🎟️
```

On iOS this opens a group iMessage draft with both numbers and prefilled text —
the user hits send. No bridge number, no monthly cost, no banned-line risk, and
it's genuinely native (blue bubbles, from the user's real number). Contact info
is already revealed on match, so this slots right in.

Gets ~95% of the magic ("matched → instantly texting together") for $0 and zero
infrastructure.

---

## Recommendation

Build **#1, #2, #3 now** (onboarding + phone + verification + full anonymity) —
standard, low-risk. For **#4, skip the iMessage bridge** and use the deep-link
"Message" button. Revisit a bridge vendor only if there's budget + users later;
it should not gate launch.

---

## Sources

- [Sendblue — iMessage API](https://www.sendblue.com/api) · [Sendblue pricing](https://www.sendblue.com/pricing) · [Sendblue: send iMessage programmatically](https://www.sendblue.com/blog/send-imessage-programmatically)
- [LoopMessage](https://loopmessage.com/) · [LoopMessage pricing](https://loopmessage.com/pricing/)
- [iMessage API pricing comparison 2026 (Tuco AI)](https://tuco.ai/blog/imessage-api-pricing-comparison-2026)
- [Twilio Verify pricing](https://www.twilio.com/en-us/verify/pricing) · [Twilio SMS pricing (US)](https://www.twilio.com/en-us/sms/pricing/us)
