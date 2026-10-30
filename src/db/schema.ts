import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/** A single row (id = 1) holding everything the barber can tweak. */
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  businessName: text("business_name").notNull().default("The Chair"),
  tagline: text("tagline")
    .notNull()
    .default("Considered haircuts, by appointment, among friends."),
  serviceName: text("service_name").notNull().default("Haircut"),
  serviceDescription: text("service_description")
    .notNull()
    .default("A consultation, a precise cut and a clean finish."),
  durationMin: integer("duration_min").notNull().default(45),
  bufferMin: integer("buffer_min").notNull().default(15),
  pricePence: integer("price_pence").notNull().default(0),
  currency: text("currency").notNull().default("GBP"),
  minNoticeHours: integer("min_notice_hours").notNull().default(12),
  windowDays: integer("window_days").notNull().default(28),
  cancelCutoffHours: integer("cancel_cutoff_hours").notNull().default(12),
  timezone: text("timezone").notNull().default("Europe/London"),
  address: text("address").notNull().default(""),
  contact: text("contact").notNull().default(""),
  bookingOpen: boolean("booking_open").notNull().default(true),
});

/** Recurring opening hours. Minutes are counted from local midnight. */
export const weeklyHours = pgTable(
  "weekly_hours",
  {
    id: serial("id").primaryKey(),
    /** 0 = Sunday … 6 = Saturday */
    weekday: smallint("weekday").notNull(),
    startMin: integer("start_min").notNull(),
    endMin: integer("end_min").notNull(),
  },
  (t) => [
    check("weekly_hours_weekday", sql`${t.weekday} between 0 and 6`),
    check("weekly_hours_range", sql`${t.startMin} < ${t.endMin}`),
  ],
);

/** Exceptions: holidays, blocked evenings, etc. */
export const timeOff = pgTable(
  "time_off",
  {
    id: serial("id").primaryKey(),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    note: text("note").notNull().default(""),
  },
  (t) => [check("time_off_range", sql`${t.startAt} < ${t.endAt}`)],
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    /** Lower-cased. Nullable so the barber can add bookings for friends without email. */
    email: text("email"),
    phone: text("phone").notNull().default(""),
    notes: text("notes").notNull().default(""),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    status: text("status", { enum: ["confirmed", "cancelled"] })
      .notNull()
      .default("confirmed"),
    manageToken: text("manage_token").notNull().unique(),
    /** When the latest confirmation went out (creation or reschedule). */
    confirmedAt: timestamp("confirmed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("bookings_start_idx").on(t.startAt),
    index("bookings_email_idx").on(t.email),
    check("bookings_range", sql`${t.startAt} < ${t.endAt}`),
  ],
);

export type Settings = typeof settings.$inferSelect;
export type WeeklyHours = typeof weeklyHours.$inferSelect;
export type TimeOff = typeof timeOff.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
