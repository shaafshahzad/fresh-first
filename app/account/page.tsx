import type { Metadata } from "next";
import { AccountClient } from "./AccountClient";

export const metadata: Metadata = {
  title: "Account & displays — Fresh First",
  description: "Create your Fresh First account and connect a fridge display.",
};

function safePath(value: string | string[] | undefined) {
  const path = Array.isArray(value) ? value[0] : value;
  return path?.startsWith("/") && !path.startsWith("//") ? path : "/";
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const device = Array.isArray(query.device) ? query.device[0] : query.device;
  return (
    <AccountClient
      nextPath={safePath(query.next)}
      deviceId={device?.trim().toUpperCase() ?? ""}
    />
  );
}
