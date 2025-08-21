"use client";

import React, { useRef, useState, useEffect } from "react";

// Types
type Question = {
  question_id: string;
  question: string;
  ideal_answer: string;
};

type InterviewData = {
  _id: string;
  created_by: string;
  role: string;
  stack: string;
  level: string;
  question_count: number;
  allowed_candidates: string[];
  qa_pairs: Question[];
  created: string;
};

type SubmittedAnswer = {
  question_id: string;
  submitted_answer: Blob;
};

// Dummy data for the interview questions
const dummyInterviewData: InterviewData = {
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
  // const [submittedAnswers, setSubmittedAnswers] = useState<SubmittedAnswer[]>([]);
  const [interviewStatus, setInterviewStatus] = useState<
    "idle" | "recording" | "processing" | "completed"
  >("idle");

  // Video recording state
  const [recordingTime, setRecordingTime] = useState(0);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingAnswersRef = useRef<SubmittedAnswer[]>([]);

  // Clean up resources on unmount
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, []);

  const cleanupResources = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Start the interview
  const startInterview = async () => {
    try {
      setInterviewStarted(true);
      setInterviewStatus("recording");
      await startRecording();
    } catch (error) {
      console.error("Failed to start interview:", error);
      alert("Could not start the interview. Please try again.");
      resetInterviewState();
    }
  };

  // Start recording for current question
  const startRecording = async () => {
    cleanupResources();

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

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9,opus",
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(1000); // Collect data every second

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 60) {
            handleNextQuestion();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      throw error;
    }
  };

  // Stop recording for current question
  const stopRecording = async (): Promise<SubmittedAnswer> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve({
          question_id:
            dummyInterviewData.qa_pairs[currentQuestionIndex].question_id,
          submitted_answer: new Blob(),
        });
        return;
      }

      const onStop = () => {
        mediaRecorderRef.current!.removeEventListener("stop", onStop);

        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const answer = {
          question_id:
            dummyInterviewData.qa_pairs[currentQuestionIndex].question_id,
          submitted_answer: blob,
        };

        // Update both ref and state
        pendingAnswersRef.current = [...pendingAnswersRef.current, answer];
        // setSubmittedAnswers((prev) => [...prev, answer]);

        cleanupResources();
        resolve(answer);
      };

      mediaRecorderRef.current.addEventListener("stop", onStop);
      mediaRecorderRef.current.stop();
    });
  };

  // Handle moving to next question or finishing
  const handleNextQuestion = async () => {
    setInterviewStatus("processing");

    try {
      await stopRecording();

      if (currentQuestionIndex < dummyInterviewData.qa_pairs.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setInterviewStatus("recording");
        await startRecording();
      } else {
        await submitInterview();
        setInterviewStatus("completed");
      }
    } catch (error) {
      console.error("Error handling next question:", error);
      setInterviewStatus("recording");
    }
  };

  // Submit all answers to the server
  const submitInterview = async () => {
    try {
      const formData = new FormData();

      // Use the pendingAnswersRef to ensure we have all answers
      pendingAnswersRef.current.forEach((answer, index) => {
        // formData.append(`answers[${index}][question_id]`, answer.question_id);
        formData.append(
          "video",
          answer.submitted_answer,
          `answer_${index}.webm`
        );
      });

      formData.append("session_id", dummyInterviewData._id);

      // Simulate API call
      console.log("Submitting interview data:", {
        answers: pendingAnswersRef.current,
        interview_id: dummyInterviewData._id,
      });

      // Uncomment for real API call
      // const response = await fetch('http://localhost:8000/interview/', {
      //   method: 'POST',
      //   body: formData,
      // });
      // if (!response.ok) throw new Error('Upload failed');
      // return await response.json();

      const response = await fetch("http://localhost:8000/api/response/", {
        method: "POST",
        headers: {
          Authorization: "Bearer YOUR_ACCESS_TOKEN_HERE", // hardcoded access token
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload video");
      }
    } catch (error) {
      console.error("Submission error:", error);
      throw error;
    }
  };

  const resetInterviewState = () => {
    cleanupResources();
    setInterviewStarted(false);
    setCurrentQuestionIndex(0);
    // setSubmittedAnswers([]);
    setInterviewStatus("idle");
    setRecordingTime(0);
    pendingAnswersRef.current = [];
  };

  const currentQuestion = dummyInterviewData.qa_pairs[currentQuestionIndex];
  const isLastQuestion =
    currentQuestionIndex === dummyInterviewData.qa_pairs.length - 1;

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
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors"
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
              <p className="text-lg mb-4">{currentQuestion.question}</p>
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
                  {interviewStatus === "recording" && (
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
            {interviewStatus === "completed" ? (
              <div className="text-center py-4">
                <p className="text-green-600 font-medium mb-4">
                  Interview submitted successfully! Thank you. ✅
                </p>
                <button
                  onClick={resetInterviewState}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg"
                >
                  Start New Interview
                </button>
              </div>
            ) : (
              <button
                onClick={handleNextQuestion}
                disabled={interviewStatus === "processing"}
                className={`py-2 px-6 rounded-lg font-medium transition-colors ${
                  isLastQuestion
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                } ${
                  interviewStatus === "processing"
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                {interviewStatus === "processing"
                  ? "Processing..."
                  : isLastQuestion
                  ? "Finish Interview"
                  : "Next Question"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
