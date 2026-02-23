"use client"

import { useState } from 'react'
import { Plus, ShieldAlert, Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ServiceRate } from "@prisma/client"
import { toast } from "sonner"

interface SenioritySelectorProps {
    roleName: string
    roleKey: string
    capabilities: string[]
    serviceRates: ServiceRate[]
    onSelect: (level: string, price: number, allocation: number) => void
    defaultPrice?: number
    multipliers?: Record<string, number>
    compact?: boolean
}

export function SenioritySelector({ roleName, roleKey, capabilities, serviceRates, onSelect, defaultPrice, multipliers, compact = false }: SenioritySelectorProps) {
    const [open, setOpen] = useState(false)
    const [allocation, setAllocation] = useState(100)

    // Calculate valid options
    // Standardize seniority order
    const priority = ['Trainee', 'Jr', 'Junior', 'Ssr', 'Semisenior', 'Med', 'Sr', 'Senior', 'Expert', 'Lead', 'Manager'];

    // Sort function
    const sortLevels = (a: { level: string }, b: { level: string }) => {
        const idxA = priority.findIndex(p => p.toLowerCase() === a.level.toLowerCase());
        const idxB = priority.findIndex(p => p.toLowerCase() === b.level.toLowerCase());
        // If not found in priority (e.g. unknown), put at end
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    };

    // 1. Get rates from DB strictly
    const dbOptions = serviceRates
        .filter(r => r.service.toLowerCase() === roleName.toLowerCase())
        .map(r => ({ level: r.complexity, price: r.basePrice }))
        .sort(sortLevels);

    // 2. Determine final options
    // If DB has rates, use ONLY DB rates. If empty, fallback to calculated defaults.
    let options = dbOptions.length > 0
        ? dbOptions
        : capabilities.map(level => {
            const multiplier = multipliers?.[level] || 1.0
            return {
                level,
                price: (defaultPrice || 0) * multiplier
            }
        }).filter(o => o.price > 0);

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
                        <>
                            {/* Allocation Slider Section */}
                            <div className="px-1 py-3 mb-2 border-b border-[#333533]/50">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-bold text-[#CFDBD5] uppercase tracking-wider">Asignación</span>
                                    <div className="relative flex items-center gap-1">
                                        <Input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={allocation === 0 ? '' : allocation.toString()}
                                            onChange={(e) => {
                                                const valStr = e.target.value.replace(/[^0-9]/g, '')
                                                if (valStr === '') {
                                                    setAllocation(0)
                                                    return
                                                }
                                                const val = parseInt(valStr, 10)
                                                if (!isNaN(val)) {
                                                    setAllocation(Math.min(100, val))
                                                }
                                            }}
                                            onBlur={() => {
                                                if (allocation < 1) setAllocation(1)
                                            }}
                                            className="w-16 h-7 text-center bg-[#F5CB5C]/10 border-[#F5CB5C]/30 text-[#F5CB5C] font-mono font-bold text-xs p-0 focus-visible:ring-1 focus-visible:ring-[#F5CB5C] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span className="text-[10px] font-bold text-[#F5CB5C]">%</span>
                                    </div>
                                </div>
                                <Slider
                                    defaultValue={[100]}
                                    max={100}
                                    min={1}
                                    step={1}
                                    value={[allocation || 1]}
                                    onValueChange={(vals) => setAllocation(vals[0])}
                                    className="my-5 cursor-pointer"
                                // Custom colors for visibility inside SenioritySelector
                                />
                                <style jsx global>{`
                                    [data-slot="slider-track"] { background-color: #333533 !important; }
                                    [data-slot="slider-range"] { background-color: #F5CB5C !important; }
                                `}</style>
                                <div className="flex justify-between text-[8px] text-[#7C7F7C] font-bold uppercase tracking-tighter">
                                    <span>Part-Time</span>
                                    <span>Full-Time</span>
                                </div>
                            </div>

                            {options.map(({ level, price }) => {
                                const finalPrice = price * (allocation / 100)
                                return (
                                    <button
                                        key={level}
                                        onClick={() => {
                                            onSelect(level, price, allocation)
                                            setOpen(false)
                                            // Reset allocation for next time? Or keep? 
                                            // User usually wants to reset to 100 for next profile
                                            setAllocation(100)
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
                                        <span className="text-[#F5CB5C] font-mono text-xs font-bold">${finalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                    </button>
                                )
                            })}
                        </>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
