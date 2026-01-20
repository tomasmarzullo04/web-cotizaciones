import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log("Inspecting Quote table columns...")
        const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Quote';
    `
        console.log("Columns found:", result)
    } catch (e) {
        console.error("Inspection failed:", e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
