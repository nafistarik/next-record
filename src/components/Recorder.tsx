"use client";

import React, { useRef, useState, useEffect } from "react";

// Dummy data for the interview questions
const dummyInterviewData = {
  _id: "12345",
  created_by: "user_id",
  role: "Frontend",
  stack: "JavaScript",
  level: "Easy",
  question_count: 2,
  allowed_candidates: ["nafis@gmail.com"],
  qa_pairs: [
    {
      question_id: "61886510950",
      question: "What is polymorphism?",
      ideal_answer: "Polymorphism is...",
    },
    {
      question_id: "61886510951",
      question: "Explain the virtual DOM in React",
      ideal_answer: "The virtual DOM is...",
    },
  ],
  created: "2025-07-30T10:30:00.000Z",
};

export default function VideoInterview() {
  // Interview state
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submittedAnswers, setSubmittedAnswers] = useState<
    Array<{
      question_id: string;
      submitted_answer: Blob;
    }>
  >([]);

  // Video recording state
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start the interview
  const startInterview = async () => {
    setInterviewStarted(true);
    await startRecording();
  };

  // Start recording for current question
  const startRecording = async () => {
    try {
      setRecordingTime(0);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.start(1000); // Collect data every second
      setRecording(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 60) {
            // 1 minute limit
            handleNextQuestion();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not access camera/microphone. Please check permissions.");
    }
  };

  // Stop recording for current question
  const stopRecording = async () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Create blob from recorded chunks
      const blob = new Blob(chunksRef.current, { type: "video/webm" });

      // Save answer with question ID
      const currentQuestion = dummyInterviewData.qa_pairs[currentQuestionIndex];
      setSubmittedAnswers((prev) => [
        ...prev,
        {
          question_id: currentQuestion.question_id,
          submitted_answer: blob,
        },
      ]);

      // Stop camera/mic
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  };

  // Handle moving to next question or finishing
  const handleNextQuestion = async () => {
    await stopRecording();

    if (currentQuestionIndex < dummyInterviewData.qa_pairs.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      await startRecording(); // Start recording for next question
    } else {
      // Interview completed, submit all answers
      await submitInterview();
    }
  };

  // Submit all answers to the server
  const submitInterview = async () => {
    try {
      console.log(submittedAnswers);

      const formData = new FormData();

      // Add all video answers to form data
      submittedAnswers.forEach((answer, index) => {
        formData.append(`answers[${index}][question_id]`, answer.question_id);
        formData.append(
          `answers[${index}][video]`,
          answer.submitted_answer,
          `answer_${answer.question_id}.webm`
        );
      });

      // Add interview metadata
      formData.append("interview_id", dummyInterviewData._id);

      // const response = await fetch('http://localhost:8000/interview/', {
      //   method: 'POST',
      //   body: formData,
      // });

      // if (!response.ok) throw new Error('Upload failed');

      // const result = await response.json();
      // console.log('Interview submitted successfully:', result);
      // setUploadSuccess(true);


      console.log(submittedAnswers);

      
    } catch (error) {
      console.error("Submission error:", error);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      {!interviewStarted ? (
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">
            {dummyInterviewData.role} Interview ({dummyInterviewData.stack})
          </h1>
          <p className="mb-6">
            Number of questions: {dummyInterviewData.question_count}
          </p>
          <button
            onClick={startInterview}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
          >
            Start Interview
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Question Section */}
            <div className="flex-1 bg-gray-50 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">
                Question {currentQuestionIndex + 1}:
              </h2>
              <p className="text-lg mb-4">
                {dummyInterviewData.qa_pairs[currentQuestionIndex].question}
              </p>
              <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                <p className="font-medium text-yellow-800">
                  Recording time: {recordingTime}s
                </p>
                {recordingTime >= 60 && (
                  <p className="text-red-500 mt-1">
                    Time limit reached! Moving to next question...
                  </p>
                )}
              </div>
            </div>

            {/* Video Preview Section */}
            <div className="flex-1">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-auto max-h-80 border rounded-lg bg-black"
              />
              <div className="mt-2 flex justify-between items-center">
                <div className="flex items-center">
                  {recording && (
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                      <span className="text-sm">Recording</span>
                    </div>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {currentQuestionIndex + 1} of{" "}
                  {dummyInterviewData.qa_pairs.length}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Button */}
          <div className="flex justify-center">
            <button
              onClick={handleNextQuestion}
              className={`py-2 px-6 rounded-lg font-medium ${
                currentQuestionIndex < dummyInterviewData.qa_pairs.length - 1
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              } `}
            >
              {currentQuestionIndex < dummyInterviewData.qa_pairs.length - 1
                ? "Next Question"
                : "Finish Interview"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
