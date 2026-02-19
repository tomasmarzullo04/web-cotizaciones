import { NextRequest, NextResponse } from 'next/server'
import { Packer } from 'docx'
import { createQuoteWordDoc } from '@/lib/word-generator'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { clientName, quoteNumber } = body

        // Generate Document Object
        const doc = createQuoteWordDoc(body)

        // Generate Buffer (Blob)
        const buffer = await Packer.toBuffer(doc)

        // Filename
        const safeClient = (clientName || 'proyecto').replace(/[^a-zA-Z0-9]/g, '_')
        const date = new Date().toISOString().split('T')[0]
        const filename = `cotizacion_${safeClient}_${date}.docx`

        // Return Response
        return new NextResponse(new Blob([buffer as any]), {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${filename}"`,
                // 'Content-Length': buffer.length.toString() // Blob handles this?
            }
        })

    } catch (error) {
        console.error("Word Generation Error:", error)
        return NextResponse.json({
            error: 'Failed to generate Word document',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
    }
}
