


import { uploadToDrive } from '../lib/google-drive';
// dotenv removed, using native --env-file


// Mock File and FormData since we are in node environment
class MockFile {
    name: string;
    type: string;
    content: Buffer;

    constructor(content: Buffer, name: string, type: string) {
        this.content = content;
        this.name = name;
        this.type = type;
    }

    async arrayBuffer() {
        return this.content.buffer;
    }
}

// Minimal Polyfill for FormData if needed, but in recent Node versions it might be available.
// Ideally, we depend on the environment provided by 'tsx' or 'ts-node'.

async function test() {
    console.log("Testing Production Drive Upload (Bypass Attempt)...");

    // Create a dummy PDF buffer
    const buffer = Buffer.from("%PDF-1.4\n%...", "utf-8");

    const formData = new FormData();
    // We need to append a File-like object. In Node, standard FormData might require specific compatible types.
    // If undici is used (Node 18+), global File exists.

    const file = new File([buffer], "test_quota_bypass.pdf", { type: "application/pdf" });
    formData.append("file", file);
    formData.append("filename", "test_quota_bypass.pdf");

    const result = await uploadToDrive(formData);

    if (result.success) {
        console.log("SUCCESS: File uploaded!", result);
    } else {
        console.log("FAILURE:", result.error);
    }
}

test();
