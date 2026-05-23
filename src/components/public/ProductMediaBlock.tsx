'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Music,
  Video,
  LinkIcon,
  AlignLeft,
} from 'lucide-react'
import { getProductMediaTracks } from '@/lib/apparel-mockup'

type ProductMediaBlockProps = {
  mediaType?: string | null
  mediaUrl?: string | null
  mediaTitle?: string | null
  mediaList?: any
  productName: string
}

export default function ProductMediaBlock({
  mediaType,
  mediaUrl,
  mediaTitle,
  mediaList,
  productName,
}: ProductMediaBlockProps) {
  // Safe track parsing
  const tracks = (() => {
    if (mediaList) {
      try {
        const parsed = getProductMediaTracks(mediaList)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      } catch (e) {
        console.error("Failed to parse mediaList", e)
      }
    }
    if (mediaUrl && mediaType && mediaType !== 'NONE') {
      return [
        {
          id: 'fallback-media',
          type: mediaType,
          url: mediaUrl,
          title: mediaTitle || productName,
        },
      ]
    }
    return []
  })()

  const [activeTrackIndex, setActiveTrackIndex] = useState(0)
  const activeTrack = tracks[activeTrackIndex] || tracks[0]

  const audioRef = useRef<HTMLAudioElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const volumeBarRef = useRef<HTMLDivElement>(null)
  const lyricsContainerRef = useRef<HTMLDivElement>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [showLyrics, setShowLyrics] = useState(false)

  // Parse LRC lyrics
  const parsedLyrics = useMemo(() => {
    const lrcText = activeTrack?.lyrics || ''
    if (!lrcText) return []
    const lines = lrcText.split(/\r?\n/)
    const result: Array<{ time: number; text: string }> = []
    const timeRegex = /\[(\d+):(\d+(?:\.\d+)?)\]/
    const offsetRegex = /\[offset:\s*([+-]?\d+)\s*\]/i

    let offsetMs = 0
    // Try to find global [offset: +/- ms] metadata
    for (const line of lines) {
      const offsetMatch = offsetRegex.exec(line)
      if (offsetMatch) {
        offsetMs = parseInt(offsetMatch[1], 10)
        break
      }
    }

    const offsetSeconds = offsetMs / 1000

    for (const line of lines) {
      const match = timeRegex.exec(line)
      if (match) {
        const minutes = parseInt(match[1], 10)
        const seconds = parseFloat(match[2])
        let timeInSeconds = minutes * 60 + seconds + offsetSeconds
        if (timeInSeconds < 0) timeInSeconds = 0
        const text = line.replace(timeRegex, '').trim()
        if (!isNaN(timeInSeconds)) {
          result.push({ time: timeInSeconds, text })
        }
      }
    }
    return result.sort((a, b) => a.time - b.time)
  }, [activeTrack?.lyrics])

  // Find active lyric index based on current time
  const currentLyricIndex = useMemo(() => {
    if (parsedLyrics.length === 0) return -1
    let matchedIndex = -1
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (currentTime >= parsedLyrics[i].time) {
        matchedIndex = i
      } else {
        break
      }
    }
    return matchedIndex
  }, [parsedLyrics, currentTime])

  // Click to seek to lyric timestamp
  const handleLyricClick = (time: number) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = time
    setCurrentTime(time)
  }

  // Smoothly scroll active lyric to vertical center of container
  useEffect(() => {
    if (showLyrics && currentLyricIndex !== -1 && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current
      const activeElement = container.querySelector(`[data-index="${currentLyricIndex}"]`) as HTMLElement
      if (activeElement) {
        const containerRect = container.getBoundingClientRect()
        const elementRect = activeElement.getBoundingClientRect()
        
        // Accurate relative position independent of offsetParent positioning
        const absoluteElementTop = elementRect.top - containerRect.top + container.scrollTop
        const targetScrollTop = absoluteElementTop - (containerRect.height / 2) + (elementRect.height / 2)
        
        container.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        })
      }
    }
  }, [currentLyricIndex, showLyrics])

  // Pause audio and reset if track changes or active selection is not AUDIO
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
      audioRef.current.load()
    }
    setShowLyrics(false)
  }, [activeTrackIndex])

  // Reload audio on URL change
  useEffect(() => {
    if (audioRef.current && activeTrack?.type === 'AUDIO') {
      audioRef.current.load()
    }
  }, [activeTrack?.url])

  if (tracks.length === 0) return null

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const skip = (seconds: number) => {
    if (!audioRef.current) return
    let nextTime = audioRef.current.currentTime + seconds
    if (nextTime < 0) nextTime = 0
    if (nextTime > duration) nextTime = duration
    audioRef.current.currentTime = nextTime
    setCurrentTime(nextTime)
  }

  const toggleMute = () => {
    if (!audioRef.current) return
    const nextMuted = !isMuted
    audioRef.current.muted = nextMuted
    setIsMuted(nextMuted)
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !audioRef.current || !duration) return
    const rect = progressBarRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    const percentage = Math.max(0, Math.min(1, clickX / width))
    const nextTime = percentage * duration
    audioRef.current.currentTime = nextTime
    setCurrentTime(nextTime)
  }

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!volumeBarRef.current || !audioRef.current) return
    const rect = volumeBarRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    const nextVolume = Math.max(0, Math.min(1, clickX / width))
    audioRef.current.volume = nextVolume
    setVolume(nextVolume)
    setIsMuted(nextVolume === 0)
    audioRef.current.muted = nextVolume === 0
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === 0) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <section className="mt-5 overflow-hidden rounded-[24px] border border-gray-200 bg-white p-4 shadow-[0_18px_55px_-42px_rgba(15,23,42,0.45)]">
      <style>{`
        @keyframes bounce-bar-1 { 0%, 100% { height: 4px; } 50% { height: 16px; } }
        @keyframes bounce-bar-2 { 0%, 100% { height: 6px; } 50% { height: 22px; } }
        @keyframes bounce-bar-3 { 0%, 100% { height: 8px; } 50% { height: 14px; } }
        @keyframes bounce-bar-4 { 0%, 100% { height: 4px; } 50% { height: 18px; } }
        .eq-container { display: flex; align-items: flex-end; gap: 2.5px; height: 24px; width: 22px; }
        .eq-bar { width: 3.5px; border-radius: 1px; background: linear-gradient(to top, #ED2C71, #F15A24); }
        .eq-bar-active-1 { animation: bounce-bar-1 1s ease-in-out infinite; }
        .eq-bar-active-2 { animation: bounce-bar-2 0.8s ease-in-out infinite; }
        .eq-bar-active-3 { animation: bounce-bar-3 1.2s ease-in-out infinite; }
        .eq-bar-active-4 { animation: bounce-bar-4 0.9s ease-in-out infinite; }
        .eq-bar-static-1 { height: 4px; }
        .eq-bar-static-2 { height: 6px; }
        .eq-bar-static-3 { height: 8px; }
        .eq-bar-static-4 { height: 4px; }
        .lyrics-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .lyrics-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .lyrics-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 4px;
        }
      `}</style>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-[0.16em] text-gray-900">
          {activeTrack.type === 'AUDIO' ? 'Escuchar pista' : 'Ver video'}
        </h2>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
          {activeTrack.type === 'YOUTUBE' ? 'YouTube' : activeTrack.type === 'VIDEO' ? 'MP4' : 'Audio'}
        </span>
      </div>

      {activeTrack.type === 'AUDIO' && (
        <div className="rounded-2xl bg-slate-950 p-5 text-white shadow-inner relative overflow-hidden">
          {/* Audio Tag */}
          <audio
            ref={audioRef}
            src={activeTrack.url}
            preload="metadata"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            className="hidden"
          />

          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ED2C71]">
                En reproducción
              </span>
              <p className="truncate text-base font-bold text-white mt-0.5">
                {activeTrack.title}
              </p>
            </div>

            {/* Ecualizador animado */}
            <div className="eq-container shrink-0">
              <div className={`eq-bar ${isPlaying ? 'eq-bar-active-1' : 'eq-bar-static-1'}`} />
              <div className={`eq-bar ${isPlaying ? 'eq-bar-active-2' : 'eq-bar-static-2'}`} />
              <div className={`eq-bar ${isPlaying ? 'eq-bar-active-3' : 'eq-bar-static-3'}`} />
              <div className={`eq-bar ${isPlaying ? 'eq-bar-active-4' : 'eq-bar-static-4'}`} />
            </div>
          </div>

          {/* Time & Progress Slider */}
          <div className="space-y-2">
            <div
              ref={progressBarRef}
              onClick={handleProgressClick}
              className="relative h-1.5 w-full cursor-pointer rounded-full bg-slate-800 transition-all hover:h-2"
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[#ED2C71] to-[#F15A24]"
                style={{ width: `${progressPercent}%` }}
              />
              <div
                className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white bg-[#ED2C71] shadow-md transition-transform hover:scale-125"
                style={{ left: `${progressPercent}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] font-mono text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Bottom Panel Controls */}
          <div className="mt-5 flex items-center justify-between gap-3">
            {/* Skip Back / Play / Skip Forward */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => skip(-10)}
                className="text-gray-400 hover:text-white transition-colors"
                title="Retroceder 10s"
              >
                <RotateCcw size={18} />
              </button>

              <button
                type="button"
                onClick={togglePlay}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-[#ED2C71] to-[#F15A24] text-white shadow-lg shadow-[#ED2C71]/20 transition-all hover:scale-105 hover:shadow-[#ED2C71]/40"
              >
                {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} className="ml-1" fill="white" />}
              </button>

              <button
                type="button"
                onClick={() => skip(10)}
                className="text-gray-400 hover:text-white transition-colors"
                title="Avanzar 10s"
              >
                <RotateCw size={18} />
              </button>
            </div>

            {/* Volume & Lyrics Buttons */}
            <div className="flex items-center gap-4">
              {activeTrack.lyrics && (
                <button
                  type="button"
                  onClick={() => setShowLyrics(!showLyrics)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                    showLyrics
                      ? 'bg-[#ED2C71] text-white shadow-md shadow-[#ED2C71]/30'
                      : 'text-gray-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700'
                  }`}
                  title="Mostrar letra"
                >
                  <AlignLeft size={14} />
                  <span>Letra</span>
                </button>
              )}

              {/* Volume Control */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>

                <div
                  ref={volumeBarRef}
                  onClick={handleVolumeClick}
                  className="relative h-1 w-16 cursor-pointer rounded-full bg-slate-800"
                >
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-gray-300"
                    style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sync Lyrics Panel */}
          {showLyrics && parsedLyrics.length > 0 && (
            <div className="mt-5 border-t border-slate-900/60 pt-4">
              <div
                ref={lyricsContainerRef}
                className="lyrics-scrollbar max-h-[220px] overflow-y-auto space-y-5 py-[90px] px-4 text-center scroll-smooth"
              >
                {parsedLyrics.map((lyric, idx) => {
                  const isActive = idx === currentLyricIndex
                  return (
                    <div
                      key={idx}
                      data-index={idx}
                      onClick={() => handleLyricClick(lyric.time)}
                      className={`cursor-pointer transition-all duration-300 leading-relaxed ${
                        isActive
                          ? 'text-[#ED2C71] text-[16px] md:text-[17px] font-black scale-105 filter drop-shadow-[0_2px_10px_rgba(237,44,113,0.4)]'
                          : 'text-slate-400 text-[14px] md:text-[15px] font-bold opacity-35 hover:opacity-90'
                      }`}
                    >
                      {lyric.text || '•••'}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTrack.type === 'VIDEO' && (
        <video
          controls
          src={activeTrack.url}
          preload="metadata"
          className="aspect-video w-full rounded-2xl bg-black object-contain shadow-lg"
        >
          Tu navegador no soporta el elemento de video.
        </video>
      )}

      {activeTrack.type === 'YOUTUBE' && (
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-black shadow-lg">
          <iframe
            className="absolute inset-0 h-full w-full"
            src={activeTrack.url}
            title={activeTrack.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Playlist tracks list */}
      {tracks.length > 1 && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <label className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 mb-2.5 block">
            Pistas disponibles ({tracks.length})
          </label>
          <div className="space-y-2">
            {tracks.map((track, index) => {
              const isActive = index === activeTrackIndex
              return (
                <button
                  key={track.id}
                  onClick={() => setActiveTrackIndex(index)}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                    isActive
                      ? 'border-[#ED2C71] bg-[#FEF1F6]/30 shadow-sm'
                      : 'border-gray-200 bg-white hover:bg-gray-50/70'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all ${
                        isActive
                          ? 'border-[#ED2C71]/30 bg-white shadow-sm'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      {track.type === 'AUDIO' && (
                        <Music size={16} className={isActive ? 'text-[#ED2C71]' : 'text-gray-500'} />
                      )}
                      {track.type === 'VIDEO' && (
                        <Video size={16} className={isActive ? 'text-[#ED2C71]' : 'text-gray-500'} />
                      )}
                      {track.type === 'YOUTUBE' && (
                        <LinkIcon size={16} className={isActive ? 'text-[#ED2C71]' : 'text-gray-500'} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`truncate text-sm font-bold leading-tight ${
                          isActive ? 'text-gray-950' : 'text-gray-800'
                        }`}
                      >
                        {track.title}
                      </p>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mt-0.5">
                        {track.type === 'YOUTUBE' ? 'YouTube' : track.type}
                      </span>
                    </div>
                  </div>

                  {isActive && track.type === 'AUDIO' && isPlaying && (
                    <div className="eq-container shrink-0 scale-75 transform origin-right">
                      <div className="eq-bar eq-bar-active-1" />
                      <div className="eq-bar eq-bar-active-2" />
                      <div className="eq-bar eq-bar-active-3" />
                      <div className="eq-bar eq-bar-active-4" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
