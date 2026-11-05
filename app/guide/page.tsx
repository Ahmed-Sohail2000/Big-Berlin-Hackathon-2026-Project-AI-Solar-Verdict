import type { Metadata } from "next";
import { GuideContent } from "@/components/guide/GuideContent";

export const metadata: Metadata = { title: "Guide | HelioSense Roof Count" };

export default function GuidePage() {
  return <GuideContent />;
}
