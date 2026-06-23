import { StoryBookPreview } from "../components/book";
import Navbar from "../components/Navbar";

export default function NewStory() {
  return (
    <div className="min-h-screen bg-[#fff5cf] text-slate-900">
      <Navbar />

      <main className="mx-auto mt-12 max-w-6xl px-6 pb-8">
        <div className="mt-10">
          <StoryBookPreview />
        </div>
      </main>
    </div>
  );
}
