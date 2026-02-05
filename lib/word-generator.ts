import { Document, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType, ImageRun, AlignmentType, Header, Footer, PageBreak, HorizontalPositionAlign, VerticalPositionAlign, HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType } from 'docx'
import { LOGO_NESTLE, LOGO_SI } from './logos'

// Rates for internal calculation if needed (fallback)
const RATES: Record<string, number> = {
    data_analyst: 2500,
    data_science: 5100,
    bi_developer: 4128,
    data_engineer: 4950,
    power_apps: 4000,
    react_dev: 4500,
    power_automate: 4000
}

// Helper for Base64 Type Detection
export function getDataURLType(dataURL: string): 'png' | 'jpg' | 'gif' {
    const match = dataURL.match(/^data:image\/(\w+);base64,/)
    if (match) {
        const type = match[1].toLowerCase()
        if (type === 'jpg') return 'jpg'
        if (type === 'jpeg') return 'jpg' // docx expects 'jpg'
        if (type === 'png') return 'png'
        if (type === 'gif') return 'gif'
    }
    return 'png'
}

// Helper for Base64
export function base64DataURLToUint8Array(dataURL: string): Uint8Array {
    if (!dataURL) return new Uint8Array(0)
    // Handle optional data: prefix
    const base64Only = dataURL.includes(',') ? dataURL.split(',')[1] : dataURL;
    try {
        const binaryString = atob(base64Only);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    } catch (e) {
        console.error("Base64 conversion failed", e)
        return new Uint8Array(0)
    }
}

