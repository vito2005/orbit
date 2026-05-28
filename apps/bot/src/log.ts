function ts() {
    return new Date().toISOString()
}

export const log = {
    info: (msg: string, meta?: unknown) => {
        if (meta !== undefined) console.log(`[${ts()}] ℹ  ${msg}`, meta)
        else console.log(`[${ts()}] ℹ  ${msg}`)
    },
    warn: (msg: string, meta?: unknown) => {
        if (meta !== undefined) console.warn(`[${ts()}] ⚠  ${msg}`, meta)
        else console.warn(`[${ts()}] ⚠  ${msg}`)
    },
    error: (msg: string, err?: unknown) => {
        if (err instanceof Error) {
            console.error(`[${ts()}] ✖  ${msg}`, err.message, err.stack)
        } else if (err !== undefined) {
            console.error(`[${ts()}] ✖  ${msg}`, err)
        } else {
            console.error(`[${ts()}] ✖  ${msg}`)
        }
    },
}
