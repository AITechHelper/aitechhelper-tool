import { redirect } from "next/navigation";

// Middleware handles the root route — this is a fallback only
export default function RootPage() {
  redirect("/get-started");
}
