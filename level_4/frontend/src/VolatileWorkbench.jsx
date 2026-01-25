
import React, { useState, useEffect, useRef, useCallback } from 'react';
import DraggablePart from './components/DraggablePart';
import { Mic, Radio, Archive, AlertTriangle, ShieldCheck, Activity, Radiation } from 'lucide-react';
import useGeminiSocket from './useGeminiSocket'; // Reuse existing hook or mock

// --- MOCK CONSTANTS (In real app, moved to DB) ---
const DRIVES = {
    "HYPERION-X": ["Warp Core", "Flux Pipe", "Ion Thruster"],
    "NOVA-V": ["Ion Thruster", "Warp Core", "Flux Pipe"],
    "OMEGA-9": ["Flux Pipe", "Ion Thruster", "Warp Core"],
    "GEMINI-MK1": ["Coolant Tank", "Servo", "Fuel Cell"],
    "APOLLO-13": ["Warp Core", "Coolant Tank", "Ion Thruster"],
    "VORTEX-7": ["Quantum Cell", "Graviton Coil", "Plasma Injector"],
    "CHRONOS-ALPHA": ["Shield Emitter", "Data Crystal", "Quantum Cell"],
    "NEBULA-Z": ["Plasma Injector", "Flux Pipe", "Graviton Coil"],
    "PULSAR-B": ["Data Crystal", "Servo", "Shield Emitter"],
    "TITAN-PRIME": ["Ion Thruster", "Quantum Cell", "Warp Core"]
};
const PART_TYPES = {
    "Warp Core": "core",
    "Flux Pipe": "fluid",
    "Ion Thruster": "engine",
    "Coolant Tank": "fluid",
    "Servo": "mech",
    "Fuel Cell": "core",
    "Quantum Cell": "core",
    "Graviton Coil": "mech",
    "Plasma Injector": "fluid",
    "Shield Emitter": "mech",
    "Data Crystal": "core"
};

const PART_HAZARDS = {
    "Warp Core": "RED",
    "Fuel Cell": "RED",
    "Quantum Cell": "RED",
    "Data Crystal": "RED",
    "Ion Thruster": "BLUE",
    "Servo": "BLUE",
    "Graviton Coil": "BLUE",
    "Shield Emitter": "BLUE",
    "Flux Pipe": "GREEN",
    "Coolant Tank": "GREEN",
    "Plasma Injector": "GREEN"
};

