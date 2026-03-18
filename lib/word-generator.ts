import { Document, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType, ImageRun, AlignmentType, Header, Footer, PageBreak, HorizontalPositionAlign, VerticalPositionAlign, HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType, PageNumber } from 'docx'
import { LOGO_NESTLE, LOGO_SI } from './logos'
import { DICTIONARY, Language, DictionaryKey } from './translations'

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

const ROLE_CONFIG: Record<string, { label: string }> = {
    bi_visualization_developer: { label: "BI Visualization Developer" },
    azure_developer: { label: "Azure Developer" },
    solution_architect: { label: "Solution Architect" },
    bi_data_architect: { label: "BI Data Architect" },
    data_engineer: { label: "Data Engineer" },
    data_scientist: { label: "Data Scientist" },
    data_operations_analyst: { label: "Data / Operations Analyst" },
    project_product_manager: { label: "Project / Product Manager" },
    business_analyst: { label: "Business Analyst" },
    low_code_developer: { label: "Low Code Developer" },
    power_app_streamlit_developer: { label: "Power App / Streamlit Developer" }
}

// Helper for Base64 Type Detection
export function getDataURLType(dataURL: string): 'png' | 'jpg' | 'gif' {
    const match = dataURL.match(/^data:image\/(\w+);base64,/)
    if (match) {
        const type = match[1].toLowerCase()
        if (type === 'jpg') return 'jpg'
        if (type === 'jpeg') return 'jpg'
        if (type === 'png') return 'png'
        if (type === 'gif') return 'gif'
    }
    return 'png'
}

// Helper for Base64 to Uint8Array (Node.js optimized)
export function base64DataURLToUint8Array(dataURL: string): Uint8Array {
    if (!dataURL) return new Uint8Array(0)
    // Handle optional data: prefix
    const base64Only = dataURL.includes(',') ? dataURL.split(',')[1] : dataURL;
    try {
        return new Uint8Array(Buffer.from(base64Only, 'base64'));
    } catch (e) {
        console.error("Base64 conversion failed", e)
        return new Uint8Array(0)
    }
}

