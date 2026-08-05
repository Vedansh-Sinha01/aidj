import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "password123";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const [ceo, manager, recruiterA, recruiterB] = await Promise.all([
    prisma.user.upsert({
      where: { email: "ceo@optizmglobal.com" },
      update: {},
      create: { name: "Dana Voss", email: "ceo@optizmglobal.com", passwordHash, role: "MANAGER" },
    }),
    prisma.user.upsert({
      where: { email: "manager@optizmglobal.com" },
      update: {},
      create: { name: "Priya Shah", email: "manager@optizmglobal.com", passwordHash, role: "MANAGER" },
    }),
    prisma.user.upsert({
      where: { email: "alex@optizmglobal.com" },
      update: {},
      create: { name: "Alex Rivera", email: "alex@optizmglobal.com", passwordHash, role: "RECRUITER" },
    }),
    prisma.user.upsert({
      where: { email: "jordan@optizmglobal.com" },
      update: {},
      create: { name: "Jordan Lee", email: "jordan@optizmglobal.com", passwordHash, role: "RECRUITER" },
    }),
  ]);

  const now = Date.now();
  const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000);

  // --- Companies ------------------------------------------------------------
  const acme = await prisma.company.create({
    data: {
      name: "Acme Financial Group",
      industry: "Financial Services",
      tags: ["IT Staffing", "Executive Search"],
      createdAt: daysAgo(400),
      contacts: {
        create: [
          { name: "Grace Kim", title: "VP Engineering", email: "grace.kim@acmefinancial.com", type: "HIRING_MANAGER" },
          { name: "Tom Baird", title: "HR Director", email: "tom.baird@acmefinancial.com", type: "HR" },
        ],
      },
      satisfactionNotes: {
        create: [
          { authorId: manager.id, rating: 5, note: "Great check-in — thrilled with the last two placements.", createdAt: daysAgo(20) },
          { authorId: ceo.id, rating: 4, note: "Minor concerns about time-to-fill on the backend role.", createdAt: daysAgo(70) },
        ],
      },
    },
  });

  const northwind = await prisma.company.create({
    data: {
      name: "Northwind Health",
      industry: "Healthcare",
      tags: ["Healthcare", "IT Staffing"],
      createdAt: daysAgo(200),
      contacts: {
        create: [{ name: "Renee Ortiz", title: "Talent Acquisition Manager", email: "renee.ortiz@northwindhealth.com", type: "HR" }],
      },
      satisfactionNotes: { create: [{ authorId: manager.id, rating: 4, note: "Solid partnership so far.", createdAt: daysAgo(45) }] },
    },
  });

  const dormantCo = await prisma.company.create({
    data: {
      name: "Legacy Systems Co",
      industry: "Manufacturing",
      tags: ["IT Staffing"],
      createdAt: daysAgo(500),
      contacts: { create: [{ name: "Pat Nguyen", title: "IT Director", email: "pat.nguyen@legacysystemsco.com" }] },
    },
  });

  // --- Roles ------------------------------------------------------------
  const openRole = await prisma.role.create({
    data: {
      companyId: acme.id,
      title: "Senior Backend Engineer",
      department: "Engineering",
      status: "OPEN",
      dateOpened: daysAgo(18),
      requirements: "5+ years experience, AWS certification, remote or Austin TX",
    },
  });

  const filledRole = await prisma.role.create({
    data: {
      companyId: acme.id,
      title: "Data Analyst",
      department: "Analytics",
      status: "FILLED",
      dateOpened: daysAgo(60),
      dateFilled: daysAgo(15),
      requirements: "3+ years experience, SQL certification",
    },
  });

  const nwRole = await prisma.role.create({
    data: {
      companyId: northwind.id,
      title: "Healthcare IT Project Manager",
      department: "IT",
      status: "OPEN",
      dateOpened: daysAgo(10),
      requirements: "PMP certification, 7+ years experience, onsite Seattle WA",
    },
  });

  // --- Candidates ------------------------------------------------------------
  await prisma.candidate.create({
    data: {
      roleId: openRole.id,
      name: "Sam Whitfield",
      email: "sam.whitfield@example.com",
      phone: "555-0101",
      certifications: ["AWS Certified Solutions Architect"],
      locationText: "Austin, TX",
      workArrangement: "HYBRID",
      mostRecentCompany: "Initech",
      mostRecentTitle: "Backend Engineer",
      mostRecentStart: daysAgo(1200),
      yearsOfExperience: 6,
      assignedRecruiterId: recruiterA.id,
      stage: "INTERVIEW",
      stageChangedAt: daysAgo(2),
      notes: { create: [{ authorId: recruiterA.id, body: "Strong technical interview, moving to client round.", createdAt: daysAgo(2) }] },
    },
  });

  await prisma.candidate.create({
    data: {
      roleId: openRole.id,
      name: "Morgan Ellis",
      email: "morgan.ellis@example.com",
      certifications: [],
      locationText: "Remote",
      workArrangement: "REMOTE",
      mostRecentCompany: "Globex",
      mostRecentTitle: "Software Engineer",
      yearsOfExperience: 3,
      assignedRecruiterId: recruiterA.id,
      stage: "APPLIED",
      stageChangedAt: daysAgo(5),
    },
  });

  const hired = await prisma.candidate.create({
    data: {
      roleId: filledRole.id,
      name: "Casey Brooks",
      email: "casey.brooks@example.com",
      certifications: ["Microsoft Certified: Azure Data Fundamentals"],
      locationText: "Austin, TX",
      workArrangement: "ONSITE",
      mostRecentCompany: "Umbrella Analytics",
      mostRecentTitle: "Data Analyst",
      yearsOfExperience: 4,
      assignedRecruiterId: recruiterB.id,
      stage: "HIRED",
      stageChangedAt: daysAgo(15),
    },
  });

  const placement = await prisma.placement.create({
    data: {
      candidateId: hired.id,
      roleId: filledRole.id,
      companyId: acme.id,
      startDate: daysAgo(15),
      guaranteeDays: 90,
      status: "ACTIVE",
    },
  });

  await prisma.invoice.create({
    data: {
      companyId: acme.id,
      placementId: placement.id,
      amount: 24000,
      dateInvoiced: daysAgo(14),
      dueDate: daysAgo(-16), // due in 16 days
      status: "UNPAID",
    },
  });

  await prisma.candidate.create({
    data: {
      roleId: nwRole.id,
      name: "Riley Chen",
      email: "riley.chen@example.com",
      certifications: ["PMP"],
      locationText: "Seattle, WA",
      workArrangement: "ONSITE",
      mostRecentCompany: "HealthFirst Systems",
      mostRecentTitle: "IT Project Manager",
      yearsOfExperience: 8,
      assignedRecruiterId: recruiterB.id,
      stage: "SCREENING",
      stageChangedAt: daysAgo(1),
    },
  });

  // --- Leads ------------------------------------------------------------
  await prisma.lead.createMany({
    data: [
      { companyName: "Vandelay Industries", contactName: "Jamie Cross", contactEmail: "jamie@vandelay.com", source: "LINKEDIN", stage: "NEW" },
      { companyName: "Stark Logistics", contactName: "Robin Park", contactEmail: "robin@starklogistics.com", source: "REFERRAL", stage: "CONTACTED", stageChangedAt: daysAgo(12) },
      { companyName: "Wayne Biotech", contactName: "Drew Malik", source: "NETWORKING_EVENT", stage: "QUALIFIED", stageChangedAt: daysAgo(3) },
    ],
  });

  // --- Activity logs (feeds relationship score + dormant status) ------------
  await prisma.activityLog.createMany({
    data: [
      { companyId: acme.id, type: "EMAIL", subject: "Weekly sync", occurredAt: daysAgo(3), source: "MANUAL", direction: "outgoing", userId: recruiterA.id },
      { companyId: acme.id, type: "MEETING", subject: "Quarterly review", occurredAt: daysAgo(10), source: "MANUAL", userId: manager.id },
      { companyId: northwind.id, type: "EMAIL", subject: "Candidate slate", occurredAt: daysAgo(8), source: "MANUAL", direction: "outgoing", userId: recruiterB.id },
      { companyId: dormantCo.id, type: "EMAIL", subject: "Check-in", occurredAt: daysAgo(90), source: "MANUAL", direction: "outgoing", userId: manager.id },
    ],
  });

  // --- Tickets ------------------------------------------------------------
  await prisma.ticket.create({
    data: {
      companyId: northwind.id,
      subject: "Client requested a swap for the previous candidate",
      description: "Client felt the last submission wasn't a strong culture fit.",
      type: "CLIENT_SWAP_REQUEST",
      priority: "HIGH",
      status: "IN_PROGRESS",
      assignedToId: recruiterB.id,
      createdById: manager.id,
    },
  });

  console.log("Seed complete.");
  console.log("Demo logins (all password: %s):", DEMO_PASSWORD);
  console.log("  Manager/CEO: ceo@optizmglobal.com");
  console.log("  Manager:     manager@optizmglobal.com");
  console.log("  Recruiter:   alex@optizmglobal.com");
  console.log("  Recruiter:   jordan@optizmglobal.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
