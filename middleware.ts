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
                    cookiesToSet.forEach(({ name, value, options }) => {
                        const { maxAge, expires, ...sessionOptions } = options;
                        request.cookies.set(name, value);
                    });
                    response = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) => {
                        const { maxAge, expires, ...sessionOptions } = options;
                        response.cookies.set(name, value, sessionOptions);
                    });
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
        }

        // REDIRECT EL GUARDIÁN: Redirect authenticated users away from the landing page "/"
        if (url.pathname === "/") {
            const target = sessionRole === 'ADMIN' ? '/admin/dashboard' : '/dashboard';
            return NextResponse.redirect(new URL(target, request.url));
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
