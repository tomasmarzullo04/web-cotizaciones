import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname

    // 1. Get Authentication State
    // Cookie name mapped to 'session_role' from lib/auth.ts
    const authRole = request.cookies.get('session_role')?.value

    // 2. Redirect authenticated users away from Public Landing (/) or Login if they already have a session
    if ((path === '/' || path === '/login') && authRole) {
        const productionDomain = 'https://cotizador.thestoreintelligence.com'
        const targetPath = authRole.toLowerCase() === 'admin' ? '/admin/dashboard' : '/quote/new'
        return NextResponse.redirect(new URL(targetPath, productionDomain))
    }

    // 2b. Redirect Admins away from Consultant entry page if they land there via direct redirect
    if (path === '/quote/new' && authRole?.toLowerCase() === 'admin') {
        const productionDomain = 'https://cotizador.thestoreintelligence.com'
        return NextResponse.redirect(new URL('/admin/dashboard', productionDomain))
    }

    // 3. Bypass Auth Flows (only for unauthenticated users)
    if (path.startsWith('/auth') || path.startsWith('/login')) {
        return NextResponse.next()
    }

    // 4. Protected Routes
    const protectedPaths = ['/quote', '/admin', '/dashboard', '/clients']
    const isProtected = protectedPaths.some(p => path.startsWith(p))

    if (isProtected && !authRole) {
        // Only redirect to login if explicitly accessing a protected route without a session
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 5. Admin Only Route
    if (path.startsWith('/admin') && authRole?.toLowerCase() !== 'admin') {
        const productionDomain = 'https://cotizador.thestoreintelligence.com'
        return NextResponse.redirect(new URL('/quote/new', productionDomain))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|auth|_next/static|_next/image|favicon.ico).*)'],
}
