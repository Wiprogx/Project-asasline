import { redirect } from "next/navigation";

/** The lists now sit in the module that offers them (Settings' side menu); an old link lands on Settings. */
export default function ListsPage() {
  redirect("/settings");
}
