'use client'

import { Button } from "@/components/ui/button"
import { logoutAction } from "@/lib/auth"

export function LogoutButton() {
    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={async () => await logoutAction()}
            className="text-[#E8EDDF] hover:bg-[#333533] hover:text-[#F5CB5C] border border-transparent hover:border-[#CFDBD5]/20"
        >
            Logout
        </Button>
    )
}
