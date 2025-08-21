export async function uploadVideo(videoBlob: Blob) {
  const formData = new FormData();
  formData.append("video", videoBlob, "recorded_video.webm");
  formData.append("session_id", "1234567890"); // hardcoded session id

  const response = await fetch("/api/upload", {
    method: "POST",
    headers: {
      Authorization: "Bearer YOUR_ACCESS_TOKEN_HERE", // hardcoded access token
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload video");
  }

  const data = await response.json();
  return data;
}
