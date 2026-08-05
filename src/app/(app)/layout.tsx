import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NavBar } from "@/components/NavBar";
import { ApprovalModal } from "@/components/ApprovalModal";
import { EmailTicketNudge } from "@/components/EmailTicketNudge";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar userName={session.user.name ?? session.user.email ?? "User"} userRole={session.user.role} />
      <EmailTicketNudge />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
      <ApprovalModal />
    </div>
  );
}
