import { redirect } from "next/navigation";

export default function HomePage() {
  // Redirect to calendar page which has proper data loading
  redirect("/calendar");
}
