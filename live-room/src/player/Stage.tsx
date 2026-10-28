import { useEffect, useRef, useState } from 'react'
import { fallbackAfterFlvFailure, selectPlayback } from './select.ts'
import { FLV_URL, HLS_URL, probeLive } from './urls.ts'

type Engine = { destroy: () => void }

export function Stage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [live, setLive] = useState(false)
  const [needSound, setNeedSound] = useState(false)

  useEffect(() => {
    const current = videoRef.current
    if (!current) return
    const video: HTMLVideoElement = current

    let stopped = false
    let generation = 0
    let engine: Engine | null = null
    let pollTimer = 0
    let playing = false

    const clearVideo = () => {
      video.pause()
      video.removeAttribute('src')
      video.load()
    }

    const destroy = () => {
      const current = engine
      engine = null
      current?.destroy()
      clearVideo()
    }

    const goOffline = () => {
      if (stopped) return
      generation += 1
      playing = false
      destroy()
      setLive(false)
      setNeedSound(false)
      schedule()
    }

    const playVideo = async () => {
      video.muted = false
      try {
        await video.play()
        if (!stopped) setNeedSound(false)
      } catch {
        video.muted = true
        if (!stopped) setNeedSound(true)
        await video.play().catch(() => undefined)
      }
    }

    const arm = (ticket: number, onFail: (sawFrame: boolean) => void) => {
      let sawFrame = false
      let done = false
      const finish = () => {
        if (done || stopped || ticket !== generation) return
        done = true
        cleanup()
        onFail(sawFrame)
      }
      const onTime = () => {
        sawFrame = true
      }
      video.addEventListener('timeupdate', onTime)
      video.addEventListener('error', finish)
      const timer = window.setTimeout(() => {
        if (!sawFrame) finish()
      }, 8000)
      let lastTime = video.currentTime
      let movedAt = Date.now()
      const stall = window.setInterval(() => {
        if (video.currentTime !== lastTime) {
          lastTime = video.currentTime
          movedAt = Date.now()
          return
        }
        if (sawFrame && Date.now() - movedAt > 8000) finish()
      }, 2000)
      function cleanup() {
        window.clearTimeout(timer)
        window.clearInterval(stall)
        video.removeEventListener('timeupdate', onTime)
        video.removeEventListener('error', finish)
      }
      return {
        fail: finish,
        destroy: cleanup,
      }
    }

    const startNative = () => {
      const ticket = ++generation
      playing = true
      const watch = arm(ticket, () => goOffline())
      engine = { destroy: watch.destroy }
      video.src = HLS_URL
      setLive(true)
      void playVideo()
    }

    const startHlsJs = async () => {
      const ticket = ++generation
      playing = true
      const { default: Hls } = await import('hls.js')
      if (stopped || ticket !== generation) return
      if (!Hls.isSupported()) {
        startNative()
        return
      }
      const hls = new Hls({ liveSyncDurationCount: 2, manifestLoadingTimeOut: 8000 })
      const watch = arm(ticket, () => goOffline())
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) window.setTimeout(() => watch.fail(), 0)
      })
      engine = {
        destroy: () => {
          watch.destroy()
          hls.destroy()
        },
      }
      hls.loadSource(HLS_URL)
      hls.attachMedia(video)
      setLive(true)
      await playVideo()
    }

    const startFlv = async () => {
      const ticket = ++generation
      playing = true
      const mpegts = (await import('mpegts.js')).default
      if (stopped || ticket !== generation) return
      if (!mpegts.isSupported()) {
        await startHlsJs()
        return
      }
      const player = mpegts.createPlayer(
        { type: 'flv', isLive: true, url: FLV_URL },
        {
          enableStashBuffer: false,
          stashInitialSize: 128,
          liveBufferLatencyChasing: true,
        },
      )
      const watch = arm(ticket, (sawFrame) => {
        generation += 1
        playing = false
        destroy()
        window.setTimeout(() => {
          if (stopped) return
          if (fallbackAfterFlvFailure(sawFrame) === 'hls.js') {
            void startHlsJs()
            return
          }
          setLive(false)
          setNeedSound(false)
          schedule()
        }, 0)
      })
      player.on(mpegts.Events.ERROR, () => {
        window.setTimeout(() => watch.fail(), 0)
      })
      engine = {
        destroy: () => {
          watch.destroy()
          try {
            player.destroy()
          } catch {
            // mpegts can throw if the socket is already closed
          }
        },
      }
      player.attachMediaElement(video)
      player.load()
      setLive(true)
      await playVideo()
    }

    const schedule = () => {
      window.clearTimeout(pollTimer)
      pollTimer = window.setTimeout(() => {
        void poll()
      }, 2000)
    }

    async function poll() {
      if (stopped || playing) return
      const kind = selectPlayback({
        userAgent: navigator.userAgent,
        mediaSource: typeof MediaSource !== 'undefined',
        maxTouchPoints: navigator.maxTouchPoints,
      })
      const online = await probeLive(kind === 'flv' ? FLV_URL : HLS_URL)
      if (stopped || playing) return
      if (!online) {
        schedule()
        return
      }
      if (kind === 'flv') await startFlv()
      else startNative()
    }

    void poll()

    return () => {
      stopped = true
      generation += 1
      window.clearTimeout(pollTimer)
      destroy()
    }
  }, [])

  return (
    <section className="stage" aria-label="直播画面">
      <video ref={videoRef} playsInline controls={live} />
      {live ? null : (
        <div className="offline">
          <p>主播还没开播</p>
        </div>
      )}
      {needSound ? (
        <button
          className="unmute"
          type="button"
          onClick={() => {
            const video = videoRef.current
            if (!video) return
            video.muted = false
            void video.play()
            setNeedSound(false)
          }}
        >
          打开声音
        </button>
      ) : null}
    </section>
  )
}
