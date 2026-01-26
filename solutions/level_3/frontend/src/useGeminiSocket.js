import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioStreamer } from './audioStreamer';
import { AudioRecorder } from './audioRecorder';

export function useGeminiSocket(url) {
    const [status, setStatus] = useState('DISCONNECTED');
    const [lastMessage, setLastMessage] = useState(null);
    const ws = useRef(null);
    const streamRef = useRef(null);
    const intervalRef = useRef(null);
    const audioStreamer = useRef(new AudioStreamer(24000)); // Default to 24kHz for Gemini Live
    const audioRecorder = useRef(new AudioRecorder(16000)); // Record at 16kHz for Gemini Input

    const connect = useCallback(() => {
        if (ws.current?.readyState === WebSocket.OPEN) return;

        ws.current = new WebSocket(url);

        ws.current.onopen = () => {
            console.log('Connected to Gemini Socket');
            setStatus('CONNECTED');
        };

        ws.current.onclose = () => {
            console.log('Disconnected from Gemini Socket');
            setStatus('DISCONNECTED');
            stopStream();
        };

        ws.current.onerror = (err) => {
            console.error('Socket error:', err);
            setStatus('ERROR');
        };

        ws.current.onmessage = async (event) => {
            try {
                const msg = JSON.parse(event.data);

                // Helper to extract parts from various possible event structures
                let parts = [];
                if (msg.serverContent?.modelTurn?.parts) {
                    parts = msg.serverContent.modelTurn.parts;
                } else if (msg.content?.parts) {
                    parts = msg.content.parts;
                }

                if (parts.length > 0) {
                    parts.forEach(part => {
                        // Handle Tool Calls (The "Sync" logic)
                        if (part.functionCall) {
                            if (part.functionCall.name === 'report_digit') {
                                const count = parseInt(part.functionCall.args.count, 10);
                                setLastMessage({ type: 'DIGIT_DETECTED', value: count });
                            }
                        }

                        // Handle Audio (The AI's voice)
                        if (part.inlineData && part.inlineData.data) {
                            audioStreamer.current.resume();
                            audioStreamer.current.addPCM16(part.inlineData.data);
                        }
                    });
                }
            } catch (e) {
                console.error('Failed to parse message', e, event.data.slice(0, 100));
            }
        };
    }, [url]);

    const startStream = useCallback(async (videoElement) => {
        try {
            // 1. Start Video Stream
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoElement.srcObject = stream;
            streamRef.current = stream;
            await videoElement.play();

            // 2. Start Audio Recording (Microphone)
            try {
                let packetCount = 0;
                await audioRecorder.current.start((base64Audio) => {
                    if (ws.current?.readyState === WebSocket.OPEN) {
                        packetCount++;
                        if (packetCount % 50 === 0) console.log(`[useGeminiSocket] Sending Audio Packet #${packetCount}, size: ${base64Audio.length}`);
                        ws.current.send(JSON.stringify({
                            type: 'audio',
                            data: base64Audio,
                            sampleRate: 16000
                        }));
                    } else {
                        if (packetCount % 50 === 0) console.warn('[useGeminiSocket] WS not OPEN, cannot send audio');
                    }
                });
                console.log("Microphone recording started");
            } catch (authErr) {
                console.error("Microphone access denied or error:", authErr);
            }

            // 3. Setup Video Frame Capture loop
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const width = 640;
            const height = 480;
            canvas.width = width;
            canvas.height = height;

            intervalRef.current = setInterval(() => {
                if (ws.current?.readyState === WebSocket.OPEN) {
                    ctx.drawImage(videoElement, 0, 0, width, height);
                    const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
                    // ADK format: { type: "image", data: base64, mimeType: "image/jpeg" }
                    ws.current.send(JSON.stringify({
                        type: 'image',
                        data: base64,
                        mimeType: 'image/jpeg'
                    }));
                }
            }, 500); // 2 FPS
        } catch (err) {
            console.error('Error accessing camera:', err);
        }
    }, []);

    const stopStream = useCallback(() => {
        // Stop Video
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        // Stop Audio
        audioRecorder.current.stop();

        // Clear Interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            stopStream();
            if (ws.current) ws.current.close();
        };
    }, [stopStream]);

    const disconnect = useCallback(() => {
        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }
        setStatus('DISCONNECTED');
        stopStream();
    }, [stopStream]);

    return { status, lastMessage, connect, disconnect, startStream, stopStream };
}

