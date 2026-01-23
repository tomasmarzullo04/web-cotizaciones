
import { searchClients } from '@/lib/actions'
import { ClientsManager } from '@/components/clients/clients-manager'
import { Briefcase } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    // 1. Verify Session
    const user = await getSessionUser()
    if (!user) redirect('/login')

    const params = await searchParams
    const query = params.q || ""

    // 2. Fetch Clients (Server-Side)
    const clients = await searchClients(query)

    return (
        <div className="min-h-screen bg-[#242423] pt-24 pb-12 px-6">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* HEADLINE */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#333533] pb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-[#E8EDDF] flex items-center gap-3">
                            <Briefcase className="w-8 h-8 text-[#F5CB5C]" />
                            Cartera de Clientes
                        </h1>
                        <p className="text-[#CFDBD5] mt-2">
                            Gestiona tu agenda de contactos y empresas para cotizaciones rápidas.
                        </p>
                    </div>
                </div>

                {/* MANAGER (Search, Add, Table, Actions) */}
                <ClientsManager initialClients={clients} />

            </div>
        </div>
    )
}
