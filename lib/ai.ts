'use server'

export async function polishTextAction(rawText: string): Promise<string> {
    // Simulate API Latency
    await new Promise(resolve => setTimeout(resolve, 1500))

    if (!rawText || rawText.length < 5) return rawText

    // Mock AI Logic: Add professional prefixes/suffixes and expansions
    const prefixes = [
        "Implementación de una arquitectura de datos escalable orientada a",
        "Despliegue de un ecosistema analítico moderno para optimizar",
        "Solución integral de gobernanza y procesamiento de datos para",
    ]

    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)]

    return `${randomPrefix} ${rawText.toLowerCase()}. 
    
El alcance incluye la ingesta automatizada desde múltiples fuentes, procesamiento distribuido mediante Silver/Gold layers en Databricks, y visualización ejecutiva en PowerBI, asegurando cumplimiento normativo y alta disponibilidad.`
}

export async function generateMermaidUpdate(currentCode: string, prompt: string): Promise<string> {
    // Simulate API Latency
    await new Promise(resolve => setTimeout(resolve, 2000))

    let newCode = currentCode
    const p = prompt.toLowerCase()

    // Heuristic Logic for Demo
    if (p.includes("validación") || p.includes("validation")) {
        // Insert Validation Node
        if (!newCode.includes("Validation")) {
            newCode = newCode.replace(/Source\s*-->\s*Pipe/i, "Source --> Validation\n    Validation[Validación de Calidad] --> Pipe")
            newCode += "\n    style Validation fill:#f9f,stroke:#333,stroke-width:2px"
        }
    }

    if (p.includes("error") || p.includes("fallo")) {
        if (!newCode.includes("ErrorLog")) {
            newCode += "\n    Pipe -.->|Error| ErrorLog[Log de Errores]"
            newCode += "\n    style ErrorLog fill:#ffaaaa,stroke:#d00"
        }
    }

    if (p.includes("color") || p.includes("rojo") || p.includes("red")) {
        // Change Store color to red if requested
        if (p.includes("store") || p.includes("lakehouse") || p.includes("destino")) {
            newCode += "\n    style Store fill:#ff0000,color:#fff"
        } else {
            newCode += "\n    style Pipe fill:#ff0000,color:#fff"
        }
    }

    if (p.includes("kafka") || p.includes("streaming")) {
        newCode = newCode.replace(/Source\s*-->\s*Pipe/i, "Source --> Kafka[Kafka Stream]\n    Kafka --> Pipe")
    }

    // Default Fallback if no keywords matched
    if (newCode === currentCode) {
        newCode += `\n    Note[Nota IA: ${prompt.slice(0, 20)}...]`
    }

    return newCode
}
