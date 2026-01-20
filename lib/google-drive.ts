'use server'

import { google } from 'googleapis'
import { Readable } from 'stream'

/**
 * Uploads a file to Google Drive using a Service Account.
 * Expects a FormData object containing 'file' and 'filename'.
 */
export async function uploadToDrive(formData: FormData) {
    const fileName = formData.get('filename') as string
    const file = formData.get('file') as File

    if (!file || !fileName) {
        console.error("[GoogleDrive] Upload failed: Missing file or filename")
        return { success: false, error: "Missing file or filename" }
    }

    // 1. Check Credentials
    const CLIENT_EMAIL = process.env.GOOGLE_SA_CLIENT_EMAIL
    const PRIVATE_KEY = process.env.GOOGLE_SA_PRIVATE_KEY
    const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID

    if (!CLIENT_EMAIL || !PRIVATE_KEY || !FOLDER_ID) {
        console.warn("[GoogleDrive] Missing credentials. Skipping upload.")
        return { success: false, error: "Missing Drive Credentials" }
    }

    try {
        // 2. Auth - Robust Key Handling
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: CLIENT_EMAIL,
                private_key: PRIVATE_KEY.replace(/\\n/g, '\n'), // Fix common .env newline issue
            },
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        })

        const drive = google.drive({ version: 'v3', auth })

        // 3. Convert File to Stream
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const stream = new Readable()
        stream.push(buffer)
        stream.push(null)

        // 4. Upload
        console.log(`[GoogleDrive] Starting upload: ${fileName}`)

        const response = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [FOLDER_ID],
            },
            media: {
                mimeType: 'application/pdf',
                body: stream,
            },
            supportsAllDrives: true, // Requested workaround for quota/permission issues
            fields: 'id, name, webViewLink, parents',
        })

        console.log(`[GoogleDrive] Archivo [${fileName}] subido exitosamente a Drive. ID: ${response.data.id}`)
        return { success: true, fileId: response.data.id }

    } catch (error: any) {
        console.error(`[GoogleDrive] Upload Error for [${fileName}]:`, error.message)
        // Check for common auth errors to give better hints
        if (error.message?.includes('invalid_grant')) {
            console.error("[GoogleDrive] Hint: Check system time or invalid private key.")
        }
        return { success: false, error: error.message }
    }
}
