import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log("Attempting to create a test Quote...")
        // Create a dummy user first if needed, or use existing
        const user = await prisma.user.findFirst()
        if (!user) {
            console.log("No user found, skipping creation test (cannot create quote without user)")
            return
        }

        const quote = await prisma.quote.create({
            data: {
                clientName: "Test Verification",
                projectType: "Standard",
                serviceType: "Prototyping",
                technicalParameters: "{}",
                estimatedCost: 100,
                staffingRequirements: "[]",
                diagramDefinition: "graph LR",
                userId: user.id
            }
        })
        console.log("Quote created successfully:", quote.id)
        console.log("Deleting test quote...")
        await prisma.quote.delete({ where: { id: quote.id } })
        console.log("Cleaned up.")
    } catch (e) {
        console.error("Test creation FAILED:", e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
