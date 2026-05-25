import { redirect } from "next/navigation";

// Old /login route — redirect to Clerk's /sign-in
export default function LoginPage() {
  redirect("/sign-in");
}