# Barbershop

A small, private booking site for a barber who cuts for friends. You set your hours, and friends pick a time and book. Everyone gets the right emails.

The site, the admin pages and the emails are in Dutch (informal "je"), with Dutch date and price formats. This README stays in English.

## What it does

**For friends**, on the home page (`/book` also works):
- Pick a day, pick a time, and leave a name, phone and email.
- A confirmation email arrives with a calendar invite (`.ics`), a Google Calendar link and a personal "manage booking" link.
- **A reminder arrives 24 hours before** the appointment.
- From the manage link they can reschedule or cancel up to a cutoff you choose (12 hours by default). After that, a button opens a WhatsApp chat with you.

**For you**, at `/admin` (password protected):
- **Appointments:** today and upcoming, grouped by day, with tap-to-call and WhatsApp links. You can:
  - move an appointment to another time, optionally emailing the friend the new time,
  - cancel one (the friend is emailed),
  - add one by hand for someone who texted you,
  - block the rest of today or all of tomorrow in one tap.
- **Availability:**
  - Weekly hours, including several ranges in a day (e.g. a lunch break).
  - Time off for holidays or a blocked evening.
  - A live count of open slots.
- **Settings:**
  - Name, tagline, address, contact and your WhatsApp number.
  - Haircut length, break between cuts and price.
  - Minimum notice, how far ahead people can book, the change cutoff and timezone.
  - A switch to pause bookings.
- **A calendar feed:** subscribe once and every booking shows up in your phone's calendar.
- **An app icon:** add `/admin` to your phone's home screen and it opens like an app.
- **An email to you** on every new booking, reschedule and cancellation.

**Behind the scenes:**
- The database refuses overlapping bookings, so two friends can never get the same slot.
- Each reminder is sent at most once.
- A booking made less than about a day ahead skips the reminder, because the confirmation just went out.

## Stack

- Next.js 15 on Vercel, running in Frankfurt (`fra1`, set in `vercel.json`)
- Postgres on Neon
- Email through Resend
- Reminders triggered every 15 minutes by a GitHub Actions schedule, with a daily Vercel cron as a backup

All of these have free tiers that comfortably cover this. The one thing you pay for is a domain (about €10 a year), and you need it: see step 2.

## Going live (about 30 minutes, one time)

1. **Domain.** Buy one from any registrar (TransIP, Cloudflare, Namecheap…). You'll use it for both the site and the email sender.
2. **Email: [Resend](https://resend.com).** Create an API key, then add and verify your domain under *Domains* (Resend shows the DNS records to add).
   - **Without a verified domain, Resend only delivers to your own address.** Friends would get no confirmation, no reminder and no link to change their booking. Only skip this while testing on your own.
   - Set `EMAIL_FROM` to something like `Kapsalon Max <afspraak@yourdomain.nl>`.
3. **Database: [Neon](https://neon.tech).** Create a free project in **AWS Europe Central (Frankfurt)**, next to the Vercel functions, and copy the **pooled** connection string (it starts with `postgres://`, and the host contains `-pooler`). A database far from the functions makes every page noticeably slower, because a page makes several queries in a row.
4. **Hosting: [Vercel](https://vercel.com).**
   1. Choose *Add New → Project*, then import this GitHub repo.
   2. Under *Environment Variables*, add everything from [`.env.example`](.env.example):

      | Variable | Value |
      |---|---|
      | `DATABASE_URL` | The Neon string from step 3 |
      | `SITE_URL` | `https://yourdomain.nl`. Optional while you use the `vercel.app` address. |
      | `ADMIN_PASSWORD` | The password for `/admin`. Make it long: the admin pages hold your friends' phone numbers. |
      | `AUTH_SECRET` | A long random string: run `openssl rand -hex 32` |
      | `CRON_SECRET` | Another long random string |
      | `RESEND_API_KEY` | The key from step 2 |
      | `EMAIL_FROM` | The sender from step 2 |
      | `ADMIN_EMAIL` | Your own email, for booking alerts |

   3. Deploy. Database tables are created automatically when **production** builds. Preview deployments (other branches) skip this so they can't change your live data. If you give previews their own database (for example a Neon branch as the Preview `DATABASE_URL`), set `MIGRATE_PREVIEWS=1` for Preview too.
   4. Under *Settings → Domains*, add your domain and follow the DNS instructions.
5. **Reminders.** In GitHub, go to *Settings → Secrets and variables → Actions* and add two repository secrets:
   - `SITE_URL`: same as above.
   - `CRON_SECRET`: same value as on Vercel.

   The workflow in `.github/workflows/reminders.yml` then calls the site every 15 minutes, and you can trigger it by hand from the *Actions* tab. GitHub only runs schedules on the default branch, so merge to `main`.

   GitHub pauses scheduled workflows after 60 days without a push (it emails you first). If that happens, click *Enable workflow* in the Actions tab. Meanwhile the daily Vercel cron in `vercel.json` (07:00 UTC, 08:00 or 09:00 in the Netherlands) keeps sending any reminder due in the next 24 hours, so nobody is forgotten. The reminder then arrives the morning before or the morning of the appointment, and says "vandaag" or "morgen" accordingly. For exact timing without GitHub, point a free pinger like [cron-job.org](https://cron-job.org) at `https://yourdomain.nl/api/cron/reminders` every 15 minutes with the header `Authorization: Bearer <CRON_SECRET>`.
6. **Set up.** Open `/admin` and sign in.
   - Fill in **Settings**: your name, address, price, contact and WhatsApp number.
   - Add your **Availability**.
   - Share your site link with friends. Settings has "Copy link" and "Share on WhatsApp" buttons.
   - On your phone, open `/admin` and choose *Add to Home Screen*, so it opens like an app.

### Good to know

- **Changing `AUTH_SECRET`** signs you out everywhere and changes your private calendar feed link, so subscribe to the feed again afterwards.
- **Backups.** Neon's free plan only keeps a short restore history. Now and then, run `pg_dump "$DATABASE_URL" > backup.sql` (with the *unpooled* connection string) and keep the file somewhere private. Don't automate this in GitHub Actions on a public repo, because workflow artifacts can be downloaded by others.
- **Calendar feed delay.** Google Calendar refreshes subscribed calendars only every few hours (Apple is quicker). For last-minute bookings, rely on the email alert.

## Running locally

```bash
cp .env.example .env               # then fill in DATABASE_URL, ADMIN_PASSWORD, AUTH_SECRET
npm install
npm run db:migrate
npm run dev                        # http://localhost:3000
```

With `RESEND_API_KEY` left empty, emails are printed to the terminal instead of being sent. To trigger reminders by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders
```

Other commands: `npm test` (unit tests for slot and reminder logic) and `npm run typecheck`.

## Where things live

| Path | What |
|---|---|
| `src/lib/slots.ts` | Turns hours, time off and bookings into open slots (timezone and daylight-saving aware) |
| `src/lib/bookings.ts` | Create, reschedule, cancel and send reminders |
| `src/lib/email/templates.ts` | Every email |
| `src/lib/format.ts` | Date, time and price formatting (`nl-NL`) and weekday names |
| `src/lib/whatsapp.ts` | Turns phone numbers into WhatsApp links |
| `src/app/(site)` | Public pages: home, booking, manage booking |
| `src/app/admin` | Admin pages and their server actions |
| `src/app/api/cron/reminders` | Reminder endpoint |
| `src/app/api/calendar` | Your private calendar feed |
| `drizzle/` | Database migrations, including the no-double-booking constraint |
