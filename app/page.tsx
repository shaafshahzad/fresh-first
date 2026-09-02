import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOrCreateDefaultFridge } from "../db/fridges";
import { auth } from "../lib/auth";
import { FreshFirstClient } from "./FreshFirstClient";

export const metadata: Metadata = {
  title: "Fresh First — Fridge expiry tracker",
  description: "Keep the food that needs your attention at the top of the list.",
};

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/account");
  const fridge = await getOrCreateDefaultFridge(session.user.id);
  return (
    <FreshFirstClient
      userName={session.user.name}
      fridgeName={fridge.name}
    />
  );
}
