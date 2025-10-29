import { useState } from "react";

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("Your caption here ✍️");

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-6">
      <div className="w-full max-w-4xl text-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-2">
          📸 Caption Generator
        </h1>
        <p className="text-gray-500">
          Upload an image or video, add your caption, and export your post-ready square.
        </p>
      </div>

      <label
        htmlFor="file-upload"
        className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow mb-6 transition"
      >
        Choose File
      </label>
      <input
        id="file-upload"
        type="file"
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {preview && (
        <div className="relative w-[1080px] h-[1080px] bg-black overflow-hidden rounded-2xl shadow-xl flex items-center justify-center border border-gray-300">
          {file.type.startsWith("image") ? (
            <img
              src={preview}
              alt="preview"
              className="object-contain max-h-full max-w-full transition-all"
            />
          ) : (
            <video
              src={preview}
              controls
              className="object-contain max-h-full max-w-full"
            />
          )}

          {/* Caption overlay */}
          <div className="absolute bottom-0 left-0 w-full bg-white bg-opacity-95 p-6 border-t border-gray-200">
            <textarea
              className="w-full bg-transparent text-black text-2xl font-semibold text-center resize-none focus:outline-none placeholder-gray-400"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}