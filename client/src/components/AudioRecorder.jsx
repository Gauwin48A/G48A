/**
 * AudioRecorder Component - Voice-First Commerce
 * The Defender's Strategy: Trust through voice
 * 
 * Uses browser's native MediaRecorder API (Zero Cost)
 * Allows sellers to record 30-second audio descriptions
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Mic, Square, Play, Pause, Trash2, Volume2 } from 'lucide-react';

const MAX_DURATION = 30; // 30 seconds max

const AudioRecorder = ({ onAudioReady, existingAudio = null }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioURL, setAudioURL] = useState(existingAudio);
    const [audioBlob, setAudioBlob] = useState(null);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState(null);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const audioRef = useRef(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioURL && !existingAudio) URL.revokeObjectURL(audioURL);
        };
    }, [audioURL, existingAudio]);

    // Auto-stop at max duration
    useEffect(() => {
        if (duration >= MAX_DURATION && isRecording) {
            stopRecording();
        }
    }, [duration, isRecording]);

    // 1. START RECORDING
    const startRecording = async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Try different MIME types for compatibility
            const mimeType = MediaRecorder.isTypeSupported('audio/webm')
                ? 'audio/webm'
                : MediaRecorder.isTypeSupported('audio/mp4')
                    ? 'audio/mp4'
                    : 'audio/ogg';

            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                const url = URL.createObjectURL(blob);
                setAudioURL(url);
                setAudioBlob(blob);
                onAudioReady?.(blob);
                chunksRef.current = [];
            };

            mediaRecorderRef.current.start(100); // Collect in 100ms chunks
            setIsRecording(true);
            setDuration(0);

            // Start timer
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Mic Error:", err);
            if (err.name === 'NotAllowedError') {
                setError("माइक्रोफोन की अनुमति आवश्यक है। कृपया ब्राउज़र सेटिंग्स में अनुमति दें।");
            } else if (err.name === 'NotFoundError') {
                setError("कोई माइक्रोफोन नहीं मिला।");
            } else {
                setError("रिकॉर्डिंग शुरू नहीं हो सकी। कृपया पुनः प्रयास करें।");
            }
        }
    };

    // 2. STOP RECORDING
    const stopRecording = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            // Stop all tracks to release mic
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    // 3. DELETE RECORDING
    const deleteRecording = () => {
        if (audioURL && !existingAudio) URL.revokeObjectURL(audioURL);
        setAudioURL(null);
        setAudioBlob(null);
        setDuration(0);
        onAudioReady?.(null);
    };

    // 4. PLAYBACK CONTROLS
    const togglePlayback = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    // Format seconds to mm:ss
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col gap-3 p-4 border-2 border-dashed border-green-300 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-green-600" />
                <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">
                    आवाज़ में बताएं (Voice Description)
                </h3>
                <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                    🔥 Trust +50%
                </span>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400">
                अपने प्रोडक्ट के बारे में 30 सेकंड में बताएं। खरीदार आपकी आवाज़ सुनकर भरोसा करते हैं!
            </p>

            {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {error}
                </div>
            )}

            {/* Recording State */}
            {!audioURL ? (
                <div className="flex flex-col gap-2">
                    <Button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-full py-6 text-lg font-bold ${isRecording
                                ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                                : 'bg-green-600 hover:bg-green-700'
                            }`}
                    >
                        {isRecording ? (
                            <>
                                <Square className="w-5 h-5 mr-2" />
                                रोकें ({formatTime(MAX_DURATION - duration)} बचा)
                            </>
                        ) : (
                            <>
                                <Mic className="w-5 h-5 mr-2" />
                                🎤 बोलने के लिए टैप करें
                            </>
                        )}
                    </Button>

                    {isRecording && (
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-red-500 transition-all duration-1000"
                                    style={{ width: `${(duration / MAX_DURATION) * 100}%` }}
                                />
                            </div>
                            <span className="text-xs text-gray-500">{formatTime(duration)}</span>
                        </div>
                    )}
                </div>
            ) : (
                /* Playback State */
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                        <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="shrink-0"
                            onClick={togglePlayback}
                        >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>

                        <audio
                            ref={audioRef}
                            src={audioURL}
                            className="hidden"
                            onEnded={() => setIsPlaying(false)}
                        />

                        <div className="flex-1 flex items-center gap-2">
                            <div className="w-full h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                    🎧 आवाज़ रिकॉर्ड हो गई ({formatTime(duration)})
                                </span>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="shrink-0"
                            onClick={deleteRecording}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>

                    <p className="text-xs text-center text-green-600">
                        ✅ बढ़िया! खरीदार आपकी आवाज़ सुनकर भरोसा करेंगे
                    </p>
                </div>
            )}
        </div>
    );
};

export default AudioRecorder;
