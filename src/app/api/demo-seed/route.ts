import { NextResponse } from "next/server";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createTransaction } from "@/lib/financials";
import { createClient } from "@/lib/clients";
import { createRecruitmentLead } from "@/lib/recruitment-leads";

const DEMO_USER_ID = "demo-admin";
const DEMO_USER_NAME = "Demo Admin";

async function seedFinancials() {
  if (!db) return;

  const snap = await getDocs(collection(db, "transactions"));
  if (!snap.empty) return; // Avoid duplicating if data already exists

  const today = new Date();

  const baseDate = (daysAgo: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d;
  };

  const demoTransactions = [
    {
      type: "INFLOW" as const,
      category: "CLIENT_PAYMENT" as const,
      amountNet: 5000,
      paymentMethod: "BANK_TRANSFER_BUSINESS" as const,
      description: "Website development invoice – ACME Pty Ltd",
      clientName: "ACME Pty Ltd",
      date: baseDate(3),
    },
    {
      type: "INFLOW" as const,
      category: "CLIENT_PAYMENT" as const,
      amountNet: 3200,
      paymentMethod: "CREDIT_DEBIT_CARD" as const,
      description: "Managed IT services – Smith Logistics",
      clientName: "Smith Logistics",
      date: baseDate(7),
    },
    {
      type: "INFLOW" as const,
      category: "CLIENT_PAYMENT" as const,
      amountNet: 7800,
      paymentMethod: "BANK_TRANSFER_BUSINESS" as const,
      description: "Cloud migration project – Horizon Retail",
      clientName: "Horizon Retail",
      date: baseDate(12),
    },
    {
      type: "INFLOW" as const,
      category: "INVESTMENT" as const,
      amountNet: 15000,
      paymentMethod: "BANK_TRANSFER_BUSINESS" as const,
      description: "Capital injection – Owner funds",
      date: baseDate(20),
    },
    {
      type: "OUTFLOW" as const,
      category: "MARKETING" as const,
      amountNet: 1800,
      paymentMethod: "CREDIT_DEBIT_CARD" as const,
      description: "Paid ads – Google & Facebook",
      date: baseDate(5),
    },
    {
      type: "OUTFLOW" as const,
      category: "TAX" as const,
      amountNet: 4200,
      paymentMethod: "BANK_TRANSFER_BUSINESS" as const,
      description: "Quarterly PAYG instalment",
      date: baseDate(10),
    },
    {
      type: "OUTFLOW" as const,
      category: "FRANCHISE_FEE" as const,
      amountNet: 2500,
      paymentMethod: "BANK_TRANSFER_BUSINESS" as const,
      description: "Franchise royalty fee – monthly",
      date: baseDate(15),
    },
    {
      type: "OUTFLOW" as const,
      category: "OTHER" as const,
      customCategory: "Software Subscriptions",
      amountNet: 950,
      paymentMethod: "CREDIT_DEBIT_CARD" as const,
      description: "SaaS tools – monitoring & collaboration",
      date: baseDate(8),
    },
    {
      type: "INFLOW" as const,
      category: "CLIENT_PAYMENT" as const,
      amountNet: 2600,
      paymentMethod: "BANK_TRANSFER_PERSONAL" as const,
      gstApplied: true,
      description: "One-off support – Green Farm Supplies",
      clientName: "Green Farm Supplies",
      date: baseDate(2),
    },
    {
      type: "OUTFLOW" as const,
      category: "GST" as const,
      amountNet: 3100,
      paymentMethod: "BANK_TRANSFER_BUSINESS" as const,
      description: "BAS – GST payable to ATO",
      date: baseDate(18),
    },
    {
      type: "INFLOW" as const,
      category: "CLIENT_PAYMENT" as const,
      amountNet: 4100,
      paymentMethod: "CASH_IN_HAND" as const,
      description: "Home IT support – Residential clients",
      clientName: "Residential Clients",
      date: baseDate(1),
    },
    {
      type: "OUTFLOW" as const,
      category: "OTHER" as const,
      customCategory: "Training & Development",
      amountNet: 1200,
      paymentMethod: "CREDIT_DEBIT_CARD" as const,
      description: "Staff training workshop – Cybersecurity",
      date: baseDate(6),
    },
  ];

  await Promise.all(
    demoTransactions.map((t) =>
      createTransaction({
        type: t.type,
        category: t.category,
        customCategory: (t as any).customCategory,
        amountNet: t.amountNet,
        paymentMethod: t.paymentMethod,
        gstApplied: (t as any).gstApplied,
        description: t.description,
        clientName: t.clientName,
        date: t.date,
        createdBy: DEMO_USER_ID,
        createdByName: DEMO_USER_NAME,
      })
    )
  );
}

