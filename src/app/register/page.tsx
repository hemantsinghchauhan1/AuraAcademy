import { redirect } from "next/navigation";

// Old /register route — redirect to Clerk's /sign-up
export default function RegisterPage() {
  redirect("/sign-up");
}