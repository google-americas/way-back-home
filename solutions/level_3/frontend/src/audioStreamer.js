export class AudioStreamer {
    constructor(sampleRate = 24000) {
        this.context = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: sampleRate,
        });
        this.audioQueue = [];
        this.isPlaying = false;
        this.sampleRate = sampleRate;
    }

    addPCM16(base64Data) {
        try {
            // console.log(`[AudioStreamer] addPCM16 called with ${base64Data.length} chars`);
            // Convert Base64URL to Base64 (replace - with + and _ with /)
            const cleaned = base64Data.replace(/-/g, '+').replace(/_/g, '/');

            const raw = atob(cleaned);
            const rawLength = raw.length;
            const array = new Int16Array(new ArrayBuffer(rawLength));

            for (let i = 0; i < rawLength / 2; i++) {
                const lower = raw.charCodeAt(i * 2);
                const upper = raw.charCodeAt(i * 2 + 1);
                // Combine bytes to form 16-bit integer (little endian)
                let sample = (upper << 8) | lower;
                // Handle signed 16-bit integer
                if (sample & 0x8000) {
                    sample = sample - 0x10000;
                }
                array[i] = sample;
            }

            const float32Data = new Float32Array(array.length);
            for (let i = 0; i < array.length; i++) {
                // simple int16 to float conversion
                float32Data[i] = array[i] / 32768.0;
            }

            this.audioQueue.push(float32Data);
            this.playNext();
        } catch (e) {
            console.error('[AudioStreamer] Error in addPCM16:', e);
        }
    }

    async playNext() {
        if (this.isPlaying || this.audioQueue.length === 0) {
            // console.log(`[AudioStreamer] Skipping playNext (Playing: ${this.isPlaying}, Queue: ${this.audioQueue.length})`);
            return;
        }

        if (this.context.state === 'suspended') {
            console.warn('[AudioStreamer] Context is suspended! Attempting resume...');
            try {
                // Must be awaited or handled otherwise play starts on suspended context
                await this.context.resume();
                console.log('[AudioStreamer] Context resumed.');
            } catch (e) { console.error("Failed to resume", e); }
        }

        try {
            this.isPlaying = true;
            const audioData = this.audioQueue.shift();
            // console.log(`[AudioStreamer] Playing chunk of ${audioData.length} samples. Context State: ${this.context.state}`);

            const buffer = this.context.createBuffer(1, audioData.length, this.sampleRate);
            buffer.getChannelData(0).set(audioData);

            const source = this.context.createBufferSource();
            source.buffer = buffer;
            source.connect(this.context.destination);
            source.onended = () => {
                this.isPlaying = false;
                this.playNext();
            };
            source.start();
            console.log(`[AudioStreamer] Started playing chunk. Time: ${this.context.currentTime}`);
        } catch (e) {
            console.error('[AudioStreamer] Error in playNext:', e);
            this.isPlaying = false;
            this.playNext();
        }
    }

    resume() {
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
    }
}
