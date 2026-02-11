import Link from 'next/link'
import { LogoutButton } from '@/components/logout-button'
import { Button } from '@/components/ui/button'

import { Store } from 'lucide-react'

export default function Navbar({ userRole, userName }: { userRole?: string | null, userName?: string | null }) {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-[#242423]/80 backdrop-blur-md border-b border-[#333533] shadow-sm">
            <div className="container mx-auto px-6 h-16 flex items-center justify-between">

                {/* LOGO */}
                <Link
                    href={userRole === 'ADMIN' ? '/admin/dashboard' : (userRole === 'USER' || userRole === 'CONSULTOR') ? '/dashboard' : '/'}
                    className="flex items-center gap-3 group cursor-pointer"
                >
                    {/* <div className="w-8 h-8 rounded-lg bg-[#F5CB5C] flex items-center justify-center text-[#242423] font-bold text-lg group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(245,203,92,0.3)]">
                        CS
                    </div> */}
                    {/* Fallback to Icon if image fails or is missing */}
                    <div className="block">
                        <img
                            src="/logo-store.png"
                            alt="Store Intelligence"
                            className="h-8 w-auto object-contain block"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.querySelector('.fallback-icon')!.classList.remove('hidden');
                            }}
                        />
                        <Store className="fallback-icon hidden text-[#F5CB5C] w-8 h-8" />
                        {/* Since we know it's missing locally, we force the icon for now? No, user said "use component... temporarily". 
                           But user also said "He subido/te adjunto el archivo" implying it MIGHT be there in THEIR env. 
                           So the onError strategy is best. But standard img onError in React can be tricky with SSR.
                           Let's use a simpler approach: Try to load image, if not just show icon? 
                           Actually, since I can't verify the file existence in THEIR browser, I'll just put the Icon there 
                           AND the image, but hide the icon if image loads? 
                           
                           Better: Just use the `Store` icon if I am sure it's missing? 
                           User said: "Si no encuentras el archivo, usa un componente de Lucide Icon... temporalmente".
                           I DID NOT find the file.
                           So I will comment out the image and use the Icon, OR keep the image code but default to Icon?
                           User said "Asegúrate de usar la ruta /logo-store.png".
                           So I must keep the image tag.
                           
                           Let's use the onError trick.
                           Or better, I'll just use the Icon for now as requested "temporarily" BUT keeping the image tag there commented out?
                           "Asegúrate de usar la ruta /logo-store.png... Si no encuentras el archivo, usa un componente... temporalmente".
                           
                           Okay, I will implement a safe fallback.
                           
                        */}
                        <img
                            src="/logo-store.png"
                            alt="Store Intelligence"
                            className="h-8 w-auto object-contain"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const icon = document.getElementById('navbar-logo-fallback');
                                if (icon) icon.style.display = 'block';
                            }}
                        />
                        <Store id="navbar-logo-fallback" className="text-[#F5CB5C] w-8 h-8" style={{ display: 'none' }} />
                    </div>
                    {/* Wait, inline onError handles are messy. 
                       Let's just use the Store icon explicitly if I know it's missing. 
                       But the user says "El logo se ve roto actualmente" implying the image tag IS there.
                       And "Asegúrate de usar la ruta... Si no encuentras... usa un componente".
                       
                       I'll replace the <img> with a structure that handles this.
                       Actually, the cleanest way without client-side logic complexities is:
                       If I didn't find the file, I should probably just put the Icon there and maybe a commented out Image?
                       No, user wants me to use the route.
                       
                       Let's try this:
                       I will include valid code that attempts to show the image, but has the icon as fallback.
                       
                       <div className="relative flex items-center justify-center w-8 h-8">
                            <img src="/logo-store.png" alt="Store" className="h-8 w-auto object-contain absolute inset-0" onError={(e) => e.currentTarget.style.opacity = '0'} />
                            <Store className="w-8 h-8 text-[#F5CB5C] -z-10" /> 
                       </div>
                       This overlays them. If image loads, it covers icon (if image is opaque). If image fails (alt text or broken), icon is behind?
                       Transparent PNGs might show the icon through.
                       
                       Let's go with the user's specific instruction: "usa un componente... temporalmente".
                       I will use the Icon. And I will leave the image path in a comment or try to load it.
                    */ }
                    <Store className="w-8 h-8 text-[#F5CB5C]" />
                    <span className="font-bold text-lg text-[#E8EDDF] tracking-tight group-hover:text-[#F5CB5C] transition-colors duration-200">Mi Cotizador</span>
                </Link>

                {/* DYNAMIC LINKS */}
                <div className="hidden md:flex items-center gap-8">
                    {/* Guest sees nothing here, just login button on right */}

                    {(userRole === 'USER' || userRole === 'CONSULTOR') && (
                        <>
                            <Link href="/dashboard" className="text-sm font-medium text-[#CFDBD5] hover:text-[#F5CB5C] transition-colors">Mis Cotizaciones</Link>
                            <Link href="/clients" className="text-sm font-medium text-[#CFDBD5] hover:text-[#F5CB5C] transition-colors">Directorio de Clientes</Link>
                            <Link href="/quote/new" className="text-sm font-medium text-[#CFDBD5] hover:text-[#F5CB5C] transition-colors">Nueva Cotización</Link>
                        </>
                    )}

                    {userRole === 'ADMIN' && (
                        <>
                            <Link href="/admin/dashboard" className="text-sm font-medium text-[#CFDBD5] hover:text-[#F5CB5C] transition-colors">Admin Board</Link>
                        </>
                    )}
                </div>

                {/* RIGHT SIDE */}
                <div className="flex items-center gap-4">
                    {userRole ? (
                        <>
                            <div className="hidden md:flex flex-col items-end mr-2">
                                <span className="text-xs font-bold text-[#E8EDDF]">{userName || 'Usuario'}</span>
                                <span className="text-[10px] text-[#CFDBD5] uppercase tracking-wider">{userRole === 'ADMIN' ? 'Admin Board' : (userRole === 'CONSULTOR' ? 'Consultor' : 'Usuario')}</span>
                            </div>
                            <LogoutButton />
                        </>
                    ) : (
                        <div className="flex items-center gap-4">
                            <Link href="/login">
                                <Button className="bg-[#F5CB5C] text-[#171717] hover:bg-[#E0B84C] font-bold rounded-xl h-10 px-6 shadow-[0_0_15px_rgba(245,203,92,0.3)] transition-all">
                                    Iniciar Sesión
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    )
}
