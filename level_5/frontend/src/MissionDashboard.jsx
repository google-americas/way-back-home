import { useState, useEffect, useRef } from 'react';
import { Radio, Activity, Send, Terminal, LayoutTemplate } from 'lucide-react';

export default function MissionDashboard() {
    // --- State ---
    const [pods, setPods] = useState([]);
    const [logs, setLogs] = useState([]);
    const [signalStrength, setSignalStrength] = useState(0);
    const [customFormation, setCustomFormation] = useState("");
    const [isTransmitting, setIsTransmitting] = useState(false);

    // Drag Refs
    const draggedIdRef = useRef(null);
    const [draggedPod, setDraggedPod] = useState(null); // For UI visual feedback if needed
    const logsEndRef = useRef(null);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    // Active Formation Ref (to avoid stale closures in SSE callbacks)
    const activeFormationRef = useRef("RANDOM");

    // Transmission Ref to pause signal updates during overlay
    const isTransmittingRef = useRef(false);
    useEffect(() => { isTransmittingRef.current = isTransmitting; }, [isTransmitting]);

    // Signal Animation Loop
    useEffect(() => {
        const interval = setInterval(() => {
            setSignalStrength(prev => {
                // Freeze signal during transmission
                if (isTransmittingRef.current) return prev;

                const isRandom = activeFormationRef.current === 'RANDOM';

                if (isRandom) {
                    // Chaotic fluctuation capped at 60
                    // Pick a random target between 0 and 60
                    const target = Math.random() * 60;
                    // Move 20% of the way there immediately (very unstable)
                    return prev + (target - prev) * 0.2;
                } else {
                    // Fast linear fill to 100%
                    const target = 100;
                    const quickStep = 4; // 4% per 30ms

                    if (Math.abs(prev - target) < quickStep) return target;
                    if (prev < target) return Math.min(100, prev + quickStep);
                    if (prev > target) return Math.max(0, prev - quickStep);
                    return prev;
                }
            });
        }, 30); // 30ms ~33fps

        return () => clearInterval(interval);
    }, []);

    // --- Data Stream ---
    useEffect(() => {
        console.log("Connecting to Mission Stream...");
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const sse = new EventSource(`${apiUrl}/stream`, { withCredentials: true });
        // Pod Visuals
        sse.addEventListener("pod_update", (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.pod) {
                    setPods(prev => {
                        // Skip update if this pod is currently being dragged
                        if (draggedIdRef.current === data.pod.id) return prev;

                        const existing = prev.find(p => p.id === data.pod.id);
                        if (existing) {
                            if (existing.x !== data.pod.x || existing.y !== data.pod.y) {
                                return prev.map(p => p.id === data.pod.id ? data.pod : p);
                            }
                            return prev;
                        } else {
                            return [...prev, data.pod].sort((a, b) => a.id - b.id);
                        }
                    });

                    // Occasional log for movement confirmation
                    if (Math.random() > 0.98) {
                        addLog(`POD-${data.pod.id} position confirmed`);
                    }
                }
            } catch (e) {
                console.error("Stream Parse Error", e);
            }
        });

        // Formation Listener - Only updates Ref now
        sse.addEventListener("formation_update", (event) => {
            try {
                const data = JSON.parse(event.data);
                // Only update if no manual override is active
                if (data.formation) {
                    activeFormationRef.current = data.formation;
                }
            } catch (e) { }
        });

        // Removed defunct onmessage handler

        sse.onerror = (e) => {
            console.error("Stream Disconnected, retrying...");
            sse.close();
        };

        return () => {
            console.log("Closing Stream");
            sse.close();
        };
    }, []);

    // --- Helpers ---
    const addLog = (msg) => {
        setLogs(prev => {
            const newLogs = [...prev, `[${new Date().toLocaleTimeString().split(' ')[0]}] ${msg}`];
            if (newLogs.length > 100) return newLogs.slice(newLogs.length - 100);
            return newLogs;
        });
    };

    const requestFormation = async (fmt) => {
        addLog(`CMD >> FORMATION_REQ: ${fmt}`);
        setIsTransmitting(true);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            await fetch(`${apiUrl}/formation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formation: fmt })
            });

            setIsTransmitting(false);
            addLog(`TX_COMPLETE: ${fmt} uplink established`);
            setSignalStrength(s => Math.max(0, s - 50)); // Power drain on transmission end


        } catch (e) {
            addLog(`ERR >> TX_FAIL: ${e.message}`);
            setIsTransmitting(false);
        }
    };

    // --- Drag Handlers ---
    const handleMouseDown = (e, podId) => {
        e.preventDefault();
        draggedIdRef.current = podId;
        setDraggedPod(podId);
    };

    const handleMouseMove = (e) => {
        if (draggedIdRef.current !== null) {
            const rect = e.currentTarget.getBoundingClientRect();
            // Calculate relative position within the dashboard container
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            setPods(prev => prev.map(p => {
                if (p.id === draggedIdRef.current) {
                    return { ...p, x, y };
                }
                return p;
            }));
        }
    };

    const handleMouseUp = () => {
        if (draggedIdRef.current !== null) {
            const id = draggedIdRef.current;
            const pod = pods.find(p => p.id === id);

            if (pod) {
                // Determine API URL for persistence
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

                // Fire and forget update
                fetch(`${apiUrl}/update_pod`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: pod.id, x: Math.round(pod.x), y: Math.round(pod.y) })
                }).catch(e => console.error("Failed to persist drag:", e));

                addLog(`POD-${id} relocated manually`);

                // Trigger chaotic signal instability
                activeFormationRef.current = 'RANDOM';
                addLog(`WARN >> MANUAL_OVERRIDE: SIGNAL_UNSTABLE`);
            }

            draggedIdRef.current = null;
            setDraggedPod(null);
        }
    };

    // Scramble Effect State
    const [scrambleText, setScrambleText] = useState("");

    // Scramble Effect Loop
    useEffect(() => {
        if (!isTransmitting) return;
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
        const interval = setInterval(() => {
            const txt = Array(20).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join("");
            setScrambleText(txt);
        }, 50);
        return () => clearInterval(interval);
    }, [isTransmitting]);

    // --- Render ---
    return (
        <div
            className="relative w-screen h-screen bg-black overflow-hidden font-mono select-none text-white"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* TRANSMISSION OVERLAY */}
            {isTransmitting && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px] pointer-events-none">
                    <div className="flex flex-col items-center gap-4">
                        <div className="text-4xl font-bold text-cyan-500 animate-pulse tracking-widest relative">
                            TRANSMITTING SEQUENCE
                            <div className="absolute -inset-1 blur-lg bg-cyan-500/30 animate-pulse"></div>
                        </div>
                        <div className="w-64 h-2 bg-slate-800 rounded overflow-hidden border border-slate-700 relative">
                            <div className="h-full bg-cyan-500 animate-[progress_15s_linear_forwards] relative z-10"></div>
                            {/* Glitch bar */}
                            <div className="absolute inset-0 bg-white/20 animate-ping"></div>
                        </div>
                        <div className="text-xs text-slate-400 font-mono flex flex-col items-center gap-1">
                            <span>UPLINKING TO CONSTELLATION...</span>
                            <span className="text-cyan-600 font-bold tracking-widest">{scrambleText}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. LAYER: STARFIELD & VISUALIZER (The "Window") */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2672&auto=format&fit=crop')] bg-cover opacity-60"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-80"></div>

                {/* Visualizer Mesh */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {pods.map((p1, i) =>
                        pods.slice(i + 1).map(p2 => {
                            const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                            if (dist < 150) {
                                return (
                                    <line
                                        key={`${p1.id}-${p2.id}`}
                                        x1={p1.x} y1={p1.y}
                                        x2={p2.x} y2={p2.y}
                                        stroke="#22d3ee"
                                        strokeWidth={Math.max(0.2, (150 - dist) / 150)}
                                        opacity="0.4"
                                    />
                                )
                            }
                            return null;
                        })
                    )}
                </svg>

                {/* PODs */}
                {pods.map(pod => (
                    <div
                        key={pod.id}
                        style={{
                            left: pod.x,
                            top: pod.y,
                            transition: draggedIdRef.current === pod.id ? 'none' : 'all 3s ease-in-out',
                            cursor: draggedIdRef.current === pod.id ? 'grabbing' : 'grab',
                            zIndex: draggedIdRef.current === pod.id ? 50 : 10
                        }}
                        onMouseDown={(e) => handleMouseDown(e, pod.id)}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    >
                        <div className={`relative group transition-transform duration-300 ${draggedIdRef.current === pod.id ? 'scale-125' : 'hover:scale-110'} drop-shadow-[0_0_10px_#22d3ee]`}>
                            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="8" cy="8" r="6" className="fill-slate-800 stroke-cyan-500/50 spin-slow" strokeWidth="1" />
                                <circle cx="32" cy="8" r="6" className="fill-slate-800 stroke-cyan-500/50 spin-slow" strokeWidth="1" />
                                <circle cx="8" cy="32" r="6" className="fill-slate-800 stroke-cyan-500/50 spin-slow" strokeWidth="1" />
                                <circle cx="32" cy="32" r="6" className="fill-slate-800 stroke-cyan-500/50 spin-slow" strokeWidth="1" />
                                <path d="M8 8L32 32M32 8L8 32" stroke="#475569" strokeWidth="2" />
                                <circle cx="20" cy="20" r="5" className="fill-cyan-500" />
                                <circle cx="20" cy="20" r="2" fill="white">
                                    <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
                                </circle>
                            </svg>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 text-[9px] font-mono text-cyan-300 opacity-70 whitespace-nowrap mt-1 bg-black/60 px-1 rounded border border-cyan-900 pointer-events-none">
                                POD-{pod.id.toString().padStart(2, '0')}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 2. LAYER: HUD OVERLAY - 2 COLUMN LAYOUT */}
            <div className="absolute inset-0 z-20 p-6 pointer-events-none flex justify-between">

                {/* LEFT COLUMN */}
                <div className="flex flex-col justify-between h-full max-w-md pointer-events-none">

                    {/* Top Left: Title & Status */}
                    <div className="flex flex-col gap-2 pointer-events-auto">
                        <h1 className="text-4xl font-black text-cyan-400 tracking-wider drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                            MISSION CHARLIE
                        </h1>
                        <div className="bg-slate-950/80 backdrop-blur border border-slate-800 p-2 px-4 rounded-lg text-xs text-slate-400 self-start">
                            STATUS: <span className="text-green-400 animate-pulse">LIVE LINK ESTABLISHED</span>
                        </div>
                    </div>

                    {/* Bottom Left: Formation Panel */}
                    <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 p-6 rounded-tl-xl rounded-tr-xl rounded-br-xl pointer-events-auto">
                        <h2 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                            <LayoutTemplate className="w-4 h-4" /> FORMATION OVERRIDE
                        </h2>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {['CIRCLE', 'STAR', 'X', 'LINE', 'PARABOLA', 'RANDOM'].map(fmt => (
                                <button
                                    key={fmt}
                                    onClick={() => requestFormation(fmt)}
                                    className="px-2 py-3 bg-slate-900 border border-slate-700 hover:border-cyan-500 hover:bg-cyan-900/20 text-xs font-bold text-cyan-300 rounded transition-all active:scale-95"
                                >
                                    {fmt}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={customFormation}
                                onChange={(e) => setCustomFormation(e.target.value)}
                                placeholder="CUSTOM CMD..."
                                className="flex-1 bg-black/50 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none placeholder-slate-600"
                            />
                            <button
                                onClick={() => requestFormation(customFormation)}
                                className="p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="flex flex-col gap-4 h-full w-[350px] pointer-events-none">

                    {/* Top Right: Mission Control */}
                    <div className="bg-slate-950/80 backdrop-blur border border-slate-800 p-4 rounded-lg pointer-events-auto shrink-0">
                        <h1 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                            <Activity className="w-5 h-5" /> MISSION CONTROL
                        </h1>
                        <div className="mt-2 text-xs text-slate-500">SIGNAL STRENGTH</div>
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-32 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                                <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${signalStrength}%` }}></div>
                            </div>
                            <span className="text-cyan-500 font-bold">{Math.floor(signalStrength)}%</span>
                        </div>
                    </div>

                    {/* Fill Right: Logs Panel */}
                    <div className="flex-1 bg-slate-950/90 backdrop-blur-md border border-slate-800 p-4 rounded-lg pointer-events-auto flex flex-col overflow-hidden">
                        <h2 className="text-sm font-bold text-slate-400 mb-2 flex items-center gap-2 border-b border-slate-800 pb-2 shrink-0">
                            <Terminal className="w-4 h-4" /> SYSTEM LOGS
                        </h2>
                        <div className="flex-1 overflow-y-auto space-y-1 font-mono text-xs pr-2">
                            {logs.length === 0 && <div className="text-slate-600 italic">Waiting for telemetry...</div>}
                            {logs.map((log, i) => (
                                <div key={i} className="text-cyan-500/80 hover:text-white transition-colors break-words">
                                    {log}
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
