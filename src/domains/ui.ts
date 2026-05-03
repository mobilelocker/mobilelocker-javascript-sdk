import { apiClient, getEndpoint, isApp, isIOS, withRetry } from '../env'
import { MobileLockerError, GeneralErrorCode } from '../errors'
import { analytics } from './analytics'
import { withStatusBooleans, WithStatusBooleans } from '../utils/status'

export interface VideoOptions {
    /** Start playback automatically. Defaults to `true` in the browser fallback. */
    autoplay?: boolean
    /** Loop the video continuously. */
    loop?: boolean
    /** Start the video muted. */
    muted?: boolean
    /** Start playback from this position in seconds. */
    startTime?: number
    /** Stop playback at this position in seconds. */
    endTime?: number
    /** Playback speed multiplier (e.g. `1.5` for 1.5× speed). */
    rate?: number
    /** Show the native playback controls. */
    showControls?: boolean
    /** Allow the user to scrub (seek) through the video. */
    allowScrubbing?: boolean
    /** Allowed playback speeds to offer the user. */
    allowedSpeeds?: number[]
    /** Allow Picture-in-Picture mode. */
    allowPiP?: boolean
    /** Allow AirPlay output. */
    allowAirPlay?: boolean
    /** Allow full-screen mode. */
    allowFullscreen?: boolean
    /** Title to display in the player UI. */
    title?: string
    /** How to fit the video within its display area. */
    videoGravity?: 'fit' | 'fill' | 'stretch'
}

const VIDEO_STATUSES = ['completed', 'dismissed', 'failed'] as const

type RawVideoResult =
    | { status: 'completed'; position: number }
    | { status: 'dismissed'; position: number }
    | { status: 'failed'; error: string }

export type VideoResult = WithStatusBooleans<RawVideoResult>

export const ui = {
    /**
     * Open a PDF file in the platform viewer.
     *
     * In the iOS app, opens the native PDF viewer with annotation support.
     * In the browser, opens the file in a new tab.
     *
     * @param pdfPath - Path to the PDF file, relative to the presentation root.
     * @param title - Display title for the viewer.
     * @param customOptions - Optional extra properties passed through to the analytics event.
     *
     * @example
     * mobilelocker.ui.openPDF('/files/brochure.pdf', 'Product Brochure')
     */
    openPDF(pdfPath: string, title: string, customOptions?: Record<string, unknown>): void {
        if (isApp()) {
            analytics.logEvent('PDF', 'Open', pdfPath, { filename: pdfPath, title, ...customOptions }, 'showpdf')
        } else {
            window.open(pdfPath, '_blank')
        }
    },

    /**
     * Show the app navigation toolbar.
     *
     * @remarks iOS app only. Throws in all other environments.
     * @throws {@link MobileLockerError} if called outside the iOS app.
     */
    showToolbar(): void {
        if (!isIOS()) {
            throw new MobileLockerError('showToolbar() is only supported in the iOS app', GeneralErrorCode.ServerError)
        }
        void apiClient.post(getEndpoint('/menu/show'))
    },

    /**
     * Open a video file in the platform player.
     *
     * In the iOS app, uses the native AVPlayer with full option support.
     * In the browser, renders a full-viewport `<video>` overlay. Click outside
     * the video to dismiss it.
     *
     * @param path - Path to the video file, relative to the presentation root.
     * @param options - Playback options (autoplay, loop, controls, speed, etc.).
     * @returns A {@link VideoResult} with `status` and final playback `position` in seconds.
     *
     * @example
     * const result = await mobilelocker.ui.openVideo('/files/demo.mp4', { autoplay: true, showControls: true })
     * if (result.status === 'completed') console.log(`Watched to ${result.position}s`)
     */
    async openVideo(path: string, options: VideoOptions = {}): Promise<VideoResult> {
        if (isIOS()) {
            const { data } = await withRetry(() =>
                apiClient.post<VideoResult>(getEndpoint('/ui/open-video'), { path, options }),
            )
            return withStatusBooleans(data as RawVideoResult, VIDEO_STATUSES)
        }

        // Browser fallback: full-viewport <video> overlay
        return new Promise(resolve => {
            const overlay = document.createElement('div')
            overlay.style.cssText = 'position:fixed;inset:0;background:#000;z-index:9999;display:flex;align-items:center;justify-content:center'

            const video = document.createElement('video')
            video.src = path
            video.style.cssText = 'max-width:100%;max-height:100%'
            video.autoplay = options.autoplay ?? true
            video.loop = options.loop ?? false
            video.muted = options.muted ?? false
            video.controls = options.showControls ?? true
            if (options.startTime) video.currentTime = options.startTime
            if (options.rate) video.playbackRate = options.rate
            if (options.title) video.title = options.title

            const wrap = (raw: RawVideoResult) => resolve(withStatusBooleans(raw, VIDEO_STATUSES))

            const close = (status: 'completed' | 'dismissed') => {
                document.body.removeChild(overlay)
                wrap({ status, position: video.currentTime })
            }

            video.addEventListener('ended', () => close('completed'))
            overlay.addEventListener('click', e => { if (e.target === overlay) close('dismissed') })
            video.addEventListener('error', () => {
                document.body.removeChild(overlay)
                wrap({ status: 'failed', error: 'Video playback error' })
            })

            overlay.appendChild(video)
            document.body.appendChild(overlay)
        })
    },
}
