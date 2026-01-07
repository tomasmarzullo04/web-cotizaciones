'use client'

import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

interface MermaidDiagramProps {
    chart: string
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [id] = useState(`mermaid-${Math.random().toString(36).substr(2, 9)}`)

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'base',
            themeVariables: {
                darkMode: false,
                primaryColor: '#FFFFFF',
                primaryTextColor: '#000000',
                primaryBorderColor: '#000000',
                lineColor: '#000000',
                secondaryColor: '#FFFFFF',
                tertiaryColor: '#FFFFFF',
                mainBkg: '#FFFFFF',
                nodeBorder: '#000000',
                clusterBkg: '#FFFFFF',
                clusterBorder: '#000000',
                defaultLinkColor: '#000000',
                fontFamily: 'Inter, system-ui, sans-serif',
                edgeLabelBackground: '#FFFFFF',
            },
            securityLevel: 'loose'
        })
    }, [])

    useEffect(() => {
        if (containerRef.current && chart) {
            mermaid.render(id, chart).then(({ svg }) => {
                if (containerRef.current) {
                    containerRef.current.innerHTML = svg
                }
            }).catch((err) => {
                console.error('Mermaid parsing error:', err)
                if (containerRef.current) {
                    containerRef.current.innerHTML = '<p class="text-red-500 text-xs text-center p-4">Error renderizando diagrama</p>'
                }
            })
        }
    }, [chart, id])

    return (
        <div className="w-full overflow-hidden flex justify-center items-center py-8">
            <div ref={containerRef} className="mermaid-container w-full flex justify-center scale-90 origin-top" />
        </div>
    )
}
