import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react"; // <-- nice icons

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const videoRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.volume = volume;

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [volume]);

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
              className="object-contain max-h-full max-w-full"
            />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                src={preview}
                className="object-contain max-h-full max-w-full"
                onClick={togglePlay}
              />

              {/* Play/Pause Overlay Button */}
              {!isPlaying && (
                <button
                  onClick={togglePlay}
                  className="absolute bg-white/80 hover:bg-white/90 p-6 rounded-full shadow-lg transition"
                >
                  <Play size={48} className="text-gray-800" />
                </button>
              )}

              {/* Top-right volume controls */}
              <div className="absolute top-4 right-4 flex flex-col items-center gap-2 bg-white/80 rounded-md p-3 shadow">
                <Volume2 className="text-gray-700" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="h-24 w-2 accent-blue-600"
                  orient="vertical"
                />
              </div>
            </div>
          )}

          {/* Caption overlay */}
          <div className="absolute bottom-0 left-0 w-full bg-white bg-opacity-95 p-6 border-t border-gray-200">
            <textarea
              className="w-full bg-transparent text-black text-2xl font-semibold text-center resize-none focus:outline-none placeholder-gray-400"
              placeholder="Your caption here ✍️"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
