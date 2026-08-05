import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMicrosoftIntegrationConfigured } from "@/lib/microsoft-graph";
import { MicrosoftConnectPanel } from "@/components/MicrosoftConnectPanel";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ microsoft_connected?: string; microsoft_error?: string }>;
}) {
  const { microsoft_connected, microsoft_error } = await searchParams;
  const session = await auth();
  const account = await prisma.microsoftAccount.findUnique({ where: { userId: session!.user.id } });
  const configured = isMicrosoftIntegrationConfigured();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Your account and integrations</p>
      </div>

      {microsoft_connected && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-3">
          Outlook account connected.
        </p>
      )}
      {microsoft_error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
          Could not connect your Microsoft account. Please try again.
        </p>
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900">Outlook & Microsoft Calendar</h2>
        <p className="text-sm text-slate-500 mt-1">
          Connect your own Microsoft account (per-user, not shared) so emails and meetings with known client
          contacts are automatically logged, and so you can send email from inside the app.
        </p>

        {!configured ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3 mt-3">
            This server doesn&apos;t have Microsoft Graph credentials configured yet
            (<code>MICROSOFT_CLIENT_ID</code> / <code>MICROSOFT_CLIENT_SECRET</code>). See the README for setup —
            an admin needs to register an app in Azure AD first.
          </p>
        ) : (
          <MicrosoftConnectPanel connected={Boolean(account)} email={account?.email} />
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900">Account</h2>
        <p className="text-sm text-slate-600 mt-1">{session!.user.name}</p>
        <p className="text-sm text-slate-500">{session!.user.email}</p>
        <p className="text-xs text-slate-400 mt-1">
          Role: {session!.user.role === "MANAGER" ? "Manager / CEO" : "Recruiter"}
        </p>
      </div>
    </div>
  );
}