async function seedClients() {
  if (!db) return;

  const snap = await getDocs(collection(db, "clients"));
  if (!snap.empty) return;

  const demoClients = [
    {
      firstName: "Emma",
      lastName: "Williams",
      email: "emma.williams@acme.com",
      phoneNumber: "0400 111 222",
      suburb: "Melbourne",
      postCode: "3000",
      state: "VIC" as const,
      servicesPurchased: ["Managed IT", "Cloud Migration"],
    },
    {
      firstName: "Liam",
      lastName: "Brown",
      email: "liam.brown@smithlogistics.com",
      phoneNumber: "0412 333 444",
      suburb: "Parramatta",
      postCode: "2150",
      state: "NSW" as const,
      servicesPurchased: ["Network Support"],
    },
    {
      firstName: "Olivia",
      lastName: "Nguyen",
      email: "olivia.nguyen@horizonretail.com",
      phoneNumber: "0423 555 666",
      suburb: "Brisbane",
      postCode: "4000",
      state: "QLD" as const,
      servicesPurchased: ["Cloud Migration", "Helpdesk"],
    },
    {
      firstName: "Noah",
      lastName: "Taylor",
      email: "noah.taylor@greenfarm.com",
      phoneNumber: "0434 777 888",
      suburb: "Adelaide",
      postCode: "5000",
      state: "SA" as const,
      servicesPurchased: ["Backup & Recovery"],
    },
    {
      firstName: "Ava",
      lastName: "Johnson",
      email: "ava.johnson@sunnyhomes.com",
      phoneNumber: "0455 999 000",
      suburb: "Perth",
      postCode: "6000",
      state: "WA" as const,
      servicesPurchased: ["Home IT Support"],
    },
    {
      firstName: "Ethan",
      lastName: "Martin",
      email: "ethan.martin@coastalfitness.com",
      phoneNumber: "0466 123 789",
      suburb: "Gold Coast",
      postCode: "4217",
      state: "QLD" as const,
      servicesPurchased: ["POS Support", "Networking"],
    },
    {
      firstName: "Mia",
      lastName: "Harris",
      email: "mia.harris@citylaw.com",
      phoneNumber: "0477 234 567",
      suburb: "Sydney",
      postCode: "2000",
      state: "NSW" as const,
      servicesPurchased: ["Managed IT", "Security"],
    },
    {
      firstName: "Henry",
      lastName: "Thompson",
      email: "henry.thompson@redrockmining.com",
      phoneNumber: "0488 345 678",
      suburb: "Kalgoorlie",
      postCode: "6430",
      state: "WA" as const,
      servicesPurchased: ["Remote Support"],
    },
    {
      firstName: "Isabella",
      lastName: "Clark",
      email: "isabella.clark@educationplus.edu",
      phoneNumber: "0499 456 789",
      suburb: "Canberra",
      postCode: "2600",
      state: "ACT" as const,
      servicesPurchased: ["Device Management", "Backup"],
    },
    {
      firstName: "Jack",
      lastName: "Lewis",
      email: "jack.lewis@oceanviewhotels.com",
      phoneNumber: "0401 567 890",
      suburb: "Hobart",
      postCode: "7000",
      state: "TAS" as const,
      servicesPurchased: ["Wi-Fi Management"],
    },
    {
      firstName: "Chloe",
      lastName: "Roberts",
      email: "chloe.roberts@harbourmedical.com",
      phoneNumber: "0402 678 901",
      suburb: "Newcastle",
      postCode: "2300",
      state: "NSW" as const,
      servicesPurchased: ["Clinic IT Support"],
    },
    {
      firstName: "Lucas",
      lastName: "Walker",
      email: "lucas.walker@centralcafe.com",
      phoneNumber: "0403 789 012",
      suburb: "Geelong",
      postCode: "3220",
      state: "VIC" as const,
      servicesPurchased: ["POS & Network"],
    },
  ];

  await Promise.all(
    demoClients.map((c) =>
      createClient({
        ...c,
        createdBy: DEMO_USER_ID,
        createdByName: DEMO_USER_NAME,
      })
    )
  );
}

