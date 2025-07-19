export async function uploadVideo(videoBlob: Blob) {
  const formData = new FormData();
  formData.append("video", videoBlob, "recorded_video.webm");

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload video");
  }

  const data = await response.json();
  return data;
}