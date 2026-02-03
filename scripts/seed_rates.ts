
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding Rates...')

    const rates = [
        // BI Visualization Developer
        { service: 'BI Visualization Developer', complexity: 'Jr', basePrice: 2831.11 },
        { service: 'BI Visualization Developer', complexity: 'Med', basePrice: 4128.70 },
        { service: 'BI Visualization Developer', complexity: 'Sr', basePrice: 5308.33 },
        { service: 'BI Visualization Developer', complexity: 'Expert', basePrice: 5780.19 },

        // Azure Developer
        { service: 'Azure Developer', complexity: 'Jr', basePrice: 2949.07 },
        { service: 'Azure Developer', complexity: 'Med', basePrice: 4128.70 },
        { service: 'Azure Developer', complexity: 'Sr', basePrice: 5898.15 },

        // Solution Architect
        { service: 'Solution Architect', complexity: 'Jr', basePrice: 4128.70 },
        { service: 'Solution Architect', complexity: 'Med', basePrice: 5308.33 },
        { service: 'Solution Architect', complexity: 'Sr', basePrice: 6370.00 },
        { service: 'Solution Architect', complexity: 'Expert', basePrice: 7962.50 },

        // BI Data Architect
        { service: 'BI Data Architect', complexity: 'Jr', basePrice: 4128.70 },
        { service: 'BI Data Architect', complexity: 'Med', basePrice: 5308.33 },
        { service: 'BI Data Architect', complexity: 'Sr', basePrice: 6370.00 },
        { service: 'BI Data Architect', complexity: 'Expert', basePrice: 7325.50 },

        // Data Engineer
        { service: 'Data Engineer', complexity: 'Jr', basePrice: 4128.70 },
        { service: 'Data Engineer', complexity: 'Med', basePrice: 4954.44 },
        { service: 'Data Engineer', complexity: 'Sr', basePrice: 7077.78 },
        { service: 'Data Engineer', complexity: 'Expert', basePrice: 7431.67 },

        // Data Scientist
        { service: 'Data Scientist', complexity: 'Med', basePrice: 5190.37 },
        { service: 'Data Scientist', complexity: 'Sr', basePrice: 6252.04 },
        { service: 'Data Scientist', complexity: 'Expert', basePrice: 7502.44 },

        // Data / Operations Analyst
        { service: 'Data / Operations Analyst', complexity: 'Jr', basePrice: 2831.11 },
        { service: 'Data / Operations Analyst', complexity: 'Med', basePrice: 3538.89 },
        { service: 'Data / Operations Analyst', complexity: 'Sr', basePrice: 4718.52 },
        { service: 'Data / Operations Analyst', complexity: 'Expert', basePrice: 5426.30 },

        // Project / Product Manager
        { service: 'Project / Product Manager', complexity: 'Med', basePrice: 5308.33 },
        { service: 'Project / Product Manager', complexity: 'Sr', basePrice: 6370.00 },
        { service: 'Project / Product Manager', complexity: 'Expert', basePrice: 7962.50 },

        // Business Analyst
        { service: 'Business Analyst', complexity: 'Med', basePrice: 4128.70 },
        { service: 'Business Analyst', complexity: 'Sr', basePrice: 5308.33 },

        // Low Code Developer
        { service: 'Low Code Developer', complexity: 'Jr', basePrice: 1500.00 },
        { service: 'Low Code Developer', complexity: 'Med', basePrice: 3538.00 },
        { service: 'Low Code Developer', complexity: 'Sr', basePrice: 4128.00 },
        { service: 'Low Code Developer', complexity: 'Expert', basePrice: 5308.00 },

        // Power App / Streamlit Developer
        { service: 'Power App / Streamlit Developer', complexity: 'Med', basePrice: 3538.00 },
        { service: 'Power App / Streamlit Developer', complexity: 'Sr', basePrice: 4128.00 },
    ]

    for (const r of rates) {
        // Check if exists
        const existing = await prisma.serviceRate.findFirst({
            where: {
                service: r.service,
                complexity: r.complexity,
                frequency: 'Mensual'
            }
        })

        if (existing) {
            console.log(`Updating ${r.service} ${r.complexity}...`)
            await prisma.serviceRate.update({
                where: { id: existing.id },
                data: { basePrice: r.basePrice }
            })
        } else {
            console.log(`Creating ${r.service} ${r.complexity}...`)
            await prisma.serviceRate.create({
                data: {
                    service: r.service,
                    complexity: r.complexity,
                    frequency: 'Mensual',
                    basePrice: r.basePrice,
                    multiplier: 1.0
                }
            })
        }
    }

    console.log('Done.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
