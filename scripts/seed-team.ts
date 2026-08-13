import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { hash } from "bcryptjs";

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const prisma = new PrismaClient({ adapter });

// First, fix projects: delete Solea and Epitome separately, create "Solea & Epitome"
// Then create team leads and sales managers

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

// Project mapping: project name -> developer name
const projectDeveloperMap: Record<string, string> = {
  "Pramoda": "Sumadhura",
  "PBaG": "PurpleBrick",
  "Beyond Acres": "Beyond Acres",
  "SRH": "Sipani Properties",
  "Sparkle Atmos": "Sparkle Realty",
  "UKN Miraya": "UKN Realty",
  "UKN Belvedere": "UKN Realty",
  "Sipani City": "Sipani Properties",
  "Solea & Epitome": "Sumadhura",
};

async function main() {
  // Step 1: Fix projects - remove separate Solea and Epitome, add combined
  // Delete old separate projects if they exist
  try {
    const oldSolea = await prisma.project.findFirst({ where: { name: "Solea" } });
    if (oldSolea) await prisma.project.delete({ where: { id: oldSolea.id } });
  } catch { /* ignore */ }
  try {
    const oldEpitome = await prisma.project.findFirst({ where: { name: "Epitome" } });
    if (oldEpitome) await prisma.project.delete({ where: { id: oldEpitome.id } });
  } catch { /* ignore */ }

  // Create/ensure all projects exist
  for (const [projectName, developerName] of Object.entries(projectDeveloperMap)) {
    let developer = await prisma.developer.findUnique({ where: { name: developerName } });
    if (!developer) {
      developer = await prisma.developer.create({ data: { name: developerName } });
      console.log(`Created developer: ${developerName}`);
    }

    const existing = await prisma.project.findFirst({
      where: { name: projectName, developerId: developer.id },
    });
    if (!existing) {
      await prisma.project.create({
        data: { name: projectName, developerId: developer.id, location: "Bangalore" },
      });
      console.log(`Created project: ${projectName}`);
    }
  }

  // Also create PBaG as "Avenue Garden" alias - actually it's already there, just rename
  // PBaG = PurpleBrick Avenue Garden - let's keep "PBaG" as the display name
  // Beyond Acres = Unstoppable 2.0 - let's rename
  const beyondProject = await prisma.project.findFirst({ where: { name: "Unstoppable 2.0" } });
  if (beyondProject) {
    await prisma.project.update({ where: { id: beyondProject.id }, data: { name: "Beyond Acres" } });
    console.log("Renamed Unstoppable 2.0 -> Beyond Acres");
  }

  const avGarden = await prisma.project.findFirst({ where: { name: "Avenue Garden" } });
  if (avGarden) {
    await prisma.project.update({ where: { id: avGarden.id }, data: { name: "PBaG" } });
    console.log("Renamed Avenue Garden -> PBaG");
  }

  // Rename Sipani Royal Heritage to SRH
  const srh = await prisma.project.findFirst({ where: { name: "Sipani Royal Heritage" } });
  if (srh) {
    await prisma.project.update({ where: { id: srh.id }, data: { name: "SRH" } });
    console.log("Renamed Sipani Royal Heritage -> SRH");
  }

  // Rename "Atmos" to "Sparkle Atmos"
  const atmos = await prisma.project.findFirst({ where: { name: "Atmos" } });
  if (atmos) {
    await prisma.project.update({ where: { id: atmos.id }, data: { name: "Sparkle Atmos" } });
    console.log("Renamed Atmos -> Sparkle Atmos");
  }

  // Step 2: Create team leads with login credentials
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
      console.log(`Team lead exists: ${tl.name} (${email} / ${password})`);
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
          console.log(`  Assigned to project: ${projName}`);
        }
      } else {
        console.log(`  WARNING: Project not found: ${projName}`);
      }
    }

    // Create sales managers
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

      // Assign SM to same projects as team lead
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

  console.log("\n✅ All team leads and sales managers seeded!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
