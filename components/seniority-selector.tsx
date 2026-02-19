"use client"

import { useState } from 'react'
import { Plus, ShieldAlert, Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ServiceRate } from "@prisma/client"
import { toast } from "sonner"

interface SenioritySelectorProps {
    roleName: string
    roleKey: string
    capabilities: string[]
    serviceRates: ServiceRate[]
    onSelect: (level: string, price: number) => void
    defaultPrice?: number
    multipliers?: Record<string, number>
    compact?: boolean
}

export function SenioritySelector({ roleName, roleKey, capabilities, serviceRates, onSelect, defaultPrice, multipliers, compact = false }: SenioritySelectorProps) {
    const [open, setOpen] = useState(false)

    // Calculate valid options
    const options = capabilities.map(level => {
        // 1. Try to find exact rate in DB (Role + Seniority)
        const rateObj = serviceRates.find(r =>
            r.service.toLowerCase() === roleName.toLowerCase() &&
            r.complexity === level
        )

        // 2. Fallback to default logic if no DB rate
        let price = rateObj ? rateObj.basePrice : 0

        if (price === 0 && defaultPrice && multipliers) {
            const multiplier = multipliers[level] || 1.0
            price = defaultPrice * multiplier
        }

        return { level, price }
    }).filter(o => o.price > 0)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button size="icon" className={cn(
                    "rounded-full bg-[#242423] text-[#F5CB5C] border border-[#F5CB5C]/30 hover:bg-[#F5CB5C] hover:text-[#242423] transition-all",
                    compact ? "h-6 w-6" : "h-8 w-8"
                )}>
                    <Plus className={cn(compact ? "w-3 h-3" : "w-4 h-4")} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 bg-[#242423] border-[#F5CB5C] text-[#E8EDDF] p-3 shadow-xl" side="right" align="start">
                <h5 className="text-xs font-bold text-[#F5CB5C] uppercase tracking-wider mb-3 px-1 border-b border-[#333533] pb-2">
                    Seleccionar Seniority
                </h5>
                <div className="space-y-1">
                    {options.length === 0 ? (
                        <div className="text-center py-4 space-y-2">
                            <ShieldAlert className="w-6 h-6 text-red-400 mx-auto opacity-50" />
                            <p className="text-xs text-[#CFDBD5] leading-relaxed">
                                Perfil no disponible
                            </p>
                            <Badge variant="outline" className="text-[10px] border-[#333533] text-[#7C7F7C]">
                                Contactar Admin
                            </Badge>
                        </div>
                    ) : (
                        options.map(({ level, price }) => (
                            <button
                                key={level}
                                onClick={() => {
                                    onSelect(level, price)
                                    setOpen(false)
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#333533] rounded-lg text-sm transition-all group/item text-left border border-transparent hover:border-[#F5CB5C]/30"
                            >
                                <span className="font-medium flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full",
                                        level === 'Expert' ? "bg-amber-500" :
                                            level === 'Sr' ? "bg-purple-500" :
                                                level === 'Med' ? "bg-blue-500" : "bg-emerald-500"
                                    )} />
                                    {level}
                                </span>
                                <span className="text-[#F5CB5C] font-mono text-xs font-bold">${price.toLocaleString()}</span>
                            </button>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
