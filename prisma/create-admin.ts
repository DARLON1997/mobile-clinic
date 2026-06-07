import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const hash = await bcrypt.hash("Darlon@2026", 12)

  const user = await prisma.user.upsert({
    where: { email: "darlonelenga6@gmail.com" },
    update: { role: "SUPER_ADMIN", passwordHash: hash, isActive: true },
    create: {
      email: "darlonelenga6@gmail.com",
      passwordHash: hash,
      phone: "+242000000000",
      role: "SUPER_ADMIN",
      isActive: true,
    },
  })

  console.log("✅ SUPER_ADMIN créé :", user.email)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
