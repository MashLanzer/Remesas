import { redirect } from "next/navigation";

export default function ReportesRedirect() {
  redirect("/finanzas?tab=reportes");
}
