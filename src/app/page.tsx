import Recorder from "@/components/Recorder";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-12">
      <h1 className="text-3xl font-bold">🎥 Record & Upload Video</h1>
      <Recorder />
    </main>
  );
}
