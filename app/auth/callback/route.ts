import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    const productionOrigin = 'https://cotizador.thestoreintelligence.com'

    if (code) {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        cookieStore.set({ name, value, ...options })
                    },
                    remove(name: string, options: CookieOptions) {
                        cookieStore.delete({ name, ...options })
                    },
                },
            }
        )

        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                // Sync with DB to get/set Role
                const fullName = user.user_metadata?.full_name || user.email?.split('@')[0]
                const dbUser = await prisma.user.upsert({
                    where: { email: user.email! },
                    update: {},
                    create: {
                        id: user.id,
                        name: fullName,
                        email: user.email!,
                        password: '',
                        role: 'CONSULTOR',
                    }
                })

                // Set App Session Cookies for UI logic
                const cookieOptions = {
                    path: '/',
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax' as const
                }

                cookieStore.set('session_role', dbUser.role, cookieOptions)
                cookieStore.set('session_user', dbUser.name, cookieOptions)
                cookieStore.set('session_user_id', dbUser.id, cookieOptions)

                const target = dbUser.role === 'ADMIN' ? '/admin/dashboard' : '/quote/new'
                return NextResponse.redirect(`${productionOrigin}${target}`)
            }
        }
    }

    // Fallback if there's an error or no code
    return NextResponse.redirect(`${productionOrigin}/login?error=auth_callback_failed`)
}
