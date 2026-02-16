import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')

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
            const role = user?.user_metadata?.role

            const target = role === 'ADMIN' ? '/admin/dashboard' : '/quote/new'

            // Force absolute URL to standardized production domain
            const productionOrigin = 'https://cotizador.thestoreintelligence.com'
            return NextResponse.redirect(`${productionOrigin}${target}`)
        }
    }

    // Fallback if there's an error or no code
    return NextResponse.redirect(`https://cotizador.thestoreintelligence.com/login?error=auth_callback_failed`)
}