async function seedRecruitmentLeads() {
  if (!db) return;

  const snap = await getDocs(collection(db, "recruitmentLeads"));
  if (!snap.empty) return;

  const today = new Date();
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d;
  };

  const demoLeads = [
    {
      businessName: "Outback Outfitters",
      jobLocation: "Alice Springs, NT",
      jobRole: "Business IT Support",
      businessOwnerManager: "Sarah King",
      vacancy: "1 x IT Support Technician",
      contactNo: "08 8000 1001",
      emailAddress: "sarah.king@outbackoutfitters.com",
      status: "Contacted" as const,
      priority: "High" as const,
      platform: "Seek",
      callNotes: "Initial discovery call completed. Interested in managed services.",
    },
    {
      businessName: "Harbour View Hotels",
      jobLocation: "Sydney, NSW",
      jobRole: "Web Development",
      businessOwnerManager: "Michael Chen",
      vacancy: "Website redesign + booking system integration",
      contactNo: "02 9000 2002",
      emailAddress: "michael.chen@harbourview.com",
      status: "Meeting Scheduled" as const,
      priority: "Urgent" as const,
      platform: "LinkedIn",
      callNotes: "Needs new site before peak season. Meeting booked for next week.",
    },
    {
      businessName: "Green Valley Farms",
      jobLocation: "Toowoomba, QLD",
      jobRole: "IT Remote Support",
      businessOwnerManager: "Tom Davies",
      vacancy: "Ongoing remote support for regional operations",
      contactNo: "07 7000 3003",
      emailAddress: "tom.davies@greenvalley.com",
      status: "New" as const,
      priority: "Medium" as const,
      platform: "Referral",
      callNotes: "Referred by existing client. Awaiting first call.",
    },
    {
      businessName: "Metro Dental Group",
      jobLocation: "Melbourne, VIC",
      jobRole: "Home IT Support / Assistance",
      businessOwnerManager: "Priya Patel",
      vacancy: "Clinic device support & backup",
      contactNo: "03 8000 4004",
      emailAddress: "priya.patel@metrodental.com",
      status: "Qualified" as const,
      priority: "High" as const,
      platform: "Direct Contact",
      callNotes: "Qualified lead, needs proposal for 3 locations.",
    },
    {
      businessName: "Desert Logistics",
      jobLocation: "Port Augusta, SA",
      jobRole: "Data Backup and Recovery",
      businessOwnerManager: "James Ward",
      vacancy: "Backup & DR solution for logistics systems",
      contactNo: "08 8100 5005",
      emailAddress: "james.ward@desertlogistics.com",
      status: "Follow-up Required" as const,
      priority: "Medium" as const,
      platform: "Website",
      callNotes: "Sent initial info pack. Follow-up required in 1 week.",
    },
    {
      businessName: "Coastal Fitness",
      jobLocation: "Gold Coast, QLD",
      jobRole: "Hardware Repairs and Installations",
      businessOwnerManager: "Rebecca Moore",
      vacancy: "POS and network hardware rollout",
      contactNo: "07 7100 6006",
      emailAddress: "rebecca.moore@coastalfitness.com",
      status: "Contacted" as const,
      priority: "Low" as const,
      platform: "Facebook",
      callNotes: "Early-stage chat. Budget yet to be confirmed.",
    },
    {
      businessName: "Northern Lights Education",
      jobLocation: "Darwin, NT",
      jobRole: "IT Promotion / MAC Health Check",
      businessOwnerManager: "Anthony Lee",
      vacancy: "Regular device health checks for staff Macs",
      contactNo: "08 8200 7007",
      emailAddress: "anthony.lee@northernlights.edu",
      status: "On Hold" as const,
      priority: "Medium" as const,
      platform: "Jora",
      callNotes: "Paused until new funding confirmed.",
    },
    {
      businessName: "City Legal Partners",
      jobLocation: "Sydney, NSW",
      jobRole: "Business IT Support",
      businessOwnerManager: "Angela Wright",
      vacancy: "Security hardening & ongoing support",
      contactNo: "02 9100 8008",
      emailAddress: "angela.wright@citylegal.com",
      status: "Converted" as const,
      priority: "High" as const,
      platform: "Referral",
      callNotes: "Signed 12‑month managed services agreement.",
    },
    {
      businessName: "Sunrise Aged Care",
      jobLocation: "Wollongong, NSW",
      jobRole: "IT Remote Support",
      businessOwnerManager: "Karen Holt",
      vacancy: "Remote support & training for staff",
      contactNo: "02 9200 9009",
      emailAddress: "karen.holt@sunriseagedcare.com",
      status: "New" as const,
      priority: "Low" as const,
      platform: "Indeed",
      callNotes: "Submitted enquiry via website form.",
    },
    {
      businessName: "Harbour Medical Imaging",
      jobLocation: "Newcastle, NSW",
      jobRole: "Web Development",
      businessOwnerManager: "David Scott",
      vacancy: "New site with secure portal",
      contactNo: "02 9300 1010",
      emailAddress: "david.scott@harbourimaging.com",
      status: "Follow-up Required" as const,
      priority: "Urgent" as const,
      platform: "LinkedIn",
      callNotes: "High urgency due to compliance deadline.",
    },
    {
      businessName: "Central Cafe Group",
      jobLocation: "Geelong, VIC",
      jobRole: "IT Remote Support",
      businessOwnerManager: "Sophie Turner",
      vacancy: "Multi‑site cafe IT support",
      contactNo: "03 8100 2020",
      emailAddress: "sophie.turner@centralcafe.com",
      status: "Contacted" as const,
      priority: "Medium" as const,
      platform: "Website",
      callNotes: "Interested in trial package.",
    },
  ];

  await Promise.all(
    demoLeads.map((lead, index) =>
      createRecruitmentLead({
        dateOfRecording: daysAgo(1 + index),
        platform: lead.platform,
        link: undefined,
        businessName: lead.businessName,
        jobLocation: lead.jobLocation,
        jobRole: lead.jobRole,
        businessOwnerManager: lead.businessOwnerManager,
        vacancy: lead.vacancy,
        contactNo: lead.contactNo,
        emailAddress: lead.emailAddress,
        callNotes: lead.callNotes,
        remarks: undefined,
        recap: undefined,
        tasks: undefined,
        isEmployee: false,
        employeeName: undefined,
        employeePosition: undefined,
        status: lead.status,
        priority: lead.priority,
        assignedTo: undefined,
        assignedToName: undefined,
        tags: [],
        createdBy: DEMO_USER_ID,
        createdByName: DEMO_USER_NAME,
      })
    )
  );
}

async function seedAll() {
  if (!db) {
    throw new Error("Firebase is not initialized. Check your environment variables.");
  }

  await seedFinancials();
  await seedClients();
  await seedRecruitmentLeads();
}

export async function POST() {
  try {
    await seedAll();
    return NextResponse.json({ ok: true, message: "Demo data seeded (where collections were empty)." });
  } catch (error: any) {
    console.error("Error seeding demo data:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to seed demo data" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Allow simple GET in browser for convenience in dev
  return POST();
}

