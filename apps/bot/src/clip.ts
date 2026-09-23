import { chmod, rename } from 'node:fs/promises'
import { tmpdir } from 'node:os'

import { log } from './log.ts'

// Reels and Shorts only: a plain YouTube video or an Instagram photo post is
// not something the translate flow can do anything with.
const CLIP_URL =
    /https?:\/\/(?:www\.)?(?:instagram\.com\/(?:[\w.]+\/)?reels?\/[\w-]+|(?:m\.)?youtube\.com\/shorts\/[\w-]+)\S*/i

const TRANSLATE_ASK = /^(?:пожалуйста )?(?:переведи(?:те)?|перевод|translate)(?: пожалуйста)?$/

// A bare link, or a link plus "переведи", asks for a translation. A link with
// anything else written around it is the user noting an idea — that stays a
// normal text capture.
export function parseClipRequest(text: string): string | null {
    const match = text.match(CLIP_URL)
    if (!match) {
        return null
    }
    const rest = text
        .replace(match[0], ' ')
        .replace(/[\s.,!?:;—-]+/g, ' ')
        .trim()
        .toLowerCase()
    if (rest !== '' && !TRANSLATE_ASK.test(rest)) {
        return null
    }
    // Instagram share links carry a per-share tracking token (?stkn=…).
    const url = new URL(match[0])
    url.search = ''
    url.hash = ''
    return url.toString()
}

const YT_DLP_RELEASE: Record<string, string> = {
    'linux-x64': 'yt-dlp_linux',
    'linux-arm64': 'yt-dlp_linux_aarch64',
    'darwin-arm64': 'yt-dlp_macos',
    'darwin-x64': 'yt-dlp_macos',
}
const ytDlpPath = `${tmpdir()}/orbit-yt-dlp`
let ytDlpReady: Promise<string> | null = null

// The standalone release binary rather than a distro package: Instagram breaks
// yt-dlp every few weeks, and only the latest release keeps up. Fetched on
// first use so every deploy starts from the current one.
function ensureYtDlp(): Promise<string> {
    ytDlpReady ??= (async () => {
        if (await Bun.file(ytDlpPath).exists()) {
            return ytDlpPath
        }
        const asset = YT_DLP_RELEASE[`${process.platform}-${process.arch}`]
        if (!asset) {
            throw new Error(`No yt-dlp build for ${process.platform}-${process.arch}`)
        }
        const res = await fetch(`https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`)
        if (!res.ok) {
            throw new Error(`yt-dlp download failed: ${res.status}`)
        }
        // Buffered, not streamed: Bun.write on a streaming Response spun at
        // full CPU without finishing. Written aside and renamed so a crash
        // mid-write never leaves a half binary that exists() would accept.
        await Bun.write(`${ytDlpPath}.part`, await res.arrayBuffer())
        await chmod(`${ytDlpPath}.part`, 0o755)
        await rename(`${ytDlpPath}.part`, ytDlpPath)
        log.info('yt-dlp installed')
        return ytDlpPath
    })().catch((err: unknown) => {
        ytDlpReady = null
        throw err
    })
    return ytDlpReady
}

async function run(cmd: string[], timeoutMs = 120_000): Promise<string> {
    const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe', timeout: timeoutMs })
    const [stdout, stderr, code] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
    ])
    if (code !== 0) {
        const reason = stderr.trim().split('\n').at(-1) ?? ''
        throw new Error(`${cmd[0].split('/').at(-1)} exited ${code}: ${reason}`)
    }
    return stdout
}

// A three-minute 720p reel is ~25 MB; anything past this is not a reel.
const MAX_CLIP_SIZE = '100M'

// Private accounts, deleted posts, age or region gates — and, from a datacenter
// IP, sites asking to log in. Retrying later won't help the user with any of
// these, so they get their own reply.
const UNAVAILABLE = /empty media response|login required|not available|unavailable|private|sign in/i

export class ClipUnavailableError extends Error {}

export interface DownloadedClip {
    path: string
    durationSeconds: number
}

// Returns null when the clip is too long or too big to take. yt-dlp rejects a
// long clip from metadata before fetching a byte when the site reports a
// duration, but Instagram often doesn't (`<=?` lets those through) — so the
// file size is capped too, which stops an hour-long video mid-download, and
// the finished file is measured, because that is the duration the limit trusts.
export async function downloadClip(url: string, dir: string, maxSeconds: number): Promise<DownloadedClip | null> {
    const ytDlp = await ensureYtDlp()
    const args = [
        '--no-playlist',
        '--no-warnings',
        '--no-simulate',
        '-f',
        'bv*[height<=720]+ba/b[height<=720]/b',
        '--merge-output-format',
        'mp4',
        '--match-filter',
        `duration<=?${maxSeconds} & !is_live`,
        '--max-filesize',
        MAX_CLIP_SIZE,
        '--print',
        'after_move:filepath',
        '-o',
        `${dir}/clip.%(ext)s`,
        url,
    ]
    let output: string
    try {
        output = await run([ytDlp, ...args])
    } catch (err) {
        // Most failures are Instagram changing something that a newer
        // yt-dlp already handles, so update once before giving up.
        log.info(`yt-dlp failed, updating and retrying: ${(err as Error).message}`)
        await run([ytDlp, '-U'])
        try {
            output = await run([ytDlp, ...args])
        } catch (retryErr) {
            const message = (retryErr as Error).message
            throw UNAVAILABLE.test(message) ? new ClipUnavailableError(message) : retryErr
        }
    }
    const path = output.trim()
    if (!path) {
        return null
    }
    const probed = await run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path])
    const durationSeconds = Math.ceil(Number(probed.trim()))
    return durationSeconds > maxSeconds ? null : { path, durationSeconds }
}

export async function extractAudio(videoPath: string, dir: string): Promise<Uint8Array | null> {
    const audioPath = `${dir}/audio.mp3`
    try {
        await run([
            'ffmpeg',
            '-v',
            'error',
            '-y',
            '-i',
            videoPath,
            '-map',
            '0:a:0',
            '-ac',
            '1',
            '-b:a',
            '64k',
            audioPath,
        ])
    } catch (err) {
        // A clip with music removed or no audio track at all: translate from
        // the subtitles alone.
        log.info(`No audio extracted: ${(err as Error).message}`)
        return null
    }
    return Bun.file(audioPath).bytes()
}

// One frame a second — subtitle lines change every one or two — cropped to
// the middle band where burned-in captions sit, twelve frames to an image, so
// a three-minute reel is fifteen images instead of a hundred and eighty.
export async function extractFrameGrids(videoPath: string, dir: string): Promise<Uint8Array[]> {
    await run([
        'ffmpeg',
        '-v',
        'error',
        '-y',
        '-i',
        videoPath,
        '-vf',
        'fps=1,crop=iw:ih*0.55:0:ih*0.3,scale=360:-2,tile=4x3',
        '-q:v',
        '5',
        `${dir}/grid-%03d.jpg`,
    ])
    const names = [...new Bun.Glob('grid-*.jpg').scanSync(dir)].sort()
    return Promise.all(names.map((name) => Bun.file(`${dir}/${name}`).bytes()))
}
