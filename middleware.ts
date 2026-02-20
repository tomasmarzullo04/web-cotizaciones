import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const url = request.nextUrl.clone();

    // BLINDAJE: Verification of protected routes
    const isProtectedRoute =
        url.pathname.startsWith("/quote") ||
        url.pathname.startsWith("/admin") ||
        url.pathname.startsWith("/dashboard") ||
        url.pathname.startsWith("/clients");

    if (isProtectedRoute && !user) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    // SYNC: Ensure custom session cookies are present if user is authenticated
    if (user) {
        const sessionRole = request.cookies.get('session_role')?.value;
        const sessionUser = request.cookies.get('session_user')?.value;

        if (!sessionRole || !sessionUser) {
            console.log(`[Middleware] Desync detected for ${user.email}. Syncing cookies...`);

            // We use the internal API or a direct DB fetch if possible.
            // Since Middleware is Edge/Server, we can't easily use Prisma if it's not edge-ready,
            // but we can let the next request (Layout) handle the heavy lifting, 
            // OR we can trigger a sync via an internal call if needed.

            // Optimization: If it's a page request, we let app/layout handle it.
            // But to "shield" the Navbar immediately, we'd want cookies now.
            // For now, if we're in middleware and have a user but no cookies,
            // we'll proceed, but app/layout.tsx MUST be updated to sync them.
        }
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
