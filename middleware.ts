import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname

    // 0. Bypass Auth Routes and Login entirely to prevent loops
    if (path.startsWith('/auth') || path.startsWith('/login')) {
        return NextResponse.next()
    }

    // Cookie name depends on your auth implementation. 
    // Mapped to 'session_role' from lib/auth.ts
    const authRole = request.cookies.get('session_role')?.value

    // 1. Redirect authenticated users away from Public Landing (/) or Login if they already have a session
    if ((path === '/' || path === '/login') && authRole) {
        const targetPath = authRole.toLowerCase() === 'admin' ? '/admin' : '/quote/new'
        return NextResponse.redirect(new URL(targetPath, request.url))
    }

    // 2. Protected Routes
    const protectedPaths = ['/quote', '/admin', '/dashboard', '/clients'] // Added /clients based on file search
    const isProtected = protectedPaths.some(p => path.startsWith(p))

    if (isProtected && !authRole) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 3. Admin Only Route
    if (path.startsWith('/admin') && authRole?.toLowerCase() !== 'admin') {
        return NextResponse.redirect(new URL('/quote/new', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|auth|_next/static|_next/image|favicon.ico).*)'],
}
