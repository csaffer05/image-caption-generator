import { useState } from "react";

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("Your caption here");

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">📸 Caption Generator</h1>

      <input
        type="file"
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="mb-4"
      />

      {preview && (
        <div className="relative w-[1080px] h-[1080px] bg-black overflow-hidden rounded-2xl shadow-lg flex items-center justify-center">
          {file.type.startsWith("image") ? (
            <img
              src={preview}
              alt="preview"
              className="object-contain max-h-full max-w-full"
            />
          ) : (
            <video
              src={preview}
              controls
              className="object-contain max-h-full max-w-full"
            />
          )}

          {/* 🟩 Caption overlay */}
          <div className="absolute bottom-0 left-0 w-full bg-white bg-opacity-90 p-4">
            <textarea
              className="w-full bg-transparent text-black text-xl font-semibold resize-none focus:outline-none"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}