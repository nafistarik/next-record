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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start the interview
  const startInterview = async () => {
    console.log("[Interview] Starting interview...");
    setInterviewStarted(true);
    await startRecording();
  };

  // Start recording for current question
  const startRecording = async () => {
    try {
      console.log(`[Recording] Starting recording for question ${currentQuestionIndex + 1}`);
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
        console.log(`[Recording] Data available for question ${currentQuestionIndex + 1}`);
        chunksRef.current.push(e.data);
      };

      mediaRecorder.start(1000); // Collect data every second
      setRecording(true);
      console.log(`[Recording] Recording started for question ${currentQuestionIndex + 1}`);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 60) {
            console.log(`[Recording] Time limit reached for question ${currentQuestionIndex + 1}`);
            handleNextQuestion();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error("[Error] Starting recording:", error);
      alert("Could not access camera/microphone. Please check permissions.");
    }
  };

  // Stop recording for current question
  const stopRecording = async () => {
    if (mediaRecorderRef.current && recording) {
      console.log(`[Recording] Stopping recording for question ${currentQuestionIndex + 1}`);
      mediaRecorderRef.current.stop();
      setRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      return new Promise<void>((resolve) => {
        mediaRecorderRef.current!.onstop = () => {
          // Create blob from recorded chunks
          const blob = new Blob(chunksRef.current, { type: "video/webm" });
          console.log(`[Recording] Created blob for question ${currentQuestionIndex + 1}`, blob);

          // Save answer with question ID
          const currentQuestion = dummyInterviewData.qa_pairs[currentQuestionIndex];
          setSubmittedAnswers((prev) => {
            const newAnswers = [
              ...prev,
              {
                question_id: currentQuestion.question_id,
                submitted_answer: blob,
              },
            ];
            console.log(`[State] Updated submittedAnswers with new answer for question ${currentQuestionIndex + 1}`, newAnswers);
            return newAnswers;
          });

          // Stop camera/mic
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }

          console.log(`[Recording] Recording stopped for question ${currentQuestionIndex + 1}`);
          resolve();
        };
      });
    }
    return Promise.resolve();
  };

  // Handle moving to next question or finishing
  const handleNextQuestion = async () => {
    console.log("[Navigation] Handling next question/finish...");
    setIsSubmitting(true);
    
    try {
      await stopRecording();
      console.log("[Navigation] Recording stopped successfully");

      if (currentQuestionIndex < dummyInterviewData.qa_pairs.length - 1) {
        console.log("[Navigation] Moving to next question");
        setCurrentQuestionIndex((prev) => {
          const newIndex = prev + 1;
          console.log(`[State] Updated question index to ${newIndex}`);
          return newIndex;
        });
        
        // Wait for state to update before starting new recording
        setTimeout(async () => {
          await startRecording();
          setIsSubmitting(false);
        }, 0);
      } else {
        console.log("[Navigation] Interview completed, submitting...");
        await submitInterview();
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("[Error] Handling next question:", error);
      setIsSubmitting(false);
    }
  };

  // Submit all answers to the server
  const submitInterview = async () => {
    console.log("[Submission] Starting submission process");
    console.log("[Submission] Current submittedAnswers,,,,,,,,,,,,,,,,,,,:", submittedAnswers);

    try {
      const formData = new FormData();

      // Add all video answers to form data
      submittedAnswers.forEach((answer, index) => {
        formData.append(`answers[${index}][question_id]`, answer.question_id);
        formData.append(
          `answers[${index}][video]`,
          answer.submitted_answer,
          `answer_${answer.question_id}.webm`
        );
        console.log(`[Submission] Added answer ${index} to formData`);
      });

      // Add interview metadata
      formData.append("interview_id", dummyInterviewData._id);
      console.log("[Submission] FormData prepared:", formData);

      // For debugging, log what would be sent
      for (const [key, value] of formData.entries()) {
        console.log(`[Submission] FormData entry: ${key}`, value);
      }

      // const response = await fetch('http://localhost:8000/interview/', {
      //   method: 'POST',
      //   body: formData,
      // });

      // if (!response.ok) throw new Error('Upload failed');

      // const result = await response.json();
      console.log('[Submission] Interview submitted successfully (simulated)');
    } catch (error) {
      console.error("[Error] Submission error:", error);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      console.log("[Cleanup] Component unmounting, cleaning up...");
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Log state changes
  useEffect(() => {
    console.log("[State] submittedAnswers updated:", submittedAnswers);
  }, [submittedAnswers]);

  useEffect(() => {
    console.log("[State] currentQuestionIndex updated:", currentQuestionIndex);
  }, [currentQuestionIndex]);

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
              disabled={isSubmitting}
              className={`py-2 px-6 rounded-lg font-medium ${
                currentQuestionIndex < dummyInterviewData.qa_pairs.length - 1
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isSubmitting ? "Processing..." : 
                currentQuestionIndex < dummyInterviewData.qa_pairs.length - 1
                ? "Next Question"
                : "Finish Interview"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}