import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname

    // Cookie name depends on your auth implementation. 
    // Mapped to 'session_role' from lib/auth.ts
    const authRole = request.cookies.get('session_role')?.value

    // 1. Root is Public. No redirect needed.

    // 2. Protected Routes
    const protectedPaths = ['/quote', '/admin', '/dashboard'] // Add others if needed
    const isProtected = protectedPaths.some(p => path.startsWith(p))

    if (isProtected && !authRole) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 3. Admin Only Route
    if (path.startsWith('/admin') && authRole !== 'ADMIN') {
        // Decide: Redirect to login or to dashboard (if user)? 
        // For security, maybe just login, or show 403 (but middleware can just redirect)
        // Let's redirect to login for simplicity or /quote if user
        return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
