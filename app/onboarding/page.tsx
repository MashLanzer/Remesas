import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/data";
import { OnboardingView } from "@/components/onboarding-view";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const ctx = await getSessionContext();
  if (!ctx.userId) redirect("/login");
  // Si ya eligió rol (o es legacy sin multi-negocio), no hay nada que elegir.
  if (!ctx.needsOnboarding) redirect("/");
  return <OnboardingView />;
}
