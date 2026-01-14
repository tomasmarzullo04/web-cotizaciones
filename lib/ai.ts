'use server'

// --- CONSTANTS & CONFIG ---

const TOOL_MAP: Record<string, { id: string, label: string, shape?: string, style?: string }> = {
    'ingesta': { id: 'Ingesta', label: 'Ingesta de Datos', shape: 'trapezoid' },
    'databricks': { id: 'DB', label: 'Azure Databricks', style: 'fill:#F5CB5C,stroke:#333,color:#000' },
    'power bi': { id: 'PBI', label: 'Power BI', style: 'fill:#F2C811,stroke:#333,color:#000' },
    'powerbi': { id: 'PBI', label: 'Power BI', style: 'fill:#F2C811,stroke:#333,color:#000' },
    'sql': { id: 'SQL', label: 'Azure SQL', shape: 'cylinder' },
    'sql azure': { id: 'SQL', label: 'Azure SQL', shape: 'cylinder' },
    'synapse': { id: 'Synapse', label: 'Azure Synapse' },
    'factory': { id: 'ADF', label: 'Data Factory' },
    'adf': { id: 'ADF', label: 'Data Factory' },
    'fabric': { id: 'Fabric', label: 'Microsoft Fabric' },
    'power apps': { id: 'PApps', label: 'Power Apps', style: 'fill:#A680FF,stroke:#333,color:#fff' },
    'powerapps': { id: 'PApps', label: 'Power Apps', style: 'fill:#A680FF,stroke:#333,color:#fff' },
    'lake': { id: 'Lake', label: 'Data Lake', shape: 'cylinder' },
    'storage': { id: 'Lake', label: 'Data Lake', shape: 'cylinder' },
    'excel': { id: 'Excel', label: 'Excel File' },
    'csv': { id: 'CSV', label: 'CSV File' },
    'api': { id: 'API', label: 'API Rest' },
    'sap': { id: 'SAP', label: 'SAP ERP' }
}

const SEQUENCE_KEYWORDS = ['luego', 'despues', 'entonces', 'a continuacion', 'finalmente', '->']
const BRANCH_KEYWORDS = ['salidas', 'caminos', 'opciones', 'ramas', 'branches']

// --- PARSER LOGIC ---

class FlowParser {
    private prompt: string
    private nodes: Map<string, string> = new Map() // ID -> Definition string
    private edges: string[] = []
    private styles: string[] = []

    // State
    private lastNodes: string[] = [] // Nodes to connect FROM
    private preBranchNodes: string[] = [] // For branching reset

    constructor(prompt: string) {
        this.prompt = prompt.toLowerCase()
    }

    private getNode(term: string): { id: string, def: string } | null {
        for (const [key, config] of Object.entries(TOOL_MAP)) {
            if (term.includes(key)) {
                const uniqueId = config.id // Simplified: reuse ID if singleton, or append random for multiples?
                // For this demo, we assume Singletons per type unless distinct context, or we can auto-increment
                // Let's use simple IDs for cleaner graphs

                let def = `${config.id}[${config.label}]`
                if (config.shape === 'cylinder') def = `${config.id}[(${config.label})]`
                if (config.shape === 'trapezoid') def = `${config.id}[/${config.label}\\]`

                if (config.style && !this.styles.includes(config.id)) {
                    this.styles.push(`style ${config.id} ${config.style}`)
                }

                return { id: config.id, def }
            }
        }
        // Generic fallback
        if (term.length > 3 && !['luego', 'el', 'la', 'los'].includes(term)) {
            const id = 'Gen_' + term.slice(0, 3).toUpperCase()
            const label = term.charAt(0).toUpperCase() + term.slice(1)
            return { id, def: `${id}[${label}]` }
        }
        return null
    }

    // HEURISTIC STREAM PARSER
    public parseStream() {
        // 1. Clean
        let p = this.prompt

        // 2. Identify Branch Checkpoints
        // "crean 2 salidas" -> Marker

        // 3. Scan for "1." "2." 
        // If present, we treat the text BEFORE the first "1." as the TRUNK.

        const firstBranchIdx = p.search(/\b1\./)

        if (firstBranchIdx !== -1) {
            // We have explicit numbering
            const trunk = p.substring(0, firstBranchIdx)
            const branchesPart = p.substring(firstBranchIdx)

            // Parse Trunk
            this.processSequence(trunk)

            // Save potential parents for branches (fan-out)
            this.preBranchNodes = [...this.lastNodes]

            // Parse Branches
            // Split by \d+\.
            const branchSegments = branchesPart.split(/\b\d+\./).filter(s => s.trim())

            const collectedEnds: string[] = []

            branchSegments.forEach(seg => {
                // RESET context to the trunk for each branch
                this.lastNodes = [...this.preBranchNodes]

                // Parse the branch content
                this.processSequence(seg)

                // Collect the ends of this branch
                collectedEnds.push(...this.lastNodes)
            })

            // After all branches, the "context" is technically the union of all ends 
            // OR undefined. Usually subsequent text "y de ahi..." attaches to the last mentioned?
            // "1. A ... 2. B -> C"
            // For now, let's set lastNodes to ALL ends (Fan-In if something follows?)
            this.lastNodes = collectedEnds

        } else {
            // Linear
            this.processSequence(p)
        }

        return this.compile()
    }

