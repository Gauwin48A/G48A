import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Mic, Pause, Play, Square, Trash2, Volume2 } from "lucide-react";

const MAX_RECORDING_SECONDS = 30;

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const AudioRecorder = ({ onAudioReady, existingAudio = null }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(existingAudio);
  const [audioBlob, setAudioBlob] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl && !existingAudio) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl, existingAudio]);

  useEffect(() => {
    if (elapsedSeconds >= MAX_RECORDING_SECONDS && isRecording) {
      stopRecording();
    }
  }, [elapsedSeconds, isRecording]);

  const startRecording = async () => {
    setErrorMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "audio/ogg";

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setAudioBlob(blob);
        chunksRef.current = [];

        if (onAudioReady) {
          onAudioReady(blob);
        }
      };

      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      setElapsedSeconds(0);

      timerRef.current = setInterval(() => {
        setElapsedSeconds((current) => current + 1);
      }, 1000);
    } catch (error) {
      if (error.name === "NotAllowedError") {
        setErrorMessage("Microphone permission is required. Please allow microphone access.");
      } else if (error.name === "NotFoundError") {
        setErrorMessage("No microphone was detected on this device.");
      } else {
        setErrorMessage("Unable to start recording. Please try again.");
      }
    }
  };

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  }

  const removeAudio = () => {
    if (audioUrl && !existingAudio) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setElapsedSeconds(0);
    setIsPlaying(false);

    if (onAudioReady) {
      onAudioReady(null);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) {
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    audioRef.current.play();
    setIsPlaying(true);
  };

  return (
    <div className="flex flex-col gap-3 p-4 border-2 border-dashed border-green-300 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
      <div className="flex items-center gap-2">
        <Volume2 className="w-5 h-5 text-green-600" />
        <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">Voice Description</h3>
        <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Trust boost</span>
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-400">
        Record a short voice note (up to 30 seconds) describing the item.
      </p>

      {errorMessage ? <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{errorMessage}</div> : null}

      {audioUrl ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
            <Button type="button" size="icon" variant="outline" className="shrink-0" onClick={togglePlayback}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>

            <audio
              ref={audioRef}
              src={audioUrl}
              className="hidden"
              onEnded={() => setIsPlaying(false)}
            />

            <div className="flex-1 flex items-center gap-2">
              <div className="w-full h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Voice clip ready ({formatDuration(elapsedSeconds)})
                </span>
              </div>
            </div>

            <Button type="button" variant="destructive" size="icon" className="shrink-0" onClick={removeAudio}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-xs text-center text-green-600">Voice recording attached successfully.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-full py-6 text-lg font-bold ${isRecording ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-green-600 hover:bg-green-700"}`}
          >
            {isRecording ? (
              <>
                <Square className="w-5 h-5 mr-2" />
                Stop ({formatDuration(MAX_RECORDING_SECONDS - elapsedSeconds)} left)
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 mr-2" />
                Start Voice Recording
              </>
            )}
          </Button>

          {isRecording ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-1000"
                  style={{ width: `${(elapsedSeconds / MAX_RECORDING_SECONDS) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{formatDuration(elapsedSeconds)}</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;

