'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  steps: string[]
  title: string
}

export default function RecipeStepsPlayer({ steps, title }: Props) {
  const [currentStep, setCurrentStep] = useState<number>(-1) // -1 = not started
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [supported, setSupported] = useState(false)
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])
  const currentStepRef = useRef(currentStep)
  currentStepRef.current = currentStep

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      setSupported(true)
    }
    return () => {
      window.speechSynthesis?.cancel()
    }
  }, [])

  useEffect(() => {
    if (currentStep >= 0 && stepRefs.current[currentStep]) {
      stepRefs.current[currentStep]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentStep])

  function speak(index: number) {
    if (!supported) return
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(steps[index])
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.lang = 'en-US'
    utterance.onend = () => {
      const next = index + 1
      if (next < steps.length) {
        setCurrentStep(next)
        speak(next)
      } else {
        // All steps done
        setIsPlaying(false)
        setIsPaused(false)
        setCurrentStep(-1)
      }
    }
    utterance.onerror = () => {
      setIsPlaying(false)
      setIsPaused(false)
    }

    setCurrentStep(index)
    setIsPlaying(true)
    setIsPaused(false)
    window.speechSynthesis.speak(utterance)
  }

  function handlePlay() {
    speak(0)
  }

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
    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentStep(-1)
  }

  function handlePrev() {
    const prev = currentStep - 1
    if (prev >= 0) speak(prev)
  }

  function handleNext() {
    const next = currentStep + 1
    if (next < steps.length) speak(next)
  }

  const isActive = isPlaying || isPaused
  const stepPreview = currentStep >= 0
    ? steps[currentStep].length > 50
      ? steps[currentStep].slice(0, 50) + '…'
      : steps[currentStep]
    : null

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
                  border: active
                    ? '1.5px solid var(--accent)'
                    : '1.5px solid var(--border)',
                  borderLeft: active ? '4px solid var(--accent)' : undefined,
                }}
              >
                <div
                  className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold"
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, #C8490A, #F97316)'
                      : 'linear-gradient(135deg, #C8490A, #F97316)',
                    color: '#fff',
                  }}
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
          <div className="max-w-2xl mx-auto">
            {!isActive ? (
              /* Idle state — show Start button */
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent)' }}>
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                  </svg>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    Audio Guide
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>· {steps.length} steps</span>
                </div>
                <button
                  onClick={handlePlay}
                  className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:opacity-85 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #C8490A, #F97316)', color: '#fff' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Start Reading
                </button>
              </div>
            ) : (
              /* Active state — show controls */
              <div className="space-y-2">
                {/* Step info */}
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent)' }}>
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  </svg>
                  <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                    Step {currentStep + 1} of {steps.length}
                  </span>
                  {stepPreview && (
                    <span className="truncate hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
                      — {stepPreview}
                    </span>
                  )}
                </div>
                {/* Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrev}
                    disabled={currentStep <= 0}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2"/>
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
                    onClick={handleNext}
                    disabled={currentStep >= steps.length - 1}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
                    Next
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2"/>
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
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
