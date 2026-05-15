import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const campaigns = await prisma.campaign.findMany({
    include: { ngo: true }
  });
  console.log(JSON.stringify(campaigns, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
