import { redirect } from "next/navigation";

// Booking lives on the home page; keep /book working for links in emails.
export default function BookPage() {
  redirect("/#book");
}
