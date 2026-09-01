import type { Metadata } from "next";
import { DisplayClient } from "./DisplayClient";

export const metadata: Metadata = {
  title: "Fridge display — Fresh First",
  description: "A glanceable list of the food that expires first.",
};

export default function DisplayPage() {
  return <DisplayClient />;
}
