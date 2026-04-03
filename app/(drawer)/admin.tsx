import { ROUTES } from "@/constants/routes";
import { Redirect } from "expo-router";

/** Legacy / drawer path; primary UI is `(tabs)/admin-dashboard` so the bottom tab bar stays visible. */
export default function AdminRouteRedirect() {
  return <Redirect href={ROUTES.ADMIN} />;
}
