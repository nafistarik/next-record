'use client';

import React, { useRef, useState } from 'react';

export default function VideoRecorder() {
  const [recording, setRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Function to start recording
  const startRecording = async () => {
    setUploadSuccess(false); // reset upload message
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }

    const chunks: BlobPart[] = [];
    const mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      setVideoBlob(blob);

      // Stop camera/mic
      stream.getTracks().forEach((track) => track.stop());

      // Upload the video to your backend
      await uploadVideo(blob);
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setRecording(true);
  };

  // Function to stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  // Upload function (use your actual backend URL)
  const uploadVideo = async (blob: Blob) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('video', blob, 'recording.mp4');

      const response = await fetch('http://localhost:8000/video/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const result = await response.json();
      console.log('Upload successful:', result);
      setUploadSuccess(true);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
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

      {uploading && <p className="text-blue-500">Uploading...</p>}
      {uploadSuccess && <p className="text-green-600">Upload successful! 🎉</p>}

      {videoBlob && (
        <div>
          <h3 className="font-semibold">Preview:</h3>
          <video
            controls
            src={URL.createObjectURL(videoBlob)}
            className="w-full mt-2 border rounded"
          />
        </div>
      )}
    </div>
  );
}
