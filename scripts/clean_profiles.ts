import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ALLOWED_PROFILES = [
    "BI Visualization Developer",
    "Azure Developer",
    "Solution Architect",
    "BI Data Architect",
    "Data Engineer",
    "Data Scientist",
    "Data / Operations Analyst",
    "Project / Product Manager",
    "Business Analyst",
    "Low Code Developer",
    "Power App / Streamlit Developer"
]

async function main() {
    console.log("Starting profile cleanup...")

    // 1. Get all rates
    const allRates = await prisma.serviceRate.findMany()
    console.log(`Found ${allRates.length} total rate records.`)

    // 2. Filter rates to delete
    const toDelete = allRates.filter(r => !ALLOWED_PROFILES.includes(r.service))

    if (toDelete.length === 0) {
        console.log("No obsolete profiles found.")
        return
    }

    console.log(`Deleting ${toDelete.length} obsolete rate records:`)
    toDelete.forEach(r => console.log(` - ${r.service} (${r.complexity})`))

    // 3. Delete them
    const deleteResult = await prisma.serviceRate.deleteMany({
        where: {
            id: {
                in: toDelete.map(r => r.id)
            }
        }
    })

    console.log(`Successfully deleted ${deleteResult.count} records.`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
