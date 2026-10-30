# Barbershop

A small, private booking site for a barber who cuts for friends. You set your hours, and friends pick a time and book. Everyone gets the right emails.

## What it does

**For friends**, at `/book`:
- Pick a day, pick a time, and leave a name, phone and email.
- A confirmation email arrives with a calendar invite (`.ics`), a Google Calendar link and a personal "manage booking" link.
- **A reminder arrives 24 hours before** the appointment.
- From the manage link they can reschedule or cancel up to a cutoff you choose (12 hours by default).

**For you**, at `/admin` (password protected):
- **Appointments:** today and upcoming, grouped by day, with tap-to-call phone numbers. You can cancel an appointment (the friend is emailed) or add one by hand for someone who texted you.
- **Availability:**
  - Weekly hours, including several ranges in a day (e.g. a lunch break).
  - Time off for holidays or a blocked evening.
  - A live count of open slots.
- **Settings:**
  - Name, tagline, address and contact.
  - Haircut length, break between cuts and price.
  - Minimum notice, how far ahead people can book, the change cutoff and timezone.
  - A switch to pause bookings.
- **A calendar feed:** subscribe once and every booking shows up in your phone's calendar.
- **An email to you** on every new booking, reschedule and cancellation.

**Behind the scenes:**
- The database refuses overlapping bookings, so two friends can never get the same slot.
- Each reminder is sent at most once.
- A booking made less than about a day ahead skips the reminder, because the confirmation just went out.

## Stack

- Next.js 15 on Vercel
- Postgres on Neon
- Email through Resend
- Reminders triggered every 15 minutes by a GitHub Actions schedule

All of these have free tiers that comfortably cover this.

## Going live (about 20 minutes, one time)

1. **Database: [Neon](https://neon.tech).** Create a free project and copy the **pooled** connection string (it starts with `postgres://`, and the host contains `-pooler`).
2. **Email: [Resend](https://resend.com).** Create an API key.
   - To send to anyone, add and verify a domain you own under *Domains*. Then set `EMAIL_FROM` to something like `The Chair <bookings@yourdomain.com>`.
   - Without a domain, Resend only delivers to your own address. That is fine for testing.
3. **Hosting: [Vercel](https://vercel.com).**
   1. Choose *Add New → Project*, then import this GitHub repo.
   2. Under *Environment Variables*, add everything from [`.env.example`](.env.example):

      | Variable | Value |
      |---|---|
      | `DATABASE_URL` | The Neon string from step 1 |
      | `SITE_URL` | Optional on Vercel, which defaults to your production address. Set it if you use your own domain. |
      | `ADMIN_PASSWORD` | The password for `/admin` |
      | `AUTH_SECRET` | A long random string: run `openssl rand -hex 32` |
      | `CRON_SECRET` | Another long random string |
      | `RESEND_API_KEY` | The key from step 2 |
      | `EMAIL_FROM` | The sender from step 2 |
      | `ADMIN_EMAIL` | Your own email, for booking alerts |

   3. Deploy. The database tables are created automatically during the build.
4. **Reminders.** In GitHub, go to *Settings → Secrets and variables → Actions* and add two repository secrets:
   - `SITE_URL`: same as above.
   - `CRON_SECRET`: same value as on Vercel.

   The workflow in `.github/workflows/reminders.yml` then calls the site every 15 minutes, and you can trigger it by hand from the *Actions* tab. GitHub only runs schedules on the default branch, so merge to `main`.
5. **Set up.** Open `/admin` and sign in.
   - Fill in **Settings**: your name, address, price and contact.
   - Add your **Availability**.
   - Share `/book` with your friends.

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
| `src/app/(site)` | Public pages: home, booking, manage booking |
| `src/app/admin` | Admin pages and their server actions |
| `src/app/api/cron/reminders` | Reminder endpoint |
| `src/app/api/calendar` | Your private calendar feed |
| `drizzle/` | Database migrations, including the no-double-booking constraint |
