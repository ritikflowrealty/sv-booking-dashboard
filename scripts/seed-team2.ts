import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { hash } from "bcryptjs";

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const prisma = new PrismaClient({ adapter });

interface TeamLeadData {
  name: string;
  projects: string[];
  salesManagers: string[];
}

const teamLeads: TeamLeadData[] = [
  {
    name: "Sourav Kumar",
    projects: ["Pramoda", "SRH", "Sparkle Atmos", "UKN Belvedere"],
    salesManagers: ["Chetan U", "Jeevan Gowda", "Ranjith", "Sania", "Atul", "Raja", "Anuroop", "Manas", "Elbitha"],
  },
  {
    name: "Anil Kumar K",
    projects: ["PBaG", "Beyond Acres"],
    salesManagers: ["Bhaskar", "Karan", "Koushik", "Naveen"],
  },
  {
    name: "Gopal Krishan",
    projects: ["UKN Miraya"],
    salesManagers: [],
  },
  {
    name: "Vijay",
    projects: ["Sipani City"],
    salesManagers: ["Anupam", "Jeevan", "Manas", "Rajadhar", "Sanjay", "Shubham", "Supreeth", "Yogisha", "Raja", "Ranjeeth"],
  },
  {
    name: "Chethan Kumar",
    projects: ["Solea & Epitome"],
    salesManagers: ["Anmol", "Anuroop", "Chethan (Exec)", "Haroon", "Nithish", "Ridhim", "Roopa", "Shazia", "Vignesh"],
  },
];

async function main() {
  // Clean up old projects that were renamed
  const oldNames = ["Unstoppable 2.0", "Avenue Garden", "Sipani Royal Heritage", "Atmos", "Solea", "Epitome"];
  for (const name of oldNames) {
    const p = await prisma.project.findFirst({ where: { name } });
    if (p) {
      try { await prisma.project.delete({ where: { id: p.id } }); console.log(`Deleted old project: ${name}`); }
      catch { console.log(`Could not delete ${name} (may have entries)`); }
    }
  }

  // Create team leads
  for (const tl of teamLeads) {
    const firstName = tl.name.split(" ")[0].toLowerCase();
    const email = `${firstName}@flowrealty.in`;
    const password = `${firstName.charAt(0).toUpperCase()}${firstName.slice(1)}@123`;
    const hashedPw = await hash(password, 12);

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { name: tl.name, email, password: hashedPw, role: "team_lead" },
      });
      console.log(`Created team lead: ${tl.name} (${email} / ${password})`);
    } else {
      console.log(`Team lead exists: ${tl.name} (${email})`);
    }

    // Assign projects
    for (const projName of tl.projects) {
      const project = await prisma.project.findFirst({ where: { name: projName } });
      if (project) {
        const existing = await prisma.userProject.findFirst({
          where: { userId: user.id, projectId: project.id },
        });
        if (!existing) {
          await prisma.userProject.create({ data: { userId: user.id, projectId: project.id } });
          console.log(`  Assigned to: ${projName}`);
        }
      } else {
        console.log(`  WARNING: Project "${projName}" not found`);
      }
    }

    // Create sales managers under this team lead
    for (const smName of tl.salesManagers) {
      let sm = await prisma.salesManager.findFirst({
        where: { name: smName, teamLeadId: user.id },
      });
      if (!sm) {
        sm = await prisma.salesManager.create({
          data: { name: smName, teamLeadId: user.id },
        });
        console.log(`  Created SM: ${smName}`);
      }

      // Assign SM to team lead's projects
      for (const projName of tl.projects) {
        const project = await prisma.project.findFirst({ where: { name: projName } });
        if (project) {
          const existing = await prisma.salesManagerProject.findFirst({
            where: { salesManagerId: sm.id, projectId: project.id },
          });
          if (!existing) {
            await prisma.salesManagerProject.create({
              data: { salesManagerId: sm.id, projectId: project.id },
            });
          }
        }
      }
    }
  }

  console.log("\n✅ Done! Team leads and sales managers seeded.");
  console.log("\nLogin credentials:");
  for (const tl of teamLeads) {
    const firstName = tl.name.split(" ")[0].toLowerCase();
    console.log(`  ${tl.name}: ${firstName}@flowrealty.in / ${firstName.charAt(0).toUpperCase()}${firstName.slice(1)}@123`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