    private processSequence(text: string) {
        // Split by time/sequence markers
        // "ingesta, luego transformaciones... y de ahi..."
        const stepDelimiters = new RegExp(`\\b(${SEQUENCE_KEYWORDS.join('|')}|y de ahi|and then)\\b`, 'gi')
        const steps = text.split(stepDelimiters).filter(s => s && !s.match(stepDelimiters) && s.trim().length > 2)

        steps.forEach(step => {
            this.processStep(step)
        })
    }

    private processStep(text: string) {
        // Find tool keywords
        let foundNode: { id: string, def: string } | null = null

        // Prioritize specific matches
        // "power bi" (2 words) before "power"
        // We sort TOOL_MAP keys by length desc
        const sortedKeys = Object.keys(TOOL_MAP).sort((a, b) => b.length - a.length)

        for (const key of sortedKeys) {
            if (text.includes(key)) {
                foundNode = this.getNode(key)
                break
            }
        }

        if (foundNode) {
            // Register Node
            this.nodes.set(foundNode.id, foundNode.def)

            // Link from previous
            if (this.lastNodes.length > 0) {
                this.lastNodes.forEach(prev => {
                    if (prev !== foundNode!.id) { // Avoid self-loop
                        this.edges.push(`${prev} --> ${foundNode!.id}`)
                    }
                })
            } else {
                // Is this the first node?
                // If the graph is empty, great. If merging with existing code, we might want to attach to 'Start'?
                // For now, floating start.
            }

            // Update cursor
            this.lastNodes = [foundNode.id]
        }
    }

    private compile(): string {
        let code = 'graph TD\n'
        // Add defaults
        code += '    classDef default fill:#242423,stroke:#CFDBD5,stroke-width:2px,color:#E8EDDF;\n'
        code += '    classDef highlight fill:#F5CB5C,stroke:#333,stroke-width:2px,color:#000;\n'
        code += '    linkStyle default stroke:#CFDBD5,stroke-width:2px;\n'

        this.nodes.forEach(def => {
            code += `    ${def}\n`
        })

        this.edges.forEach(edge => {
            code += `    ${edge}\n`
        })

        this.styles.forEach(style => {
            code += `    ${style}\n`
        })

        return code
    }
}


export async function polishTextAction(rawText: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 800)) // Faster
    return rawText
}

export async function generateMermaidUpdate(currentCode: string, prompt: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1500))

    // 1. Detect if "Design Mode" (Complete overhaul)
    // Keywords: "diseña", "crea", "haz", "flujo", "arquitectura"
    const DESIGN_TRIGGERS = ['diseña', 'crea', 'haz', 'flujo', 'arquitectura', 'diagrama']
    const isDesignMode = DESIGN_TRIGGERS.some(t => prompt.toLowerCase().includes(t))

    if (isDesignMode) {
        try {
            const parser = new FlowParser(prompt)
            return parser.parseStream()
        } catch (e) {
            console.error("Parser failed", e)
            return currentCode // Fallback
        }
    }

    // 2. Fallback to simple modifications (Add/Style)
    let newCode = currentCode
    const p = prompt.toLowerCase()

    // Simple Addition Logic (Legacy Support)
    if (p.includes('agrega') || p.includes('add')) {
        // ... (Keep simple logic or just suggest using the new parser for everything?)
        // Let's assume powerful parser is better for everything mostly, 
        // BUT parser builds clean graphs. The user might want to *append* to current.
        // The current Parser implementation builds a NEW graph. 
        // TODO: Merge logic?
        // For the specific request "Diseña...", new graph is appropriate.
        // For "Agrega un nodo", we should append.

        // Quick Append Logic
        const targetRaw = p.split(' ')[1] || 'Node' 
        const id = 'Node_' + Math.floor(Math.random() * 1000)
        newCode += `\n    ${id}[${targetRaw}]`
        return newCode
    }

    return newCode
}
