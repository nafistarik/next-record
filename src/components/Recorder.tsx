"use client";

import { useRef, useState } from "react";

export default function VideoRecorder() {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Ask browser for permission and get webcam+mic stream
  const getWebcamStream = async (): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    return stream;
  };

  // 📤 Upload the final video blob to backend
  const uploadVideo = async (blob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("video", blob, "recording.mp4");

      const response = await fetch("http://localhost:8000/video/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const result = await response.json();
      console.log("✅ Upload successful:", result);
    } catch (error) {
      console.error("❌ Upload error:", error);
    }
  };

  const stopStreamTracks = (stream: MediaStream) => {
    stream.getTracks().forEach((track) => {
      track.stop(); // 🎯 Stop the webcam stream
    });
  };

  const startRecording = async () => {
    try {
      const stream = await getWebcamStream();
      if (videoRef.current) {
        videoRef.current.srcObject = stream; // Show webcam stream on video preview
      }

      const chunks: BlobPart[] = []; // Stores video pieces as it records
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data); // push data to the chunk
      };

      // when the mediaRecorder is stopped then the stream is off
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "video/mp4" });
        stopStreamTracks(stream);
        await uploadVideo(blob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      setRecording(true);
    } catch (error) {
      console.error("❌ Could not access webcam/microphone", error);
    }
  };

  // ⏹️ Stop recording video
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    } else {
      console.warn("⚠️ No active recorder found");
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto p-4 border rounded shadow">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full border rounded"
      />

      <div className="flex space-x-4">
        {!recording ? (
          <button
            onClick={startRecording}
            className="bg-green-600 px-4 py-2 text-white rounded"
          >
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="bg-red-600 px-4 py-2 text-white rounded"
          >
            Stop Recording
          </button>
        )}
      </div>
    </div>
  );
}
