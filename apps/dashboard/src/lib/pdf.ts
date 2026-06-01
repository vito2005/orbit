import { extractText, getDocumentProxy } from 'unpdf'

export async function extractPdfText(bytes: ArrayBuffer | Uint8Array): Promise<string> {
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
    const pdf = await getDocumentProxy(arr)
    const { text } = await extractText(pdf, { mergePages: true })
    return text.trim()
}
