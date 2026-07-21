import { redirect } from "next/navigation";

export default function SociosRedirect() {
  redirect("/finanzas?tab=cuentas");
}
