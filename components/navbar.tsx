import Link from 'next/link'
import { LogoutButton } from '@/components/logout-button'
import { Button } from '@/components/ui/button'

export default function Navbar({ userRole, userName }: { userRole?: string | null, userName?: string | null }) {
    // Determine target link based on role
    const getLogoHref = () => {
        if (!userRole) return '/'
        if (userRole === 'ADMIN') return '/admin/dashboard'
        return '/dashboard'
    }

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-[#242423]/80 backdrop-blur-md border-b border-[#333533] shadow-sm">
            <div className="container mx-auto px-4 sm:px-8 lg:px-16 h-16 flex items-center justify-between">

                {/* LOGO */}
                <Link
                    href={getLogoHref()}
                    className="flex items-center gap-4 group cursor-pointer"
                >
                    <img src="/logo-store.png" alt="Store Intelligence" className="h-5 w-auto object-contain" />
                    <span className="font-bold text-lg text-[#E8EDDF] tracking-tight group-hover:text-yellow-500 transition-colors duration-200">Mi Cotizador</span>
                </Link>

                {/* DYNAMIC LINKS (Logged In Only) */}
                <div className="hidden md:flex items-center gap-8">
                    {userRole && (
                        <>
                            {userRole === 'ADMIN' ? (
                                <Link href="/admin/dashboard" className="text-sm font-medium text-[#CFDBD5] hover:text-[#F5CB5C] transition-colors">Admin Board</Link>
                            ) : (
                                <>
                                    <Link href="/dashboard" className="text-sm font-medium text-[#CFDBD5] hover:text-[#F5CB5C] transition-colors">Mis Cotizaciones</Link>
                                    <Link href="/clients" className="text-sm font-medium text-[#CFDBD5] hover:text-[#F5CB5C] transition-colors">Directorio de Clientes</Link>
                                    <Link href="/quote/new" className="text-sm font-medium text-[#CFDBD5] hover:text-[#F5CB5C] transition-colors">Nueva Cotización</Link>
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* RIGHT SIDE */}
                <div className="flex items-center gap-4">
                    {userRole ? (
                        <>
                            <div className="hidden md:flex flex-col items-end mr-2">
                                <span className="text-xs font-bold text-[#E8EDDF]">{userName || 'Usuario'}</span>
                                <span className="text-[10px] text-[#CFDBD5] uppercase tracking-wider">
                                    {userRole === 'ADMIN' ? 'Admin Board' : (userRole === 'CONSULTOR' ? 'Consultor' : 'Usuario')}
                                </span>
                            </div>
                            <LogoutButton />
                        </>
                    ) : (
                        <Link href="/login">
                            <Button className="bg-[#F5CB5C] text-[#171717] hover:bg-[#E0B84C] font-black rounded-xl h-10 px-6 shadow-[0_0_15px_rgba(245,203,92,0.3)] transition-all text-xs uppercase">
                                Iniciar Sesión
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    )
}