export function createQuoteWordDoc(data: any): Document {
    // Safety Calcs (Direct Dashboard Sync)
    const displayGross = data.grossTotal || data.finalTotal
    let displayRetention = data.retentionAmount || 0
    let displayNet = data.finalTotal

    if (data.retention?.enabled && (displayRetention === 0 || !displayRetention)) {
        displayRetention = displayGross * (data.retention.percentage / 100)
        displayNet = displayGross - displayRetention
    }

    const COLOR_PRIMARY = "004B8D" // Institutional Blue
    const COLOR_TEXT = "333533"
    const COLOR_ROW_ALT = "F0F5FA" // Hex string for docx shading

    // Helper to format currency
    const fmt = (val: number) => `$${val.toLocaleString('en-US')}`

    // Helper for Clean Text
    const cleanText = (str: string) => {
        if (!str) return ""
        return str
            .replace(/Ã³/g, 'ó')
            .replace(/Ã¡/g, 'á')
            .replace(/Ã©/g, 'é')
            .replace(/Ã/g, 'í')
            .replace(/Ãº/g, 'ú')
            .replace(/Ã±/g, 'ñ')
            .replace(/Ã‘/g, 'Ñ')
    }

    // Prepare Images & Types
    const clientLogoData = data.clientLogoBase64 ? base64DataURLToUint8Array(data.clientLogoBase64) : null
    const clientType = data.clientLogoBase64 ? getDataURLType(data.clientLogoBase64) : 'png'

    const siLogoData = LOGO_SI ? base64DataURLToUint8Array(LOGO_SI) : null
    const siType = LOGO_SI ? getDataURLType(LOGO_SI) : 'png'

    const diagramData = data.diagramImage ? base64DataURLToUint8Array(data.diagramImage) : null
    const diagramType = data.diagramImage ? getDataURLType(data.diagramImage) : 'png'

    return new Document({
        sections: [{
            properties: {
                page: {
                    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } // 1 inch
                }
            },
            headers: {
                default: new Header({
                    children: [
                        // Floating Client Logo (Top Left)
                        ...(clientLogoData && clientLogoData.length > 0 ? [
                            new Paragraph({
                                children: [
                                    new ImageRun({
                                        data: clientLogoData,
                                        transformation: { width: 120, height: 60 }, // +25% size approx
                                        type: clientType,
                                        floating: {
                                            horizontalPosition: {
                                                relative: HorizontalPositionRelativeFrom.PAGE,
                                                offset: 1440 // Margin (1 inch) absolute
                                            },
                                            verticalPosition: {
                                                relative: VerticalPositionRelativeFrom.PAGE,
                                                offset: 720 // 0.5 inch absolute
                                            },
                                            wrap: { type: TextWrappingType.TIGHT },
                                            behindDocument: false
                                        }
                                    })
                                ]
                            })
                        ] : [])
                    ]
                })
            },
            footers: {
                default: new Footer({
                    children: [
                        new Paragraph({
                            children: [
                                // Confidentiality Text
                                new TextRun({
                                    text: `Confidencial - Propiedad de Store Intelligence - ID Referencia: ${data.quoteNumber ? data.quoteNumber.toString().padStart(6, '0') : '[PENDIENTE]'}`,
                                    size: 16,
                                    color: "999999"
                                }),
                                // SI Logo Right aligned (Floating for precision)
                                ...(siLogoData && siLogoData.length > 0 ? [
                                    new ImageRun({
                                        data: siLogoData,
                                        transformation: { width: 120, height: 40 },
                                        type: siType,
                                        floating: {
                                            horizontalPosition: {
                                                relative: HorizontalPositionRelativeFrom.MARGIN,
                                                align: HorizontalPositionAlign.RIGHT,
                                            },
                                            verticalPosition: {
                                                relative: VerticalPositionRelativeFrom.MARGIN,
                                                align: VerticalPositionAlign.BOTTOM,
                                            },
                                            wrap: { type: TextWrappingType.NONE },
                                            behindDocument: false
                                        }
                                    })
                                ] : [])
                            ],
                            alignment: AlignmentType.LEFT
                        })
                    ]
                })
            },
            children: [
                // === HEADER SECTION ===
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "COTIZACIÓN",
                            bold: true,
                            size: 44,
                            color: "FFFFFF"
                        })
                    ],
                    alignment: AlignmentType.RIGHT,
                    shading: { fill: COLOR_PRIMARY },
                    spacing: { before: 200, after: 400 }
                }),

                // === CLIENT INFO ===
                new Paragraph({
                    children: [new TextRun({ text: "COTIZADO A:", bold: true, size: 20, color: COLOR_PRIMARY })],
                    spacing: { before: 400, after: 200 }
                }),
                new Paragraph({ children: [new TextRun({ text: `Cliente: ${cleanText(data.clientName)}` })], spacing: { after: 100 } }),
                new Paragraph({ children: [new TextRun({ text: `Referencia Global: ${data.quoteNumber ? data.quoteNumber.toString().padStart(6, '0') : '[PENDIENTE]'}` })], spacing: { after: 100 }, style: "Heading2" }), // ID
                new Paragraph({ children: [new TextRun({ text: `Duración: ${data.durationMonths} meses` })], spacing: { after: 100 } }),
                new Paragraph({ children: [new TextRun({ text: `Tipo de Servicio: ${data.serviceType}` })], spacing: { after: 300 } }),

                // === INVESTMENT TABLE ===
                new Paragraph({
                    children: [new TextRun({ text: "DETALLE DE INVERSIÓN", bold: true, size: 20, color: COLOR_PRIMARY })],
                    spacing: { before: 400, after: 200 }
                }),

                new Table({
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "Concepto", bold: true, color: "FFFFFF" })] })],
                                    shading: { fill: COLOR_PRIMARY },
                                    borders: {
                                        top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL },
                                        left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "Mensual", bold: true, color: "FFFFFF" })] })],
                                    shading: { fill: COLOR_PRIMARY },
                                    borders: {
                                        top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL },
                                        left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL }
                                    }
                                }),
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "Total", bold: true, color: "FFFFFF" })] })],
                                    shading: { fill: COLOR_PRIMARY },
                                    borders: {
                                        top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL },
                                        left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL }
                                    }
                                })
                            ]
                        }),
                        ...(data.staffingDetails?.profiles || []).filter((p: any) => (p.count || 0) > 0).map((p: any) => {
                            const rate = p.price || p.cost || 0
                            const monthlySub = rate * (p.allocationPercentage || 100) / 100 * p.count
                            return new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph(`${p.role} (${p.seniority || 'Ssr'})`)] }),
                                    new TableCell({ children: [new Paragraph(fmt(monthlySub))] }),
                                    new TableCell({ children: [new Paragraph(fmt(monthlySub * data.durationMonths))] })
                                ]
                            })
                        }),
                        // Legacy / Fallback Roles
                        ...(
                            (data.staffingDetails?.profiles?.length || 0) === 0 ?
                                Object.entries(data.roles || {}).map(([role, count]) => {
                                    const c = count as number
                                    if (c > 0) {
                                        const rate = RATES[role] || 0
                                        if (rate > 0) {
                                            return new TableRow({
                                                children: [
                                                    new TableCell({ children: [new Paragraph(role.replace(/_/g, ' ').toUpperCase())] }),
                                                    new TableCell({ children: [new Paragraph(fmt(rate * c))] }),
                                                    new TableCell({ children: [new Paragraph(fmt(rate * c * data.durationMonths))] })
                                                ]
                                            })
                                        }
                                    }
                                    return null
                                }).filter(Boolean) : []
                        ) as TableRow[],

                        // Services
                        ...(data.l2SupportCost > 0 ? [new TableRow({ children: [new TableCell({ children: [new Paragraph("Soporte L2")] }), new TableCell({ children: [new Paragraph("10%")] }), new TableCell({ children: [new Paragraph(fmt(data.l2SupportCost * data.durationMonths))] })] })] : []),
                        ...(data.riskCost > 0 ? [new TableRow({ children: [new TableCell({ children: [new Paragraph("Fee de Gestión y Riesgo")] }), new TableCell({ children: [new Paragraph(`${((data.criticitnessLevel?.margin || 0) * 100).toFixed(0)}%`)] }), new TableCell({ children: [new Paragraph(fmt(data.riskCost * data.durationMonths))] })] })] : []),
                        ...(data.discountAmount > 0 ? [new TableRow({ children: [new TableCell({ children: [new Paragraph("Descuento Comercial")] }), new TableCell({ children: [new Paragraph(`${data.commercialDiscount || 0}%`)] }), new TableCell({ children: [new Paragraph(`-${fmt(data.discountAmount * data.durationMonths)}`)] })] })] : [])
                    ],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.SINGLE, color: "CCCCCC" },
                        bottom: { style: BorderStyle.SINGLE, color: "CCCCCC" },
                        left: { style: BorderStyle.NIL },
                        right: { style: BorderStyle.NIL },
                        insideHorizontal: { style: BorderStyle.DOTTED, color: "EEEEEE" },
                        insideVertical: { style: BorderStyle.NIL }
                    }
                }),

                // Totals Box
                new Paragraph({ children: [new TextRun({ text: "" })], spacing: { after: 300 } }),

                // Professional Dark Blue Box (fit-to-content) using a Table for better shading
                new Table({
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [
                                        new Paragraph({
                                            children: [new TextRun({ text: "TOTAL ESTIMADO: ", bold: true, color: "FFFFFF", size: 18 })],
                                            alignment: AlignmentType.RIGHT
                                        }),
                                        new Paragraph({
                                            children: [new TextRun({ text: fmt(displayGross), bold: true, color: "FFFFFF", size: 18 })],
                                            alignment: AlignmentType.RIGHT
                                        }),
                                        ...(data.retention?.enabled ? [
                                            new Paragraph({
                                                children: [new TextRun({ text: `Retención (${data.retention.percentage}%): -${fmt(displayRetention)}`, color: "FFFFFF", size: 16 })],
                                                alignment: AlignmentType.RIGHT
                                            }),
                                            new Paragraph({
                                                children: [new TextRun({ text: `INVERSIÓN NETA: ${fmt(displayNet)}`, bold: true, color: "FFFFFF", size: 20 })],
                                                alignment: AlignmentType.RIGHT
                                            })
                                        ] : [])
                                    ],
                                    shading: { fill: COLOR_PRIMARY },
                                    borders: {
                                        top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL },
                                        left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL }
                                    },
                                    width: { size: 40, type: WidthType.PERCENTAGE } // Box width
                                })
                            ]
                        })
                    ],
                    alignment: AlignmentType.RIGHT,
                    width: { size: 40, type: WidthType.PERCENTAGE }
                }),

                // Notes
                new Paragraph({ children: [new TextRun({ text: "* Valores no incluyen impuestos aplicables.", size: 16 })], spacing: { before: 200 } }),
                ...(data.retention?.enabled ? [new Paragraph({ children: [new TextRun({ text: `* Retención financiera interna del ${data.retention.percentage}% aplicada pro-forma.`, size: 16 })] })] : []),


                // === ARCHITECTURE DIAGRAM ===
                new Paragraph({ children: [new PageBreak()] }),
                ...(diagramData && diagramData.length > 0 ? [
                    new Paragraph({
                        children: [new TextRun({ text: "ARQUITECTURA DE LA SOLUCIÓN", bold: true, size: 24, color: COLOR_PRIMARY })],
                        spacing: { before: 200, after: 400 }
                    }),
                    new Paragraph({
                        children: [
                            new ImageRun({
                                data: diagramData,
                                transformation: { width: 600, height: 400 }, // Scaled
                                type: diagramType
                            })
                        ],
                        alignment: AlignmentType.CENTER
                    }),
                    // Stack
                    new Paragraph({
                        children: [new TextRun({ text: "STACK TECNOLÓGICO:", bold: true, color: COLOR_PRIMARY })],
                        spacing: { before: 200 }
                    }),
                    new Paragraph({
                        children: [new TextRun({
                            text: (data.techStack || []).map((id: string) => {
                                const techNames: Record<string, string> = {
                                    'azure': 'Azure Data Factory',
                                    'databricks': 'Azure Databricks',
                                    'synapse': 'Azure Synapse',
                                    'snowflake': 'Snowflake',
                                    'powerbi': 'Power BI',
                                    'sqlserver': 'SQL Server',
                                    'logicapps': 'Azure Logic Apps',
                                    'tableau': 'Tableau',
                                    'python': 'Python/Airflow',
                                    'n8n': 'n8n',
                                    'antigravity': 'Google Antigravity',
                                    'lovable': 'Lovable',
                                    'powerapps': 'Power Apps',
                                    'azure_df': 'Azure Data Factory',
                                    'dotnet': '.NET',
                                    'react': 'React',
                                    'sql': 'SQL',
                                    'streamlit': 'Streamlit',
                                    'datascience': 'Data Science / ML',
                                    'other': 'Otros'
                                }
                                return techNames[id] || id
                            }).join(' • '),
                            size: 18
                        })]
                    })
                ] : [
                    new Paragraph({ children: [new TextRun({ text: "[Diagrama no disponible]", italics: true })] })
                ]),


                // === TERMS AND CONDITIONS ===
                new Paragraph({ children: [new PageBreak()] }),
                new Paragraph({
                    children: [new TextRun({ text: "TÉRMINOS Y CONDICIONES", bold: true, color: COLOR_PRIMARY, size: 24 })],
                    spacing: { before: 400, after: 300 }
                }),
                ...[
                    "Propuesta Válida durante 30 días desde su emisión.",
                    "Proyecto a iniciar con Orden de Compra formal.",
                    "Costos tasados según acuerdo regional Store Intelligence.",
                    "Sustain no se incluye en espera que el requerimiento no evolucione.",
                    "Desarrollos adicionales serán cotizados por separado.",
                    "Entregables propiedad de Nestlé finalizado el proyecto.",
                    "Sprints de Pago acordados al inicio del proyecto.",
                    "Acuerdo de confidencialidad absoluto sobre datos compartidos."
                ].map(term => new Paragraph({
                    children: [new TextRun({ text: `• ${cleanText(term)}`, size: 20 })],
                    spacing: { after: 120 }
                }))
            ]
        }]
    })
}