export default function VolatileWorkbench() {
    const [targetModel, setTargetModel] = useState("HYPERION-X");
    const [requiredSequence, setRequiredSequence] = useState([]);
    const [installedParts, setInstalledParts] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [bins, setBins] = useState({ RED: null, BLUE: null, GREEN: null });
    const [missionStatus, setMissionStatus] = useState("WAITING_START"); // WAITING_START, ASSEMBLY, COMPLETE, FAILED
    const [failureMessage, setFailureMessage] = useState("");
    const [socketStatus, setSocketStatus] = useState("DISCONNECTED");
    const [lastVoiceLog, setLastVoiceLog] = useState("");
    const [chatLogs, setChatLogs] = useState([]); // Array of { sender: 'USR'|'AI', text: string, timestamp: number }
    const [hasTriggeredHazard, setHasTriggeredHazard] = useState(false); // New state for deterministic hazard
    const [isDispatchThinking, setIsDispatchThinking] = useState(false); // New state for loading indicator
    const chatEndRef = useRef(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatLogs, isDispatchThinking]);

    // Socket Connection (Assume simple hook for now)
    // Replace URL with actual endpoint
    const socket = useRef(null);

    // Initial Setup
    const [mediaStream, setMediaStream] = useState(null);
    const audioContextRef = useRef(null);
    const processorRef = useRef(null);
    const sourceRef = useRef(null); // Keep reference to prevent Garbage Collection
    const gainNodeRef = useRef(null); // Keep reference to prevent Garbage Collection
    const renderIntervalRef = useRef(null);
    const nextAudioTime = useRef(0);

    // Initial Setup
    // Removed auto-connect on mount to allow user to initiate media first

    const startMission = async () => {
        try {
            // 1. Get Media (Screen + Mic)
            // Note: We need both. Usually prompt for Mic first, then Screen.
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true // Start by trying to get system audio
            });
            // We also need mic for voice commands "DISENGAGE"
            // Re-enable AutoGainControl to fix low volume
            const micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            const micLabel = micStream.getAudioTracks()[0].label;
            console.log("🎤 Active Microphone:", micLabel);

            // combine tracks if needed, or just allow the screen share to drive the video
            // For this specific dual-agent flow, the backend expects "realtime_input"

            setMediaStream(stream);

            // Init Game Logic
            const models = Object.keys(DRIVES);
            const randomModel = models[Math.floor(Math.random() * models.length)];
            setTargetModel(randomModel);
            const req = DRIVES[randomModel];
            setRequiredSequence(req);

            // Flexible Assembly: Init sparse array
            setInstalledParts(new Array(req.length).fill(null));

            dispenseParts();

            // 2. Connect Socket
            // Updated to port 8000 and new path structure
            // Random Session ID for multi-user isolation
            const sessionId = "session-" + Math.random().toString(36).substring(2, 9);
            console.log("Connecting with Session ID:", sessionId);
            // Dynamic URL for Cloud Run (https/wss) vs Local (http/ws)
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            let host = window.location.host;

            // Dev Fallback: If running on Vite port 5173, assume backend is at 8000
            if (host.includes(":5173")) {
                host = "localhost:8000";
            }

            const wsUrl = `${protocol}//${host}/ws/user1/${sessionId}`;
            // console.log("Attempting to connect to WS at", wsUrl);
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                // console.log("WebSocket Connection OPENED");
                setSocketStatus("CONNECTED");
                setMissionStatus("ASSEMBLY");
                startMediaStreaming(ws, stream, micStream);
            };

            ws.onclose = () => {
                console.log("WebSocket Connection CLOSED");
                setSocketStatus("DISCONNECTED");
            };
            ws.onerror = (error) => {
                console.error("WebSocket ERROR:", error);
            };
            ws.onmessage = (event) => {
                try {
                    // console.log("RAW WS MSG:", event.data); // Verbose log - disabled
                    const data = JSON.parse(event.data);

                    // 1. Handle Audio from Gemini Live (inlineData)
                    if (data?.content?.parts?.[0]?.inlineData?.data) {
                        // Decode base64 and play
                        const base64Audio = data.content.parts[0].inlineData.data;
                        playAudio(base64Audio);
                        setIsDispatchThinking(false); // Stop loading when agent speaks
                    }

                    // 2. Handle Text Transcripts
                    // ADK Schema: { inputTranscription: { text: "...", finished: true } }

                    // USER
                    const userTx = data.inputTranscription || data.inputAudioTranscription || data.input_audio_transcription;
                    if (userTx && (userTx.finished === true || userTx.finalTranscript || userTx.final_transcript)) {
                        const text = userTx.text || userTx.finalTranscript || userTx.final_transcript;
                        console.log("🗣️ USER:", text);
                        setChatLogs(prev => [...prev, { sender: 'USR', text, timestamp: Date.now() }]);
                        setIsDispatchThinking(true); // Start loading when user finishes speaking
                    }

                    // AGENT Text
                    const agentTx = data.outputTranscription || data.outputAudioTranscription || data.output_audio_transcription;
                    if (agentTx && (agentTx.finished === true || agentTx.finalTranscript || agentTx.final_transcript)) {
                        const text = agentTx.text || agentTx.finalTranscript || agentTx.final_transcript;
                        if (text && text.trim() !== "" && text !== "undefined") {
                            console.log("🤖 GEMINI:", text);
                            setChatLogs(prev => [...prev, { sender: 'AI', text, timestamp: Date.now() }]);
                            setIsDispatchThinking(false); // Stop loading when agent text is complete
                        }
                    }

                    // 3. Handle Tool Calls
                    // ADK Schema: { toolCall: { functionCalls: [...] } }
                    const toolCall = data.toolCall || data.tool_call;
                    if (toolCall && toolCall.functionCalls) {
                        toolCall.functionCalls.forEach(fc => {
                            const callText = `Executing: ${fc.name}(...)`;
                            console.log("🛠️ TOOL:", fc.name);
                            setChatLogs(prev => [...prev, { sender: 'AI', text: `🛠️ ${callText}`, timestamp: Date.now() }]);
                        });
                    }

                    if (data.type === 'HAZARD_NEUTRALIZED') {
                        handleHazardNeutralized();
                    }
                } catch (e) {
                    console.log("Error parsing WS message:", e);
                }
            };
            socket.current = ws;

        } catch (err) {
            console.error("Failed to start mission:", err);
            alert("PERMISSION DENIED: Screen and Mic access required for Mission Bravo.");
        }
    };

    const startMediaStreaming = (ws, screenStream, micStream) => {
        // AUDIO PROCESSING (Mic -> Base64 -> WS)
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });

        // Critical: Resume context if suspended (browser requirement)
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        const source = audioContextRef.current.createMediaStreamSource(micStream);
        sourceRef.current = source; // Persist source

        // Add Gain Node to boost volume
        const gainNode = audioContextRef.current.createGain();
        gainNode.gain.value = 5.0; // Boost volume 5x
        gainNodeRef.current = gainNode; // Persist gain node

        // Use ScriptProcessor for legacy simplicity or AudioWorklet for prod
        // Using ScriptProcessor for single-file conciseness
        const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (e) => {
            if (ws.readyState !== WebSocket.OPEN) return;

            const inputData = e.inputBuffer.getChannelData(0);

            // Check input volume on frontend (Lower threshold to catch quiet audio)
            // let sum = 0;
            // for(let i=0; i<inputData.length; i++) sum += inputData[i]*inputData[i];
            // const rms = Math.sqrt(sum / inputData.length);
            // if (rms > 0.001) { // Log even quiet audio
            //      console.log("🎤 Mic Input RMS:", rms.toFixed(4));
            // }

            // Convert Float32 to PCM 16-bit
            const pcmData = floatTo16BitPCM(inputData);
            const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));

            // New Format: Simple JSON with type: audio
            ws.send(JSON.stringify({
                type: "audio",
                data: base64Audio
            }));
        };

        source.connect(gainNode);
        gainNode.connect(processor);
        processor.connect(audioContextRef.current.destination);
        processorRef.current = processor;

        // VIDEO PROCESSING (Screen -> Base64 JPEG -> WS)
        const track = screenStream.getVideoTracks()[0];
        const imageCapture = new ImageCapture(track); // Note: ImageCapture might need polyfill in some browsers, using Canvas fallback is safer

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const video = document.createElement('video');
        video.srcObject = screenStream;
        video.play();

        renderIntervalRef.current = setInterval(() => {
            if (ws.readyState !== WebSocket.OPEN) return;

            // Draw video frame to canvas
            // Use full resolution for better text recognition
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const base64Img = canvas.toDataURL("image/jpeg", 0.6).split(',')[1];

            // console.log("Sending Video Frame...", base64Img.length);
            // New Format: Simple JSON with type: image
            ws.send(JSON.stringify({
                type: "image",
                mimeType: "image/jpeg",
                data: base64Img
            }));
        }, 200); // 5 FPS for smoother agent response
    };

    const floatTo16BitPCM = (input) => {
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return output;
    };

    const calculateRMS = (input) => {
        let sum = 0;
        for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
        return Math.sqrt(sum / input.length).toFixed(4);
    };

    const playAudio = (base64String) => {
        try {
            // 1. Sanitize Base64 (URL-safe -> Standard)
            const sanitized = base64String.replace(/-/g, '+').replace(/_/g, '/');
            const binaryString = atob(sanitized);

            // 2. Convert to Int16 -> Float32
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const int16 = new Int16Array(bytes.buffer);
            const float32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++) {
                float32[i] = int16[i] / 32768.0;
            }

            // 3. Play
            const ctx = audioContextRef.current;
            if (!ctx) return;

            // Gemini Live typically sends 24kHz
            const buffer = ctx.createBuffer(1, float32.length, 24000);
            buffer.copyToChannel(float32, 0);

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);

            const now = ctx.currentTime;
            // Ensure we don't schedule in the past, but keep contiguous if possible
            const start = Math.max(now, nextAudioTime.current);
            source.start(start);
            nextAudioTime.current = start + buffer.duration;

        } catch (e) {
            console.error("Audio Playback Error:", e);
        }
    };

    const dispenseParts = () => {
        const basicParts = [
            "Warp Core", "Flux Pipe", "Ion Thruster", "Coolant Tank", "Servo",
            "Fuel Cell", "Quantum Cell", "Graviton Coil", "Plasma Injector", "Shield Emitter", "Data Crystal"
        ];
        const newParts = basicParts.map((name, i) => ({
            id: Date.now() + i,
            name,
            type: PART_TYPES[name] || 'mech',
            hazardType: null
        }));
        setInventory(newParts);
    };

    // --- Drag Logic ---
    // Deterministic Hazard: Trigger on FIRST drag of the session only
    const handleDragStartFromInventory = (id) => {
        // If we haven't triggered a hazard yet, do it now (100% chance for first drag)
        if (!hasTriggeredHazard) {
            // Randomly select ANY part in inventory to be the hazard
            // heuristic: We want to make sure we don't pick an empty slot if we had those, 
            // but inventory is just an array of parts here.
            if (inventory.length === 0) return;

            const randomIdx = Math.floor(Math.random() * inventory.length);
            const targetPart = inventory[randomIdx];

            // Normalize Name for Lookup (just in case)
            const type = PART_HAZARDS[targetPart.name] || "RED";

            const newInv = [...inventory];
            newInv[randomIdx] = { ...targetPart, hazardType: type };

            setInventory(newInv);
            setHasTriggeredHazard(true); // Mark as triggered so it doesn't happen again
            console.log(`⚠️ HAZARD TRIGGERED on ${targetPart.name} (Deterministic: First Drag)`);
        }
        // Else: No hazard adjustment needed
    };

    const handleDropOnBlueprint = (e) => {
        e.preventDefault();
        const data = JSON.parse(e.dataTransfer.getData("application/json"));

        // 1. Hazard Check (Live State)
        const livePart = inventory.find(p => p.id === data.id);
        const currentHazardType = livePart ? livePart.hazardType : data.hazardType;

        if (currentHazardType) {
            alert("⚠️ HAZARD DETECTED! STABILIZE PART IN SAFETY BIN FIRST.");
            return;
        }

        // 2. Flexible Assembly Logic
        // Determine where this part belongs in the blueprint sequence
        // Note: requiredSequence is e.g. ["Warp Core", "Flux Pipe"]
        // data.name is "Flux Pipe" -> Index 1

        // Find *all* occurrences of the part name in the sequence that are currently empty
        // This handles cases where a drive might need 2 of the same part? 
        // Current DRIVES constants imply unique parts? 
        // Let's assume unique or find first empty matching slot.

        const targetIndex = requiredSequence.findIndex((reqName, idx) =>
            reqName === data.name && installedParts[idx] === null
        );

        // A. WRONG PART CHECK
        if (targetIndex === -1) {
            // Check if it's because the slot is already filled?
            if (requiredSequence.includes(data.name)) {
                // Ignore (Already installed) - maybe shake UI?
                return;
            }

            // It's a part that doesn't belong in this drive at all!
            setFailureMessage("DATA CORRUPTION: INCOMPATIBLE COMPONENT INSTALLED.");
            setMissionStatus("FAILED");
            return;
        }

        // B. INSTALL PART
        const newInstalled = [...installedParts];
        newInstalled[targetIndex] = data;
        setInstalledParts(newInstalled);

        // Remove from inventory
        removeFromSource(data.id);

        // C. WIN CONDITION (All slots filled)
        if (newInstalled.every(p => p !== null)) {
            setMissionStatus("COMPLETE");
        }
    };

    const handleDropOnBin = (e, color) => {
        e.preventDefault();
        const data = JSON.parse(e.dataTransfer.getData("application/json"));

        // CRITICAL CHECK: Wrong Bin = Instant Fail
        if (data.hazardType !== color) {
            setFailureMessage(`CONTAINMENT BREACH DETECTED. ${data.hazardType} HAZARD PLACED IN ${color} BIN.`);
            setMissionStatus("FAILED");
            // Optional: Play explosion sound
            return;
        }

        setBins(prev => ({ ...prev, [color]: data }));
        removeFromSource(data.id);
    };

    const handleRestart = () => {
        window.location.reload();
    };

    const removeFromSource = (id) => {
        setInventory(prev => prev.filter(p => p.id !== id));
        // Also check bins if we support dragging OUT of bins (which we do after neutralization)
        setBins(prev => {
            const newBins = { ...prev };
            Object.keys(newBins).forEach(k => {
                if (newBins[k] && newBins[k].id === id) newBins[k] = null;
            });
            return newBins;
        });
    };

    // --- Safety Workflow ---
    const requestVerification = (color) => {
        if (socket.current) {
            // New Format: Simple JSON with type: text
            socket.current.send(JSON.stringify({
                type: "text",
                text: "REQUEST_CHECK"
            }));
            setIsDispatchThinking(true); // Trigger loading on manual verification request
        }
        // Also assuming microphone inputs user saying "DISENGAGE" in parallel 
        // which sends audio chunks to backend.
        // For simulation, we assume user is speaking.
    };

    const handleHazardNeutralized = () => {
        // Unlock ALL bins? Or just the one initiating? 
        // Backend doesn't specify WHICH one, so we assume the Safety Officer cleared current threat.
        console.log("HAZARD NEUTRALIZED");

        setBins(prev => {
            const newBins = { ...prev };
            Object.keys(newBins).forEach(k => {
                if (newBins[k]) {
                    // Create a cleaner version of the part
                    const cleanPart = { ...newBins[k], hazardType: null };
                    // Move back to inventory or allow drag from bin?
                    // Let's move back to inventory for simplicity of UI
                    setInventory(curr => [...curr, cleanPart]);
                    newBins[k] = null;
                }
            });
            return newBins;
        });
    };

    // --- Renders ---

    return (
        <div className="w-screen h-screen bg-slate-900 text-cyan-50 flex flex-col overflow-hidden font-sans">

            {/* HERDER */}
            <header className="h-16 border-b border-cyan-800 bg-slate-950/80 flex items-center justify-between px-6 backdrop-blur">
                <div className="flex items-center gap-4">
                    <Activity className="text-cyan-400 animate-pulse" />
                    <div className="flex flex-col">
                        <h1 className="text-xs font-bold tracking-widest text-cyan-100 opacity-50">ENGINEER STATION // SQUAD B</h1>
                        <p className="text-2xl font-black text-fuchsia-400 drop-shadow-[0_0_10px_rgba(232,121,249,0.8)] leading-none">TARGET: {targetModel}</p>
                    </div>
                </div>
                <div className={`px-4 py-1 rounded border ${socketStatus === 'CONNECTED' ? 'border-green-500 text-green-400' : 'border-red-500 text-red-500'}`}>
                    {socketStatus}
                </div>
            </header>

            {missionStatus === "COMPLETE" && (
                <div className="fixed inset-0 z-[100] bg-green-950 flex flex-col items-center justify-center animate-in zoom-in duration-75">
                    {/* Background Grid layer */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[length:40px_40px] opacity-30"></div>

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="relative">
                            <ShieldCheck className="w-64 h-64 text-green-500 animate-bounce relative" />
                        </div>

                        <h1 className="text-[6rem] font-black text-white tracking-tighter leading-none mt-8 text-green-400 drop-shadow-[0_0_35px_rgba(34,197,94,0.8)] animate-pulse text-center">
                            SYSTEM<br />STABLE
                        </h1>

                        <div className="bg-green-900/80 border-l-4 border-green-500 p-6 my-8 max-w-2xl text-center backdrop-blur-md shadow-2xl">
                            <p className="text-3xl font-mono text-green-200 font-bold tracking-widest">
                                /// DRIVE ONLINE ///
                            </p>
                            <p className="text-xl text-green-400 mt-2 font-mono">
                                PREPARING FOR HYPERSPACE JUMP.
                            </p>
                        </div>

                        <button
                            onClick={handleRestart}
                            className="text-2xl px-12 py-6 bg-white text-green-900 font-black tracking-[0.2em] rounded-sm hover:scale-110 hover:bg-green-500 hover:text-white transition-all duration-100 shadow-[0_0_100px_rgba(0,255,0,0.6)]"
                        >
                            INITIATE JUMP
                        </button>
                    </div>
                </div>
            )}

            {missionStatus === "FAILED" && (
                <div className="fixed inset-0 z-[100] bg-red-950 flex flex-col items-center justify-center animate-in zoom-in duration-75">
                    {/* Background Noise/Glitch layer */}
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.5)_10px,rgba(0,0,0,0.5)_20px)] opacity-50"></div>

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="relative">
                            <Radiation className="w-64 h-64 text-red-600 animate-ping absolute opacity-50" />
                            <AlertTriangle className="w-64 h-64 text-red-500 animate-bounce relative" />
                        </div>

                        <h1 className="text-[8rem] font-black text-white tracking-tighter leading-none mt-8 text-red-500 drop-shadow-[0_0_35px_rgba(220,38,38,0.8)] animate-pulse">
                            CRITICAL<br />FAILURE
                        </h1>

                        <div className="bg-red-900/80 border-l-4 border-red-500 p-6 my-8 max-w-2xl text-center backdrop-blur-md shadow-2xl">
                            <p className="text-3xl font-mono text-red-200 font-bold tracking-widest">
                                /// SYSTEMS CRITICAL ///
                            </p>
                            <p className="text-xl text-red-400 mt-2 font-mono">
                                {failureMessage}
                            </p>
                        </div>

                        <button
                            onClick={handleRestart}
                            className="text-2xl px-12 py-6 bg-white text-red-900 font-black tracking-[0.2em] rounded-sm hover:scale-110 hover:bg-red-500 hover:text-white transition-all duration-100 shadow-[0_0_100px_rgba(255,0,0,0.6)]"
                        >
                            REBOOT SYSTEM
                        </button>
                    </div>
                </div>
            )}

            {missionStatus === "WAITING_START" && (
                <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-8">
                    <Activity className="w-24 h-24 text-cyan-500 animate-pulse mb-8" />
                    <h1 className="text-4xl font-black text-white tracking-[0.5em] mb-4">MISSION BRAVO</h1>
                    <div className="flex flex-col items-center gap-4 border border-cyan-900 bg-cyan-950/20 p-8 rounded-lg max-w-md text-center">
                        <p className="text-cyan-400 font-mono text-sm mb-4">
                            DUAL-AGENT LINK REQUIRED.<br />
                            ENABLE VISUAL & AUDIO FEEDS TO PROCEED.
                        </p>
                        <button
                            onClick={startMission}
                            className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-black font-bold tracking-widest rounded transition-all shadow-[0_0_20px_rgba(8,145,178,0.5)] hover:scale-105"
                        >
                            INITIATE UPLINK
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">

                {/* LEFT: INVENTORY */}
                <div className="w-1/4 min-w-[300px] border-r border-cyan-800/50 bg-slate-900/50 p-4 flex flex-col">
                    <h2 className="text-xs font-bold text-cyan-600 mb-4 uppercase tracking-wider flex items-center gap-2">
                        <Archive size={14} /> Parts Replicator
                    </h2>
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {inventory.map(part => (
                            <DraggablePart
                                key={part.id}
                                {...part}
                                onDragStart={handleDragStartFromInventory}
                            />
                        ))}
                        <button onClick={dispenseParts} className="w-full py-2 mt-4 text-xs border border-dashed border-cyan-700 hover:bg-cyan-900/20 text-cyan-500">
                            + REPLENISH SUPPLIES
                        </button>
                    </div>
                </div>

                {/* CENTER: ASSEMBLY & BINS */}
                <div className="flex-1 flex flex-col relative">

                    {/* BLUEPRINT AREA */}
                    <div
                        className="flex-1 relative flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-950"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDropOnBlueprint}
                    >
                        {/* Grid Pattern */}
                        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[length:40px_40px]"></div>

                        <div className="relative z-10 w-96 h-[500px] border-4 border-dashed border-cyan-500/30 rounded-t-full flex flex-col items-center pt-20 bg-black/20 backdrop-blur-sm">
                            <span className="text-cyan-500/20 text-6xl font-black absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 pointer-events-none whitespace-nowrap">
                                BLUEPRINT
                            </span>

                            {/* Slots */}
                            <div className="space-y-4 w-full px-8">
                                {requiredSequence.map((reqName, idx) => {
                                    const filled = installedParts[idx];
                                    return (
                                        <div key={idx} className={`h-20 w-full border-2 rounded flex items-center justify-center transition-all ${filled ? 'border-green-500 bg-green-900/20 text-green-400 shadow-[0_0_20px_rgba(0,255,0,0.2)]' :
                                            idx === installedParts.length ? 'border-cyan-400 animate-pulse bg-cyan-900/10' : 'border-slate-700 opacity-50'
                                            }`}>
                                            {filled ? (
                                                <div className="flex items-center gap-2 font-bold">
                                                    <ShieldCheck size={20} />
                                                    {filled.name} INSTALLED
                                                </div>
                                            ) : (
                                                <span className="text-xs tracking-widest uppercase font-alien text-cyan-500/50">
                                                    {(() => {
                                                        const alienChars = "⏃⏚☊⎅⟒⎎☌⊑⟟⟊☗⌰⋔⋏⍜⌿⍙⍀⌇⏁⎍⎐⍙⋉⊬⋵";
                                                        return reqName.split('').map(c => {
                                                            const code = c.toUpperCase().charCodeAt(0) - 65;
                                                            return (code >= 0 && code < alienChars.length) ? alienChars[code] : c;
                                                        }).join('');
                                                    })()}
                                                </span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>




                        </div>
                    </div>

                    {/* BOTTOM: SAFETY BINS */}
                    <div className="h-48 bg-slate-950 border-t border-cyan-900 grid grid-cols-3 gap-1 p-2">
                        {['RED', 'BLUE', 'GREEN'].map(color => {
                            const binPart = bins[color];
                            const colorClasses = {
                                RED: "border-red-900/50 bg-red-950/30 hover:bg-red-900/20",
                                BLUE: "border-blue-900/50 bg-blue-950/30 hover:bg-blue-900/20",
                                GREEN: "border-green-900/50 bg-green-950/30 hover:bg-green-900/20"
                            };

                            return (
                                <div
                                    key={color}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleDropOnBin(e, color)}
                                    className={`relative rounded border-2 border-dashed flex flex-col items-center justify-center transition-colors ${colorClasses[color]}`}
                                >
                                    {!binPart ? (
                                        <>
                                            <Radiation className={`mb-2 opacity-50 text-${color === 'RED' ? 'red' : color === 'BLUE' ? 'blue' : 'green'}-500`} />
                                            <span className="text-xs font-bold opacity-50 tracking-widest">{color} SAFETY BIN</span>
                                        </>
                                    ) : (
                                        <div className="w-full h-full p-4 flex flex-col items-center justify-center animate-in zoom-in">
                                            <div className="text-center mb-2">
                                                <div className="text-xs font-bold text-white mb-1">HAZARD CONTAINED</div>
                                                <div className="text-[10px] opacity-70">AWAITING NEUTRALIZATION</div>
                                            </div>

                                            <button
                                                onClick={() => requestVerification(color)}
                                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded border border-white/20 text-xs font-bold transition-all"
                                            >
                                                <Radio size={14} /> TRANSMIT VERIFICATION
                                            </button>
                                            <div className="mt-2 flex items-center gap-1 text-[10px] text-cyan-500 animate-pulse">
                                                <Mic size={10} /> SPEAK: "DISENGAGE"
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
                {/* RIGHT: MISSION LOG */}
                <div className="w-1/4 min-w-[300px] border-l border-cyan-800/50 bg-slate-900/50 p-4 flex flex-col">
                    <h2 className="text-xs font-bold text-cyan-600 mb-4 uppercase tracking-wider flex items-center gap-2">
                        <Activity size={14} /> Mission Log
                    </h2>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 font-mono text-xs">
                        {chatLogs.length === 0 && !isDispatchThinking && (
                            <div className="text-cyan-900 italic text-center mt-10">Awaiting transmission...</div>
                        )}
                        {chatLogs.map((log, i) => (
                            <div key={i} className={`flex flex-col ${log.sender === 'USR' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[90%] p-2 rounded border ${log.sender === 'USR'
                                    ? 'bg-cyan-950/30 border-cyan-800 text-cyan-300 rounded-tr-none'
                                    : 'bg-slate-800/50 border-slate-700 text-purple-300 rounded-tl-none'
                                    }`}>
                                    <span className="text-[10px] font-bold opacity-50 block mb-1">
                                        {log.sender === 'USR' ? 'ENGINEER' : 'DISPATCH'}
                                    </span>
                                    {log.text}
                                </div>
                            </div>
                        ))}

                        {/* LOADING INDICATOR */}
                        {isDispatchThinking && (
                            <div className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="max-w-[90%] p-2 rounded border bg-slate-800/30 border-slate-700/50 text-cyan-400/70 rounded-tl-none">
                                    <span className="text-[10px] font-bold opacity-50 block mb-1">
                                        DISPATCH
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Activity size={12} className="animate-spin" />
                                        <span className="animate-pulse">RECEIVING TRANSMISSION...</span>
                                        <div className="flex gap-0.5 items-end h-3 ml-2">
                                            <div className="w-1 bg-cyan-500/50 animate-[pulse_1s_ease-in-out_infinite] h-2"></div>
                                            <div className="w-1 bg-cyan-500/50 animate-[pulse_1.2s_ease-in-out_infinite] h-3"></div>
                                            <div className="w-1 bg-cyan-500/50 animate-[pulse_0.8s_ease-in-out_infinite] h-1"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>
                </div>

            </div>
        </div>
    );
}
