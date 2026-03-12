'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  steps: string[]
  title: string
}

type Speed = 0.7 | 0.9 | 1.3

const SPEEDS: { val: Speed; label: string }[] = [
  { val: 0.7, label: '0.7x' },
  { val: 0.9, label: '1x' },
  { val: 1.3, label: '1.3x' },
]

export default function RecipeStepsPlayer({ steps }: Props) {
  const [currentStep, setCurrentStep] = useState<number>(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [supported, setSupported] = useState(false)
  const [speed, setSpeed] = useState<Speed>(0.9)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('')

  const stepRefs = useRef<(HTMLDivElement | null)[]>([])
  // Generation counter — each call to speak() gets a unique gen.
  // Callbacks check their gen against current to detect if they're stale.
  const genRef = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    setSupported(true)

    function loadVoices() {
      const v = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'))
      setVoices(v)
      setSelectedVoiceURI(prev => prev || v[0]?.voiceURI || '')
    }
    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
      window.speechSynthesis.cancel()
    }
  }, [])

  useEffect(() => {
    if (currentStep >= 0 && stepRefs.current[currentStep]) {
      stepRefs.current[currentStep]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentStep])

  function speak(index: number, rateOverride?: Speed) {
    if (!supported) return
    const gen = ++genRef.current
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(steps[index])
    utterance.rate = rateOverride ?? speed
    utterance.pitch = 1
    utterance.lang = 'en-US'

    const voice = voices.find(v => v.voiceURI === selectedVoiceURI)
    if (voice) utterance.voice = voice

    utterance.onend = () => {
      if (genRef.current !== gen) return  // stale — a newer speak() has taken over
      const next = index + 1
      if (next < steps.length) {
        setCurrentStep(next)
        speak(next, rateOverride)
      } else {
        setIsPlaying(false)
        setIsPaused(false)
        setCurrentStep(-1)
      }
    }
    utterance.onerror = () => {
      if (genRef.current !== gen) return  // stale — ignore
      setIsPlaying(false)
      setIsPaused(false)
    }

    setCurrentStep(index)
    setIsPlaying(true)
    setIsPaused(false)
    window.speechSynthesis.speak(utterance)
  }

  function handlePlay() { speak(0) }
  function handlePause() {
    window.speechSynthesis.pause()
    setIsPaused(true)
    setIsPlaying(false)
  }
  function handleResume() {
    window.speechSynthesis.resume()
    setIsPlaying(true)
    setIsPaused(false)
  }
  function handleStop() {
    genRef.current++  // invalidate any in-flight utterance
    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentStep(-1)
  }
  function handlePrev() { if (currentStep > 0) speak(currentStep - 1) }
  function handleNext() { if (currentStep < steps.length - 1) speak(currentStep + 1) }
  function handleRepeat() { if (currentStep >= 0) speak(currentStep) }
  function handleSpeedChange(newSpeed: Speed) {
    setSpeed(newSpeed)
    if (isPlaying && currentStep >= 0) speak(currentStep, newSpeed)
  }

  const isActive = isPlaying || isPaused

  return (
    <>
      {/* Instructions section */}
      <section className="mb-5">
        <h2 className="font-display font-semibold text-lg mb-3" style={{ color: 'var(--text-primary)' }}>
          Instructions
        </h2>
        <div className="space-y-3">
          {steps.map((step, i) => {
            const active = currentStep === i
            return (
              <div
                key={i}
                ref={el => { stepRefs.current[i] = el }}
                className="flex gap-4 p-5 rounded-2xl transition-all duration-300"
                style={{
                  background: active ? 'var(--accent-muted)' : 'var(--card)',
                  border: active ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                  borderLeft: active ? '4px solid var(--accent)' : undefined,
                }}
              >
                <div
                  className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, #C8490A, #F97316)', color: '#fff' }}
                >
                  {i + 1}
                </div>
                <p className="text-sm leading-relaxed pt-1" style={{ color: 'var(--text-primary)' }}>
                  {step}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Sticky audio bar */}
      {supported && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3"
          style={{
            background: 'var(--card)',
            borderTop: '1.5px solid var(--border)',
            boxShadow: '0 -4px 16px rgba(28,16,7,0.10)',
          }}
        >
          <div className="max-w-2xl mx-auto space-y-2">

            {/* Row 1: label / step info */}
            <div className="flex items-center justify-between gap-2">
              {!isActive ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent)', flexShrink: 0 }}>
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                  </svg>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Audio Guide</span>
                  <span style={{ color: 'var(--text-muted)' }}>· {steps.length} steps</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs min-w-0" style={{ color: 'var(--text-secondary)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent)', flexShrink: 0 }}>
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  </svg>
                  <span className="font-semibold shrink-0" style={{ color: 'var(--accent)' }}>
                    Step {currentStep + 1} of {steps.length}
                  </span>
                  {currentStep >= 0 && (
                    <span className="truncate hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
                      — {steps[currentStep].slice(0, 50)}{steps[currentStep].length > 50 ? '…' : ''}
                    </span>
                  )}
                </div>
              )}

              {/* Speed pills — always visible */}
              <div className="flex items-center gap-1 shrink-0">
                {SPEEDS.map(({ val, label }) => (
                  <button
                    key={val}
                    onClick={() => handleSpeedChange(val)}
                    className="text-xs font-medium px-2 py-1 rounded-md transition-all hover:opacity-80 active:scale-95"
                    style={{
                      background: speed === val ? 'linear-gradient(135deg, #C8490A, #F97316)' : 'var(--bg)',
                      color: speed === val ? '#fff' : 'var(--text-muted)',
                      border: speed === val ? 'none' : '1.5px solid var(--border)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: playback controls — always rendered, Start Reading when idle */}
            <div className="flex items-center gap-2">
              {!isActive ? (
                /* Idle: voice picker + Start button */
                <>
                  {voices.length > 1 && (
                    <select
                      value={selectedVoiceURI}
                      onChange={e => setSelectedVoiceURI(e.target.value)}
                      className="text-xs rounded-lg px-2 py-1 flex-1 min-w-0"
                      style={{
                        background: 'var(--bg)',
                        border: '1.5px solid var(--border)',
                        color: 'var(--text-secondary)',
                        maxWidth: '200px',
                      }}
                    >
                      {voices.map(v => (
                        <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={handlePlay}
                    className="ml-auto flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:opacity-85 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #C8490A, #F97316)', color: '#fff' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    Start Reading
                  </button>
                </>
              ) : (
                /* Active: Prev / Pause-Resume / Repeat / Next / Stop */
                <>
                  <button
                    onClick={handlePrev}
                    disabled={currentStep <= 0}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="19 20 9 12 19 4 19 20"/>
                      <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Prev
                  </button>

                  {isPlaying ? (
                    <button
                      onClick={handlePause}
                      className="flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-lg transition-all hover:opacity-85 active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #C8490A, #F97316)', color: '#fff' }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                      </svg>
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={handleResume}
                      className="flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-lg transition-all hover:opacity-85 active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #C8490A, #F97316)', color: '#fff' }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                      Resume
                    </button>
                  )}

                  <button
                    onClick={handleRepeat}
                    title="Repeat step"
                    className="flex items-center justify-center w-8 h-7 rounded-lg transition-all hover:opacity-80 active:scale-95"
                    style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="17 1 21 5 17 9"/>
                      <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                      <polyline points="7 23 3 19 7 15"/>
                      <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                    </svg>
                  </button>

                  <button
                    onClick={handleNext}
                    disabled={currentStep >= steps.length - 1}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
                    Next
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 4 15 12 5 20 5 4"/>
                      <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>

                  <button
                    onClick={handleStop}
                    className="ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80 active:scale-95"
                    style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text-muted)' }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                    </svg>
                    Stop
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  )
}
