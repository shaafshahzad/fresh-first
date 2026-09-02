import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../lib/auth";
import { DisplayClient } from "./DisplayClient";

export const metadata: Metadata = {
  title: "Fridge display — Fresh First",
  description: "A glanceable list of the food that expires first.",
};

export default async function DisplayPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/account?next=/display");
  return <DisplayClient />;
}
