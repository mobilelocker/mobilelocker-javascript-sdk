import { apiClient, getEndpoint, isMobileLockerApp, isMobileLockerIOSApp, withRetry } from '../env'
import { MobileLockerError, GeneralErrorCode } from '../errors'
import { analytics } from './analytics'

export interface VideoOptions {
    autoplay?: boolean
    loop?: boolean
    muted?: boolean
    startTime?: number
    endTime?: number
    rate?: number
    showControls?: boolean
    allowScrubbing?: boolean
    allowedSpeeds?: number[]
    allowPiP?: boolean
    allowAirPlay?: boolean
    allowFullscreen?: boolean
    title?: string
    videoGravity?: 'fit' | 'fill' | 'stretch'
}

export type VideoResult =
    | { status: 'completed'; position: number }
    | { status: 'dismissed'; position: number }
    | { status: 'failed'; error: string }

export const ui = {
    openPDF(pdfPath: string, title: string, customOptions?: Record<string, unknown>): void {
        if (isMobileLockerApp()) {
            analytics.logEvent('PDF', 'Open', pdfPath, { filename: pdfPath, title, ...customOptions }, 'showpdf')
        } else {
            window.open(pdfPath, '_blank')
        }
    },

    showToolbar(): void {
        if (!isMobileLockerIOSApp()) {
            throw new MobileLockerError('showToolbar() is only supported in the iOS app', GeneralErrorCode.ServerError)
        }
        void apiClient.post(getEndpoint('/menu/show'))
    },

    async openVideo(path: string, options: VideoOptions = {}): Promise<VideoResult> {
        if (isMobileLockerIOSApp()) {
            const { data } = await withRetry(() =>
                apiClient.post<VideoResult>(getEndpoint('/ui/open-video'), { path, options }),
            )
            return data
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

            const close = (status: 'completed' | 'dismissed') => {
                document.body.removeChild(overlay)
                resolve({ status, position: video.currentTime })
            }

            video.addEventListener('ended', () => close('completed'))
            overlay.addEventListener('click', e => { if (e.target === overlay) close('dismissed') })
            video.addEventListener('error', () => {
                document.body.removeChild(overlay)
                resolve({ status: 'failed', error: 'Video playback error' })
            })

            overlay.appendChild(video)
            document.body.appendChild(overlay)
        })
    },
}
