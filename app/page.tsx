import type { Metadata } from "next";
import { FreshFirstClient } from "./FreshFirstClient";

export const metadata: Metadata = {
  title: "Fresh First — Fridge expiry tracker",
  description: "Keep the food that needs your attention at the top of the list.",
};

export default function Home() {
  return <FreshFirstClient />;
}
