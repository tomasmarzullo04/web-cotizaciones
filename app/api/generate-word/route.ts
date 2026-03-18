import { NextRequest, NextResponse } from 'next/server'
import { Packer } from 'docx'
import { createQuoteWordDoc } from '@/lib/word-generator'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const state = body.state || body
        const lang = body.lang || 'ES'
        const { clientName } = state

        // Generate Document Object
        const doc = createQuoteWordDoc(state, lang)

        // Generate Buffer (Blob)
        const buffer = await Packer.toBuffer(doc)

        // Filename
        const safeClient = (clientName || 'proyecto').replace(/[^a-zA-Z0-9]/g, '_')
        const filename = `cotizacion_${safeClient}_${lang}.docx`

        // Return Response
        return new NextResponse(buffer as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${filename}"`,
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
