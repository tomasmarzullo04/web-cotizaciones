'use client'

import { Button } from "@/components/ui/button"
import { logoutAction } from "@/lib/auth"

export function LogoutButton() {
    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
                // 1. Client-Side Global Cleanup
                try {
                    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
                    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

                    // Clear Local Storage manually to be safe
                    localStorage.removeItem('sb-' + url.split('//')[1].split('.')[0] + '-auth-token') // Try to guess? No, just clear likely keys or all?
                    // Clearing ALL might be too aggressive if they have other tabs/apps? But usually fine for a single app domain.
                    localStorage.clear()
                    sessionStorage.clear()

                    if (url && key) {
                        const { createBrowserClient } = await import('@supabase/ssr')
                        const supabase = createBrowserClient(url, key)
                        const { error } = await supabase.auth.signOut({ scope: 'global' }) // CRITICAL: Kill generic sessions
                        if (error) console.error("SignOut error", error)
                    }
                } catch (e) { console.error("Client cleanup failed", e) }

                // 2. Server-Side Cleanup (Cookies)
                await logoutAction()
            }}
            className="text-[#E8EDDF] hover:bg-[#333533] hover:text-[#F5CB5C] border border-transparent hover:border-[#CFDBD5]/20"
        >
            Logout
        </Button>
    )
}
