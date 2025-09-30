import { useEffect, useMemo, useRef, useState } from 'react'
import Header from '../components/Header'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/button'
import { Timer, CheckCircle, XCircle, RefreshCcw, Video, Download, StopCircle, Play, Mic, Camera, Bot } from 'lucide-react'

const QUESTION_BANK = {
  general: [
    { q: 'Tell me about yourself.', a: null },
    { q: 'What are your strengths and weaknesses?', a: null },
    { q: 'Describe a challenging problem you solved.', a: null },
  ],
  engineering: [
    { q: 'Explain event loop in JavaScript.', a: 'Single-threaded mechanism handling async tasks via queue and call stack.' },
    { q: 'What is a RESTful API?', a: 'Architecture style using stateless operations over HTTP with resources identified by URIs.' },
    { q: 'SQL vs NoSQL: when to use which?', a: 'SQL for structured, relational data; NoSQL for flexible schema, horizontal scale.' },
  ],
  finance: [
    { q: 'What is NPV and how is it used?', a: 'Net present value of cash flows; positive NPV implies value creation.' },
    { q: 'Walk me through a DCF.', a: 'Project FCFs, discount at WACC, add terminal value, adjust for net debt.' },
  ],
}

export default function MockInterview() {
  const [track, setTrack] = useState('general')
  const [duration, setDuration] = useState(5) // minutes
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [notes, setNotes] = useState('')
  const [scores, setScores] = useState([]) // [{q, score}]
  const [timeLeft, setTimeLeft] = useState(0)
  const timerRef = useRef(null)
  const videoRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const [recording, setRecording] = useState(false)
  const [recordedBlobs, setRecordedBlobs] = useState([])
  const streamRef = useRef(null)
  const [finishedAt, setFinishedAt] = useState(null)
  const [difficulty, setDifficulty] = useState('easy') // easy | medium | hard
  const [perQuestionSec, setPerQuestionSec] = useState(60)
  const [qTimeLeft, setQTimeLeft] = useState(0)
  const qTimerRef = useRef(null)
  const [countdown, setCountdown] = useState(0)
  const [showHints, setShowHints] = useState(true)
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [micReady, setMicReady] = useState(false)
  const [camReady, setCamReady] = useState(false)
  // audio level + speaking delay
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const dataArrayRef = useRef(null)
  const rafRef = useRef(null)
  const [level, setLevel] = useState(0) // 0..1
  const [delays, setDelays] = useState({}) // index -> seconds
  const startSpeakRef = useRef(null)
  const triggeredRef = useRef(false)

  const questions = useMemo(() => {
    // In a real app we could vary question pool by difficulty. For now just reuse with slicing.
    const base = QUESTION_BANK[track] || QUESTION_BANK.general
    if (difficulty === 'hard') return base.concat(base).slice(0, Math.max(5, base.length))
    if (difficulty === 'medium') return base
    return base.slice(0, Math.min(3, base.length))
  }, [track, difficulty])
  const current = questions[index] || {}

  useEffect(() => {
    if (!started) return
    setTimeLeft(duration * 60)
    timerRef.current && clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          // auto-finish and save when time runs out
          setStarted(false)
          stopRecording()
          setFinishedAt(new Date().toISOString())
          saveSession()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => timerRef.current && clearInterval(timerRef.current)
  }, [started, duration])

  const setupCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      // set readiness
      const hasVideo = stream.getVideoTracks().some(t => t.readyState === 'live')
      const hasAudio = stream.getAudioTracks().some(t => t.readyState === 'live')
      setCamReady(hasVideo)
      setMicReady(hasAudio)

      // audio context + analyser for level metering
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        if (AudioCtx) {
          const ctx = new AudioCtx()
          audioCtxRef.current = ctx
          const source = ctx.createMediaStreamSource(stream)
          const analyser = ctx.createAnalyser()
          analyser.fftSize = 512
          analyserRef.current = analyser
          source.connect(analyser)
          const data = new Uint8Array(analyser.frequencyBinCount)
          dataArrayRef.current = data
          const loop = () => {
            analyser.getByteTimeDomainData(data)
            // compute RMS
            let sum = 0
            for (let i=0;i<data.length;i++) { const v = (data[i]-128)/128; sum += v*v }
            const rms = Math.sqrt(sum/data.length)
            setLevel(rms)
            rafRef.current = requestAnimationFrame(loop)
          }
          rafRef.current = requestAnimationFrame(loop)
        }
      } catch {}
      
    } catch (e) {
      console.error('Failed to access camera/mic', e)
      alert('Please allow camera and microphone permissions to proceed.')
    }
  }

  const onStart = async () => {
    setScores([])
    setNotes('')
    setIndex(0)
    await setupCamera()
    // 3-second overlay countdown
    setCountdown(3)
    const i = setInterval(() => setCountdown(c => {
      if (c <= 1) { clearInterval(i); setCountdown(0); setStarted(true) }
      return c - 1
    }), 1000)
  }

  const onNext = () => {
    if (index < questions.length - 1) setIndex(index + 1)
  }
  const onPrev = () => {
    if (index > 0) setIndex(index - 1)
  }

  const mark = (value) => {
    // value: 1 (good) or 0 (needs work)
    setScores(prev => {
      const copy = prev.filter(s => s.q !== current.q)
      copy.push({ q: current.q, score: value })
      return copy
    })
  }

  const percent = scores.length > 0 ? Math.round((scores.reduce((s, x) => s + x.score, 0) / scores.length) * 100) : 0

  const startRecording = () => {
    try {
      const stream = streamRef.current
      if (!stream) return alert('Camera not ready')
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      const chunks = []
      mr.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data) }
      mr.onstop = () => setRecordedBlobs(chunks)
      mr.start(200) // gather in chunks
      setRecording(true)
    } catch (e) {
      console.error('Failed to start recording', e)
      alert('Recording not supported in this browser.')
    }
  }

  const stopRecording = () => {
    try {
      mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive' && mediaRecorderRef.current.stop()
      setRecording(false)
    } catch {}
  }

  const downloadRecording = () => {
    if (!recordedBlobs.length) return alert('No recording available')
    const blob = new Blob(recordedBlobs, { type: 'video/webm' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mock-interview-${track}.webm`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  useEffect(() => () => {
    // cleanup streams on unmount
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    try { audioCtxRef.current && audioCtxRef.current.close() } catch {}
  }, [])

  // Per-question timer
  useEffect(() => {
    if (!started) return
    qTimerRef.current && clearInterval(qTimerRef.current)
    setQTimeLeft(perQuestionSec)
    // start speak delay tracking for this question
    startSpeakRef.current = Date.now()
    triggeredRef.current = false
    qTimerRef.current = setInterval(() => {
      setQTimeLeft(t => {
        if (t <= 1) {
          // auto-advance
          if (index < questions.length - 1) setIndex(i => i + 1)
          return perQuestionSec
        }
        return t - 1
      })
    }, 1000)
    return () => qTimerRef.current && clearInterval(qTimerRef.current)
  }, [started, index, perQuestionSec, questions.length])

  // Detect start-speaking delay via level threshold
  useEffect(() => {
    if (!started) return
    const THRESH = 0.06 // tune
    const WINDOW_OK = 3 // require N consecutive frames above threshold
    let okCount = 0
    const id = setInterval(() => {
      if (triggeredRef.current) return
      if (level > THRESH) {
        okCount++
        if (okCount >= WINDOW_OK) {
          triggeredRef.current = true
          const sec = Math.max(0, (Date.now() - (startSpeakRef.current || Date.now()))/1000)
          setDelays(prev => ({ ...prev, [index]: Number(sec.toFixed(1)) }))
        }
      } else {
        okCount = 0
      }
    }, 100)
    return () => clearInterval(id)
  }, [started, index, level])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (!started) return
      if (e.key === 'n' || e.key === 'ArrowRight') onNext()
      if (e.key === 'p' || e.key === 'ArrowLeft') onPrev()
      if (e.key.toLowerCase() === 'g') mark(1)
      if (e.key.toLowerCase() === 'w') mark(0)
      if (e.key.toLowerCase() === 'r') {
        if (!recording) startRecording(); else stopRecording()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [started, recording, index])

  const finishSession = () => {
    setStarted(false)
    stopRecording()
    setFinishedAt(new Date().toISOString())
    saveSession()
    setShowFinishModal(true)
  }

  const saveSession = () => {
    try {
      const storeKey = 'mock_sessions'
      const prev = JSON.parse(localStorage.getItem(storeKey) || '[]')
      const session = {
        id: `${Date.now()}`,
        track,
        duration,
        percent,
        questions: questions.map(q => q.q),
        scores,
        notesLength: notes?.length || 0,
        finishedAt: finishedAt || new Date().toISOString()
      }
      const next = [session, ...prev].slice(0, 20) // keep last 20
      localStorage.setItem(storeKey, JSON.stringify(next))
    } catch (e) {
      // ignore localStorage errors
    }
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Mock Interview</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Timer className="w-4 h-4" /> {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </div>
          </div>

          {/* Pre-Start Setup Screen */}
          {!started && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                {/* Media Setup card */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Media Setup</h2>
                  </div>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <div className="flex items-center gap-2 text-gray-800"><Mic className="w-5 h-5"/> Microphone</div>
                      <div className={`text-sm inline-flex items-center gap-1 ${micReady ? 'text-green-600' : 'text-gray-500'}`}>{micReady ? <><CheckCircle className="w-4 h-4"/> Ready</> : '—'}</div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <div className="flex items-center gap-2 text-gray-800"><Camera className="w-5 h-5"/> Camera</div>
                      <div className={`text-sm inline-flex items-center gap-1 ${camReady ? 'text-green-600' : 'text-gray-500'}`}>{camReady ? <><CheckCircle className="w-4 h-4"/> Ready</> : '—'}</div>
                    </div>
                  </div>
                  <div className="relative aspect-video bg-black/80 rounded-lg overflow-hidden border border-gray-200">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Button variant="outline" onClick={setupCamera}>Allow Media Access</Button>
                    <Button onClick={onStart} disabled={!micReady || !camReady} className="bg-primary-600 text-white hover:bg-primary-700"><Play className="w-4 h-4 mr-1"/>Start Interview</Button>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-4">
                {/* AI Instructions card */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-2 text-primary-700"><Bot className="w-5 h-5"/><h3 className="font-semibold">AI Interview Instructions</h3></div>
                  <p className="text-sm text-gray-600 mb-3">This interview consists of 3–5 questions and typically takes 3–10 minutes.</p>
                  <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                    <li>Answer each question thoughtfully and concisely.</li>
                    <li>You can record video or type notes while responding.</li>
                    <li>Use STAR: Situation, Task, Action, Result.</li>
                    <li>You can switch tracks and difficulty before starting.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Controls + Layout (shown when started) */}
          {started && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-12 space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                <div className="flex gap-3 items-center">
                  <label className="text-sm text-gray-700">Track</label>
                  <select className="border rounded p-2" value={track} onChange={e => setTrack(e.target.value)} disabled={started}>
                    <option value="general">General</option>
                    <option value="engineering">Engineering</option>
                    <option value="finance">Finance</option>
                  </select>
                  <label className="text-sm text-gray-700">Difficulty</label>
                  <select className="border rounded p-2" value={difficulty} onChange={e => setDifficulty(e.target.value)} disabled={started}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                  <label className="text-sm text-gray-700">Duration</label>
                  <select className="border rounded p-2" value={duration} onChange={e => setDuration(Number(e.target.value))} disabled={started}>
                    {[5,10,15].map(m => <option key={m} value={m}>{m} min</option>)}
                  </select>
                  <label className="text-sm text-gray-700">Per Qn</label>
                  <select className="border rounded p-2" value={perQuestionSec} onChange={e => setPerQuestionSec(Number(e.target.value))} disabled={!started}>
                    {[30,45,60,90].map(s => <option key={s} value={s}>{s}s</option>)}
                  </select>
                  <label className="text-sm text-gray-700 flex items-center gap-2"><input type="checkbox" className="accent-primary-600" checked={showHints} onChange={e => setShowHints(e.target.checked)} /> Hints</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={onStart} disabled={started}><Play className="w-4 h-4 mr-1"/>Start Interview</Button>
                  {!recording ? (
                    <Button variant="outline" onClick={startRecording} disabled={!started}><Video className="w-4 h-4 mr-1"/>Record</Button>
                  ) : (
                    <Button variant="destructive" onClick={stopRecording}><StopCircle className="w-4 h-4 mr-1"/>Stop</Button>
                  )}
                  <Button variant="outline" onClick={() => { setStarted(false); setTimeLeft(0); stopRecording(); }}><RefreshCcw className="w-4 h-4 mr-1"/>Reset</Button>
                  <Button variant="outline" onClick={downloadRecording} disabled={!recordedBlobs.length}><Download className="w-4 h-4 mr-1"/>Download</Button>
                  <Button variant="outline" onClick={finishSession} disabled={!started}>Finish</Button>
                </div>
              </div>

              {/* Video + Current Question */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div className="w-full">
                    <div className="relative aspect-video bg-black/5 rounded overflow-hidden border border-gray-200">
                      <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                      {countdown > 0 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <div className="text-6xl font-bold text-white">{countdown}</div>
                        </div>
                      )}
                      {/* mic level meter */}
                      <div className="absolute bottom-2 left-2 right-2 h-2 bg-black/30 rounded">
                        <div className="h-2 bg-green-500 rounded" style={{ width: `${Math.min(100, Math.round(level*200))}%` }}></div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-gray-600">Question {index + 1} of {questions.length}</div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={onPrev} disabled={index === 0}>Prev</Button>
                        <Button size="sm" variant="outline" onClick={onNext} disabled={index === questions.length - 1}>Next</Button>
                      </div>
                    </div>
                    {/* Progress + per-question timer */}
                    <div className="mb-3">
                      <div className="h-2 bg-gray-100 rounded">
                        <div className="h-2 bg-primary-600 rounded" style={{ width: `${((index+1)/questions.length)*100}%` }}></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Time left for this question: {qTimeLeft}s</div>
                    </div>
                    <p className="text-lg font-medium text-gray-900 mb-1">{current.q}</p>
                    {showHints && current.a && <p className="text-sm text-gray-600 mb-2">Hint: {current.a}</p>}
                    <div className="text-xs text-gray-500 mb-3">Start speaking delay: <span className="font-semibold">{delays[index] ?? '—'}{delays[index] ? 's' : ''}</span></div>
                    <div className="flex gap-2 mb-4">
                      <Button variant="outline" onClick={() => mark(1)}><CheckCircle className="w-4 h-4 mr-1"/>Good</Button>
                      <Button variant="outline" onClick={() => mark(0)}><XCircle className="w-4 h-4 mr-1"/>Needs Work</Button>
                    </div>
                    <textarea className="w-full border rounded p-3" rows={4} placeholder="Your notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Compact question indicators */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm font-semibold text-gray-900 mb-3">Questions</div>
                <div className="flex flex-wrap gap-2">
                  {questions.map((q, i) => (
                    <button
                      key={i}
                      className={`px-3 py-1 rounded-full text-sm border transition ${i === index ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                      onClick={() => setIndex(i)}
                      disabled={!started}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Summary</h3>
            <div className="text-gray-700 text-sm">Marked answers: {scores.length} / {questions.length} · Score: <span className="font-semibold">{percent}%</span></div>
            <div className="text-gray-700 text-sm mt-1">Avg. start delay: <span className="font-semibold">{(() => { const vals = Object.values(delays); if (!vals.length) return '—'; const avg = vals.reduce((a,b)=>a+Number(b||0),0)/vals.length; return `${avg.toFixed(1)}s`; })()}</span></div>
          </div>
        </motion.div>
      </div>
      {/* Finish Modal */}
      {showFinishModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Interview Finished</h3>
            <div className="text-sm text-gray-700 mb-4">Track: <span className="font-medium">{track}</span> · Score: <span className="font-semibold">{percent}%</span></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowFinishModal(false)}>Close</Button>
              <Button variant="outline" onClick={downloadRecording} disabled={!recordedBlobs.length}><Download className="w-4 h-4 mr-1"/>Download Video</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
