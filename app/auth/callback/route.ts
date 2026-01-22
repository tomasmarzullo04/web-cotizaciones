import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const origin = requestUrl.origin

    if (code) {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data.session?.user?.email) {
            const email = data.session.user.email

            let user = null

            // 1. Check Database First
            try {
                user = await prisma.user.findUnique({
                    where: { email }
                })
            } catch (e) {
                console.error("DB Check Failed in Callback:", e)
            }

            // 2. Check Allowed List (Fallback logic mirroring lib/auth.ts)
            if (!user) {
                const ALLOWED_EMAILS: Record<string, { role: string, name: string, id: string }> = {
                    'admin@antigravity.com': { role: 'ADMIN', name: 'Admin Demo', id: 'demo-admin' },
                    'tomasmarzullo04@gmail.com': { role: 'USER', name: 'Tomas Marzullo', id: 'demo-user' },
                    'maxhigareda@thestoreintelligence.com': { role: 'USER', name: 'Max Higareda', id: 'demo-max' },
                    'viridiana@thestoreintelligence.com': { role: 'USER', name: 'Viridiana', id: 'demo-viridiana' },
                    'darold@thestoreintelligence.com': { role: 'USER', name: 'Darold', id: 'demo-darold' },
                    'liliana@thestoreintelligence.com': { role: 'USER', name: 'Liliana', id: 'demo-liliana' },
                    'loudal@thestoreintelligence.com': { role: 'USER', name: 'Loudal', id: 'demo-loudal' },
                    'ktellez@thestoreintelligence.com': { role: 'USER', name: 'Ktellez', id: 'demo-ktellez' },
                }

                const fallback = ALLOWED_EMAILS[email]

                if (fallback) {
                    // Use fallback user data
                    user = { ...fallback, email } as any
                }
            }

            if (user) {
                // Authorized! Set App Cookies
                const cookieStore = await cookies()

                // Helper to set cookie options
                // Note: HttpOnly is important for security.
                const cookieOptions = { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' }

                cookieStore.set('session_role', user.role, cookieOptions)
                cookieStore.set('session_user', user.name || user.email, cookieOptions)
                cookieStore.set('session_user_id', user.id, cookieOptions)

                // Redirect to Dashboard
                return NextResponse.redirect(`${origin}/dashboard`)
            }
        }
    }

    // Error (Invalid Code) or Unauthorized (Email not in list)
    return NextResponse.redirect(`${origin}/login?error=Unauthorized`)
}