export function createQuoteWordDoc(data: any, lang: Language = 'ES'): Document {
    const t = (key: DictionaryKey) => DICTIONARY[lang][key] || DICTIONARY['ES'][key] || key
    
    const isAnnual = data.viewMode === 'annual'
    const multiplier = isAnnual ? 12 : 1
    const currencyCode = data.currency || 'USD'
    const rateMultiplier = data.exchangeRate || 1.0

    // Match PDF formatting logic exactly
    const fmt = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
            currencyDisplay: 'code',
            minimumFractionDigits: 2
        }).format(amount * rateMultiplier)
    }

    const COLOR_PRIMARY = "004B8D" // Institutional Blue
    const COLOR_TEXT = "454545"
    const COLOR_CHARCOAL = "333533"
    const COLOR_ROW_ALT = "F0F5FA" // Hex string for docx shading

    // Helper for Clean Text
    const cleanText = (str: string) => {
        if (!str) return ""
        return str
            .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, "")
            .replace(/Ã³/g, 'ó')
            .replace(/Ã¡/g, 'á')
            .replace(/Ã©/g, 'é')
            .replace(/Ã/g, 'í')
            .replace(/Ãº/g, 'ú')
            .replace(/Ã±/g, 'ñ')
            .replace(/Ã‘/g, 'Ñ')
    }

    // Safety Calcs (Direct Dashboard Sync)
    const displayGross = (data.grossTotal || data.finalTotal) * multiplier
    let displayRetention = (data.retentionAmount || 0) * multiplier
    let displayNet = data.finalTotal * multiplier

    if (data.retention?.enabled && (displayRetention === 0 || !displayRetention)) {
        displayRetention = displayGross * (data.retention.percentage / 100)
        displayNet = displayGross - displayRetention
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
                    margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } // 20mm (~0.8 inch)
                }
            },
            headers: {
                default: new Header({
                    children: [
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: {
                                top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL },
                                left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL },
                                insideHorizontal: { style: BorderStyle.NIL }, insideVertical: { style: BorderStyle.NIL }
                            },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            children: [
                                                ...(clientLogoData && clientLogoData.length > 0 ? [
                                                    new Paragraph({
                                                        children: [
                                                            new ImageRun({
                                                                data: clientLogoData,
                                                                transformation: { width: 100, height: 40 }, // Scaled
                                                                type: clientType
                                                            })
                                                        ]
                                                    })
                                                ] : [
                                                    new Paragraph({
                                                        children: [new TextRun({ text: cleanText(data.clientName), bold: true, color: COLOR_PRIMARY, size: 24 })]
                                                    })
                                                ])
                                            ],
                                            verticalAlign: VerticalPositionAlign.CENTER,
                                            width: { size: 50, type: WidthType.PERCENTAGE }
                                        }),
                                        new TableCell({
                                            children: [
                                                new Paragraph({
                                                    children: [
                                                        new TextRun({
                                                            text: lang === 'PT' ? "COTAÇÃO" : lang === 'EN' ? "QUOTE" : "COTIZACIÓN",
                                                            bold: true,
                                                            size: 40,
                                                            color: "FFFFFF"
                                                        })
                                                    ],
                                                    alignment: AlignmentType.RIGHT,
                                                    shading: { fill: COLOR_PRIMARY }
                                                }),
                                                new Paragraph({
                                                    children: [
                                                        new TextRun({
                                                            text: data.quoteNumber ? `#${data.quoteNumber.toString().padStart(6, '0')}` : "#000000",
                                                            size: 20,
                                                            color: COLOR_CHARCOAL
                                                        })
                                                    ],
                                                    alignment: AlignmentType.RIGHT
                                                })
                                            ],
                                            verticalAlign: VerticalPositionAlign.TOP,
                                            width: { size: 50, type: WidthType.PERCENTAGE }
                                        })
                                    ]
                                })
                            ]
                        }),
                        // Divider Line
                        new Paragraph({
                            children: [new TextRun({ text: "", size: 2 })],
                            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR_PRIMARY } },
                            spacing: { after: 200 }
                        })
                    ]
                })
            },
            footers: {
                default: new Footer({
                    children: [
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: {
                                top: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" }, bottom: { style: BorderStyle.NIL },
                                left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL },
                                insideHorizontal: { style: BorderStyle.NIL }, insideVertical: { style: BorderStyle.NIL }
                            },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            children: [
                                                new Paragraph({
                                                    children: [
                                                        new TextRun({
                                                            text: `Store Intelligence | ${lang === 'EN' ? 'Confidential' : 'Confidencial'} | ${lang === 'EN' ? 'Page' : 'Pág.'} `,
                                                            size: 14,
                                                            color: "999999"
                                                        }),
                                                        new TextRun({
                                                            children: [PageNumber.CURRENT],
                                                            size: 14,
                                                            color: "999999"
                                                        })
                                                    ]
                                                }),
                                                new Paragraph({
                                                    children: [new TextRun({ text: lang === 'PT' ? 'Proposta Comercial SI' : lang === 'EN' ? 'SI Commercial Proposal' : 'Propuesta Comercial SI', size: 12, color: "999999" })]
                                                })
                                            ],
                                            width: { size: 70, type: WidthType.PERCENTAGE }
                                        }),
                                        new TableCell({
                                            children: [
                                                ...(siLogoData && siLogoData.length > 0 ? [
                                                    new Paragraph({
                                                        children: [
                                                            new ImageRun({
                                                                data: siLogoData,
                                                                transformation: { width: 80, height: 30 },
                                                                type: siType
                                                            })
                                                        ],
                                                        alignment: AlignmentType.RIGHT
                                                    })
                                                ] : [])
                                            ],
                                            width: { size: 30, type: WidthType.PERCENTAGE }
                                        })
                                    ]
                                })
                            ]
                        })
                    ]
                })
            },
            children: [
                // === CONTACT INFO SECTION ===
                new Paragraph({
                    children: [
                        new TextRun({ text: lang === 'EN' ? "QUOTED TO:" : lang === 'PT' ? "COTADO PARA:" : "COTIZADO A:", bold: true, size: 18, color: COLOR_PRIMARY }),
                        new TextRun({ text: "\t\t\t\t\t\t\t" }), // Tab for spacing
                        new TextRun({ text: lang === 'EN' ? "QUOTE DETAILS:" : lang === 'PT' ? "DETALHES DA COTAÇÃO:" : "DETALLES DE COTIZACIÓN:", bold: true, size: 18, color: COLOR_PRIMARY })
                    ],
                    spacing: { before: 200, after: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: cleanText(data.clientName), bold: true, size: 22, color: COLOR_CHARCOAL }),
                        new TextRun({ text: "\t\t\t\t\t\t\t" }),
                        new TextRun({ text: `${t('date')}: ${new Date().toLocaleDateString(lang === 'EN' ? 'en-US' : lang === 'PT' ? 'pt-BR' : 'es-ES')}`, size: 18, color: COLOR_TEXT })
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: cleanText(data.clientContact?.name || ""), size: 18, color: COLOR_TEXT }),
                        new TextRun({ text: "\t\t\t\t\t\t\t" }),
                        new TextRun({ text: `${t('consultant')}: ${cleanText(data.clientContact?.areaLeader || (lang === 'EN' ? "Sales Team" : lang === 'PT' ? "Equipe Comercial" : "Equipo Comercial"))}`, size: 18, color: COLOR_TEXT })
                    ],
                    spacing: { after: 400 }
                }),

                // === STRATEGIC OBJECTIVE ===
                new Paragraph({
                    children: [new TextRun({ text: t('strategic_objective').toUpperCase(), bold: true, size: 20, color: COLOR_PRIMARY })],
                    spacing: { after: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: data.serviceType === 'Project'
                                ? (lang === 'EN' ? "Design and implementation of an end-to-end technological solution, guaranteeing scalability and alignment with regional standards." : lang === 'PT' ? "Design e implementação de uma solução tecnológica de ponta a ponta, garantindo escalabilidade e alinhamento com os padrões regionais." : "Diseño e implementación de una solución tecnológica punta a punta, garantizando escalabilidad y alineación con los estándares regionales de Nestlé.")
                                : data.serviceType === 'Sustain'
                                    ? (lang === 'EN' ? "Operational continuity and technological evolution of existing digital assets, ensuring performance and compliance with business KPIs." : lang === 'PT' ? "Continuidade operacional e evolução tecnológica de ativos digitais existentes, garantindo performance e conformidade com os KPIs de negócio." : "Continuidad operativa y evolución tecnológica de activos digitales existentes, asegurando performance y cumplimiento de KPIs de negocio.")
                                    : (lang === 'EN' ? "Technical capacity building through specialized talent integrated into on-demand work cells." : lang === 'PT' ? "Fortalecimento de capacidades técnicas através de talento especializado integrado em células de trabalho sob demanda." : "Fortalecimiento de capacidades técnicas a través de talento especializado integrado en células de trabajo bajo demanda."),
                            size: 19,
                            color: COLOR_TEXT
                        })
                    ],
                    spacing: { after: 400 }
                }),

                // === Executive Summary (AI Block) ===
                ...(data.description && data.description.trim() ? [
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: {
                            top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL },
                            left: { style: BorderStyle.SINGLE, size: 24, color: COLOR_PRIMARY }, right: { style: BorderStyle.NIL },
                            insideHorizontal: { style: BorderStyle.NIL }, insideVertical: { style: BorderStyle.NIL }
                        },
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [
                                            new Paragraph({
                                                children: [new TextRun({ text: cleanText(data.description), italics: true, size: 17, color: COLOR_TEXT })],
                                                spacing: { before: 100, after: 100 }
                                            })
                                        ],
                                        shading: { fill: COLOR_ROW_ALT },
                                        margins: { left: 240, right: 240 }
                                    })
                                ]
                            })
                        ]
                    }),
                    new Paragraph({ children: [new TextRun({ text: "" })], spacing: { after: 200 } })
                ] : []),

                // === INVESTMENT TABLE ===
                new Paragraph({
                    children: [new TextRun({ text: t('investment_detail').toUpperCase(), bold: true, size: 20, color: COLOR_PRIMARY })],
                    spacing: { before: 200, after: 100 }
                }),

                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        // Header
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: lang === 'EN' ? "CONCEPT / PROFILE" : lang === 'PT' ? "CONCEITO / PERFIL" : "CONCEPTO / PERFIL", bold: true, color: "FFFFFF", size: 18 })] })],
                                    shading: { fill: COLOR_PRIMARY },
                                    verticalAlign: VerticalPositionAlign.CENTER,
                                    margins: { left: 120 }
                                }),
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: lang === 'EN' ? "QTY." : lang === 'PT' ? "QTD." : "CANT.", bold: true, color: "FFFFFF", size: 18 })], alignment: AlignmentType.CENTER })],
                                    shading: { fill: COLOR_PRIMARY },
                                    width: { size: 15, type: WidthType.PERCENTAGE }
                                }),
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: t('total_monthly').toUpperCase(), bold: true, color: "FFFFFF", size: 18 })], alignment: AlignmentType.RIGHT })],
                                    shading: { fill: COLOR_PRIMARY },
                                    width: { size: 20, type: WidthType.PERCENTAGE },
                                    margins: { right: 120 }
                                }),
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: isAnnual ? t('annual_total').toUpperCase() : (lang === 'EN' ? "TOTAL" : lang === 'PT' ? "TOTAL" : "TOTAL"), bold: true, color: "FFFFFF", size: 18 })], alignment: AlignmentType.RIGHT })],
                                    shading: { fill: COLOR_PRIMARY },
                                    width: { size: 25, type: WidthType.PERCENTAGE },
                                    margins: { right: 120 }
                                })
                            ]
                        }),

                        // Sustain Base Service
                        ...(data.serviceType === 'Sustain' && (data.servicesCost || 0) > 0 ? [
                            new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${lang === 'EN' ? 'Service Complexity' : lang === 'PT' ? 'Complexidade do Serviço' : 'Complejidad del Servicio'} (Clase ${data.criticitnessLevel?.label || 'S1'})`, size: 17 })] })], margins: { left: 120 } }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: lang === 'EN' ? "FIXED" : lang === 'PT' ? "FIXO" : "FIJO", size: 17 })], alignment: AlignmentType.CENTER })] }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmt(data.servicesCost || 0), size: 17 })], alignment: AlignmentType.RIGHT })], margins: { right: 120 } }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmt((data.servicesCost || 0) * (isAnnual ? 12 : data.durationMonths)), size: 17 })], alignment: AlignmentType.RIGHT })], margins: { right: 120 } })
                                ]
                            })
                        ] : []),

                        // Profiles
                        ...(data.staffingDetails?.profiles || []).filter((p: any) => (p.count || 0) > 0).map((p: any) => {
                            const rate = p.price || p.cost || 0
                            const allocation = (p.allocationPercentage ?? 100) / 100
                            const monthlySub = rate * allocation * p.count

                            // Requested format: Role Seniority (%)
                            const seniorityStr = p.seniority || 'Ssr'
                            const allocationSuffix = (p.allocationPercentage && p.allocationPercentage < 100) ? ` (${p.allocationPercentage}%)` : ""
                            const fullProfileLabel = `${p.role} ${seniorityStr}${allocationSuffix}`

                            const rowMonthly = monthlySub
                            const rowTotal = data.viewMode === 'annual' ? monthlySub * 12 : monthlySub * (data.durationMonths || 1)

                            return new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fullProfileLabel, size: 17 })] })], margins: { left: 120 } }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${p.count}`, size: 17 })], alignment: AlignmentType.CENTER })] }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmt(rowMonthly), size: 17 })], alignment: AlignmentType.RIGHT })], margins: { right: 120 } }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmt(rowTotal), size: 17 })], alignment: AlignmentType.RIGHT })], margins: { right: 120 } })
                                ]
                            })
                        }),

                        // Surcharges
                        ...(data.l2SupportCost > 0 ? [
                            new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: lang === 'EN' ? "L2 Support" : "Soporte L2", size: 17 })] })], margins: { left: 120 } }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "10%", size: 17 })], alignment: AlignmentType.CENTER })] }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmt(data.l2SupportCost), size: 17 })], alignment: AlignmentType.RIGHT })], margins: { right: 120 } }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmt(data.l2SupportCost * (isAnnual ? 12 : data.durationMonths)), size: 17 })], alignment: AlignmentType.RIGHT })], margins: { right: 120 } })
                                ]
                            })
                        ] : []),

                        ...(data.riskCost > 0 ? [
                            new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: data.serviceType === 'Sustain' ? t('weekend_usage') : t('risk_management'), size: 17 })] })], margins: { left: 120 } }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: data.serviceType === 'Sustain' ? "1.5% Base" : `${((data.criticitnessLevel?.margin || 0) * 100).toFixed(0)}%`, size: 17 })], alignment: AlignmentType.CENTER })] }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmt(data.riskCost), size: 17 })], alignment: AlignmentType.RIGHT })], margins: { right: 120 } }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmt(data.riskCost * (isAnnual ? 12 : data.durationMonths)), size: 17 })], alignment: AlignmentType.RIGHT })], margins: { right: 120 } })
                                ]
                            })
                        ] : []),

                        ...(data.discountAmount > 0 ? [
                            new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t('commercial_discount'), size: 17 })] })], margins: { left: 120 } }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${data.commercialDiscount || 0}%`, size: 17 })], alignment: AlignmentType.CENTER })] }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `-${fmt(data.discountAmount)}`, size: 17 })], alignment: AlignmentType.RIGHT })], margins: { right: 120 } }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `-${fmt(data.discountAmount * (isAnnual ? 12 : data.durationMonths))}`, size: 17 })], alignment: AlignmentType.RIGHT })], margins: { right: 120 } })
                                ]
                            })
                        ] : [])
                    ],
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
                        bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
                        left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL },
                        insideHorizontal: { style: BorderStyle.DOTTED, size: 2, color: "EEEEEE" },
                        insideVertical: { style: BorderStyle.NIL }
                    }
                }),

                // === TOTALS BLOCK ===
                new Paragraph({ spacing: { before: 200 } }),
                new Table({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    alignment: AlignmentType.RIGHT,
                    borders: {
                        top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL },
                        left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL },
                        insideHorizontal: { style: BorderStyle.NIL }, insideVertical: { style: BorderStyle.NIL }
                    },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [
                                        new Paragraph({
                                            children: [new TextRun({ text: isAnnual ? (lang === 'EN' ? "ANNUALIZED: " : lang === 'PT' ? "ANUALIZADO: " : "ANUALIZADO: ") : (lang === 'EN' ? "ESTIMATED TOTAL: " : lang === 'PT' ? "TOTAL ESTIMADO: " : "TOTAL ESTIMADO: "), bold: true, color: "FFFFFF", size: 18 })],
                                            alignment: AlignmentType.RIGHT
                                        }),
                                        new Paragraph({
                                            children: [new TextRun({ text: fmt(displayGross), bold: true, color: "FFFFFF", size: 22 })],
                                            alignment: AlignmentType.RIGHT
                                        }),
                                        ...(data.retention?.enabled ? [
                                            new Paragraph({
                                                children: [new TextRun({ text: `${lang === 'EN' ? 'Retention' : lang === 'PT' ? 'Retenção' : 'Retención'} (${data.retention.percentage}%): -${fmt(displayRetention)}`, color: "FFFFFF", size: 16 })],
                                                alignment: AlignmentType.RIGHT,
                                                spacing: { before: 50 }
                                            }),
                                            new Paragraph({
                                                children: [new TextRun({ text: isAnnual ? (lang === 'EN' ? "ANNUAL INVESTMENT" : lang === 'PT' ? "INVESTIMENTO ANUAL" : "INVERSIÓN ANUAL") : (lang === 'EN' ? "NET INVESTMENT" : lang === 'PT' ? "INVESTIMENTO LÍQUIDO" : "INVERSIÓN NETA"), bold: true, color: "FFFFFF", size: 24 })],
                                                alignment: AlignmentType.RIGHT,
                                                spacing: { before: 50 }
                                            }),
                                            new Paragraph({
                                                children: [new TextRun({ text: fmt(displayNet), bold: true, color: "FFFFFF", size: 26 })],
                                                alignment: AlignmentType.RIGHT
                                            })
                                        ] : [])
                                    ],
                                    shading: { fill: COLOR_PRIMARY },
                                    margins: { top: 120, bottom: 120, right: 120, left: 120 }
                                })
                            ]
                        })
                    ]
                }),

                // === SUSTAIN SPECIFIC DETAILS ===
                ...(data.serviceType === 'Sustain' && data.sustainDetails ? [
                    new Paragraph({ children: [new PageBreak()] }),
                    new Paragraph({
                        children: [new TextRun({ text: lang === 'EN' ? "OPERATIONAL SERVICE DEFINITION" : lang === 'PT' ? "DEFINIÇÃO OPERACIONAL DO SERVIÇO" : "DEFINICIÓN OPERACIONAL DEL SERVIÇO", bold: true, size: 20, color: COLOR_PRIMARY })],
                        spacing: { before: 200, after: 100 }
                    }),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ children: [new TextRun({ text: lang === 'EN' ? "SOLUTION:" : lang === 'PT' ? "SOLUÇÃO:" : "SOLUCIÓN:", bold: true, size: 16, color: COLOR_PRIMARY })] }), new Paragraph({ children: [new TextRun({ text: cleanText(data.sustainDetails.solutionName), size: 17 })] })],
                                        shading: { fill: COLOR_ROW_ALT }, margins: { top: 100, bottom: 100, left: 120 }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ children: [new TextRun({ text: "OWNER:", bold: true, size: 16, color: COLOR_PRIMARY })] }), new Paragraph({ children: [new TextRun({ text: cleanText(data.sustainDetails.businessOwner), size: 17 })] })],
                                        shading: { fill: COLOR_ROW_ALT }, margins: { top: 100, bottom: 100, left: 120 }
                                    })
                                ]
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ children: [new TextRun({ text: lang === 'EN' ? "UPDATE SCHEDULES:" : lang === 'PT' ? "HORÁRIOS DE ATUALIZAÇÃO:" : "HORARIOS DE ACTUALIZACIÓN:", bold: true, size: 16, color: COLOR_PRIMARY })] }), new Paragraph({ children: [new TextRun({ text: (data.sustainDetails.updateSchedules || []).filter((s: any) => s).join(' | '), size: 17 })] })],
                                        columnSpan: 2, shading: { fill: COLOR_ROW_ALT }, margins: { top: 100, bottom: 100, left: 120 }
                                    })
                                ]
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ children: [new TextRun({ text: lang === 'EN' ? "FREQUENCY / DURATION:" : lang === 'PT' ? "FREQUÊNCIA / DURAÇÃO:" : "FRECUENCIA / DURACIÓN:", bold: true, size: 16, color: COLOR_PRIMARY })] }), new Paragraph({ children: [new TextRun({ text: `${(data.sustainDetails.metrics.updateFrequency || 'daily').toUpperCase()} / ${data.sustainDetails.updateDuration || 'N/A'}`, size: 17 })] })],
                                        shading: { fill: COLOR_ROW_ALT }, margins: { top: 100, bottom: 100, left: 120 }
                                    }),
                                    new TableCell({
                                        children: [
                                            new Paragraph({ children: [new TextRun({ text: lang === 'EN' ? "HYPERCARE PERIOD:" : lang === 'PT' ? "PERÍODO HYPERCARE:" : "PERIODO HYPERCARE:", bold: true, size: 16, color: COLOR_PRIMARY })] }),
                                            new Paragraph({
                                                children: [
                                                    new TextRun({
                                                        text: data.sustainDetails.hasHypercare
                                                            ? `${lang === 'EN' ? 'Hypercare Support' : lang === 'PT' ? 'Suporte Hypercare' : 'Soporte Hypercare'}: ${(data.sustainDetails.hypercarePeriod || '30_days').replace('_', ' ').replace(/^\+/, '+ ').replace('days', lang === 'EN' ? 'days' : 'días')}`
                                                            : (lang === 'EN' ? "NOT APPLICABLE" : lang === 'PT' ? "NÃO APLICÁVEL" : "NO APLICABLE"),
                                                        size: 17
                                                    })
                                                ]
                                            })
                                        ],
                                        shading: { fill: COLOR_ROW_ALT }, margins: { top: 100, bottom: 100, left: 120 }
                                    })
                                ]
                            })
                        ]
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: lang === 'EN' ? "CRITICALITY MATRIX AND METRICS" : lang === 'PT' ? "MATRIZ DE CRITICIDADE E MÉTRICAS" : "MATRIZ DE CRITICIDAD Y MÉTRICAS", bold: true, size: 20, color: COLOR_PRIMARY })],
                        spacing: { before: 300, after: 100 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: `${lang === 'EN' ? 'CLASS' : lang === 'PT' ? 'CLASSE' : 'CLASE'} ${data.criticitnessLevel?.label || 'MEDIA'}`, bold: true, size: 18, color: COLOR_PRIMARY }),
                            new TextRun({ text: `  • ${lang === 'EN' ? 'Operational Impact' : lang === 'PT' ? 'Impacto Operacional' : 'Impacto Operativo'}: ${data.sustainDetails.criticalityMatrix?.impactOperative >= 4 ? (lang === 'EN' ? 'High' : 'Alto') : (lang === 'EN' ? 'Medium' : 'Medio')}`, size: 17 }),
                            new TextRun({ text: `  • ${lang === 'EN' ? 'Financial Impact' : lang === 'PT' ? 'Impacto Financeiro' : 'Impacto Financiero'}: ${data.isFinancialOrSales ? (lang === 'EN' ? 'High' : 'Alto') : (lang === 'EN' ? 'Standard' : 'Estándar')}`, size: 17, break: 1 }),
                            new TextRun({ text: `  • ${lang === 'EN' ? 'Critical Use' : lang === 'PT' ? 'Uso Crítico' : 'Uso Crítico'}: ${(data.sustainDetails.criticalityMatrix?.frequencyOfUse || 'Diario').toUpperCase()}`, size: 17 })
                        ]
                    })
                ] : []),

                // === ARCHITECTURE DIAGRAM ===
                new Paragraph({ children: [new PageBreak()] }),
                new Paragraph({
                    children: [new TextRun({ text: lang === 'EN' ? "SOLUTION ARCHITECTURE" : lang === 'PT' ? "ARQUITETURA DA SOLUÇÃO" : "ARQUITECTURA DE LA SOLUCIÓN", bold: true, size: 24, color: COLOR_PRIMARY })],
                    spacing: { before: 200, after: 400 }
                }),
                ...(diagramData && diagramData.length > 0 ? [
                    new Paragraph({
                        children: [
                            new ImageRun({
                                data: diagramData,
                                transformation: { width: 550, height: 350 }, // Scaled to fit
                                type: diagramType
                            })
                        ],
                        alignment: AlignmentType.CENTER
                    })
                ] : [
                    new Paragraph({ children: [new TextRun({ text: lang === 'EN' ? "[Diagram not available]" : lang === 'PT' ? "[Diagrama não disponível]" : "[Diagrama no disponible]", italics: true, size: 18 })] })
                ]),

                // Stack
                new Paragraph({
                    children: [new TextRun({ text: lang === 'EN' ? "TECH STACK:" : lang === 'PT' ? "STACK TECNOLÓGICO:" : "STACK TECNOLÓGICO:", bold: true, size: 18, color: COLOR_PRIMARY })],
                    spacing: { before: 300, after: 100 }
                }),
                new Paragraph({
                    children: [new TextRun({
                        text: (data.techStack || []).map((id: string) => {
                            const techNames: Record<string, string> = {
                                'azure': 'Azure Data Factory', 'databricks': 'Azure Databricks', 'synapse': 'Azure Synapse', 'snowflake': 'Snowflake',
                                'powerbi': 'Power BI', 'sqlserver': 'SQL Server', 'logicapps': 'Azure Logic Apps', 'tableau': 'Tableau',
                                'python': 'Python/Airflow', 'n8n': 'n8n', 'antigravity': 'Google Antigravity', 'lovable': 'Lovable',
                                'powerapps': 'Power Apps', 'azure_df': 'Azure Data Factory', 'dotnet': '.NET', 'react': 'React',
                                'sql': 'SQL', 'streamlit': 'Streamlit', 'datascience': 'Data Science / ML', 'other': 'Otros'
                            }
                            return techNames[id] || id
                        }).join(' • '),
                        size: 18,
                        color: COLOR_TEXT
                    })]
                }),

                // === TERMS AND CONDITIONS ===
                new Paragraph({ children: [new PageBreak()] }),
                new Paragraph({
                    children: [new TextRun({ text: lang === 'EN' ? "TERMS AND CONDITIONS" : lang === 'PT' ? "TERMOS E CONDIÇÕES" : "TÉRMINOS Y CONDICIONES", bold: true, color: COLOR_PRIMARY, size: 24 })],
                    spacing: { before: 400, after: 300 }
                }),
                 ... (lang === 'EN' ? [
                    "Proposal Valid for 30 days from issuance.",
                    "Project to start with formal Purchase Order.",
                    "Costs based on Store Intelligence regional agreement.",
                    data.serviceType === 'Staffing' ? "Talent assignment subject to availability and profile confirmation." : "Sustain not included if the requirement does not evolve.",
                    "Additional developments will be quoted separately.",
                    "Deliverables owned by Nestlé upon project completion.",
                    "Payment Sprints agreed upon project start.",
                    "Absolute confidentiality agreement on shared data."
                ] : lang === 'PT' ? [
                    "Proposta Válida por 30 dias a partir da emissão.",
                    "Projeto a iniciar com Ordem de Compra formal.",
                    "Custos baseados no acordo regional da Store Intelligence.",
                    data.serviceType === 'Staffing' ? "Atribuição de talento sujeita a disponibilidade e confirmação de perfis." : "Sustain não incluído caso o requisito não evolua.",
                    "Desenvolvimentos adicionais serão cotados separadamente.",
                    "Entregas de propriedade da Nestlé após a conclusão do projeto.",
                    "Sprints de Pagamento acordados no início do projeto.",
                    "Acordo de confidencialidade absoluto sobre dados compartilhados."
                ] : [
                    "Propuesta Válida durante 30 días desde su emisión.",
                    "Proyecto a iniciar con Orden de Compra formal.",
                    "Costos tasados según acuerdo regional Store Intelligence.",
                    data.serviceType === 'Staffing' ? "Asignación de talento sujeta a disponibilidad y confirmación de perfiles." : "Sustain no se incluye en espera que el requerimiento no evolucione.",
                    "Desarrollos adicionales serán cotizados por separado.",
                    "Entregables propiedad de Nestlé finalizado el proyecto.",
                    "Sprints de Pago acordados al inicio del proyecto.",
                    "Acuerdo de confidencialidad absoluto sobre datos compartidos."
                ]).map(term => new Paragraph({
                    children: [new TextRun({ text: `• ${cleanText(term)}`, size: 18, color: COLOR_TEXT })],
                    spacing: { after: 120 }
                }))
            ]
        }]
    })
}
