import { prisma } from "@/lib/prisma";
import {
  fetchRecentEvents,
  fetchRecentMessages,
  getValidAccessToken,
  isMicrosoftIntegrationConfigured,
} from "@/lib/microsoft-graph";

/**
 * §8 (reading) — pulls recent mail/calendar activity for one connected user
 * and auto-logs anything matching a known client contact's email address
 * against that company's record. No standing worker in this environment, so
 * this runs on-demand (Settings > "Sync now") rather than on a webhook —
 * swap for Graph change notifications in production.
 */
export async function syncUserOutlookData(userId: string) {
  if (!isMicrosoftIntegrationConfigured()) {
    return { synced: false, reason: "Microsoft integration not configured" };
  }

  const account = await prisma.microsoftAccount.findUnique({ where: { userId } });
  if (!account) return { synced: false, reason: "User has not connected Outlook" };

  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return { synced: false, reason: "Could not obtain a valid access token" };

  const contacts = await prisma.contact.findMany({ where: { email: { not: null } } });
  const contactByEmail = new Map(contacts.map((c) => [c.email!.toLowerCase(), c]));

  const since = (account.lastEmailSyncAt ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).toISOString();
  const messages = await fetchRecentMessages(accessToken, since);

  let emailsLogged = 0;
  for (const msg of messages) {
    const fromEmail = msg.from?.emailAddress?.address?.toLowerCase();
    if (!fromEmail) continue;
    const contact = contactByEmail.get(fromEmail);
    if (!contact) continue;

    const occurredAt = new Date(msg.receivedDateTime ?? msg.sentDateTime ?? Date.now());
    await prisma.activityLog.upsert({
      where: { externalId: msg.id },
      create: {
        companyId: contact.companyId,
        contactId: contact.id,
        userId,
        type: "EMAIL",
        subject: msg.subject,
        occurredAt,
        source: "OUTLOOK",
        direction: "incoming",
        externalId: msg.id,
      },
      update: {},
    });
    emailsLogged++;
  }

  const calSince = (account.lastCalendarSyncAt ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).toISOString();
  const events = await fetchRecentEvents(accessToken, calSince);

  let meetingsLogged = 0;
  for (const ev of events) {
    const attendeeEmail = ev.attendees
      ?.map((a) => a.emailAddress?.address?.toLowerCase())
      .find((e) => e && contactByEmail.has(e));
    if (!attendeeEmail) continue;
    const contact = contactByEmail.get(attendeeEmail)!;
    const occurredAt = new Date(ev.start?.dateTime ?? Date.now());

    await prisma.activityLog.upsert({
      where: { externalId: ev.id },
      create: {
        companyId: contact.companyId,
        contactId: contact.id,
        userId,
        type: "MEETING",
        subject: ev.subject,
        occurredAt,
        source: "OUTLOOK",
        externalId: ev.id,
      },
      update: {},
    });
    meetingsLogged++;
  }

  await prisma.microsoftAccount.update({
    where: { userId },
    data: { lastEmailSyncAt: new Date(), lastCalendarSyncAt: new Date() },
  });

  return { synced: true, emailsLogged, meetingsLogged };
}
