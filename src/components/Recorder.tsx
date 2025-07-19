'use client';

import React, { useRef, useState } from 'react';

export default function VideoRecorder() {
  const [recording, setRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }

    const mediaRecorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];

    mediaRecorder.ondataavailable = (e) => {
      chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      setVideoBlob(blob);

      // Stop all media tracks to release camera/mic
      stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="space-y-4">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full max-w-md border rounded-lg"
      />

      <div className="space-x-4">
        {!recording ? (
          <button onClick={startRecording} className="bg-green-600 px-4 py-2 text-white rounded">
            Start Recording
          </button>
        ) : (
          <button onClick={stopRecording} className="bg-red-600 px-4 py-2 text-white rounded">
            Stop Recording
          </button>
        )}
      </div>

      {videoBlob && (
        <div>
          <h3 className="font-semibold">Preview:</h3>
          <video
            controls
            src={URL.createObjectURL(videoBlob)}
            className="w-full max-w-md mt-2 border rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
