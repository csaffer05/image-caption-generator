import { useState, useRef, useEffect } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("Your caption here");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [file]);

  // keep video element synced
  useEffect(() => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    v.muted = isMuted;
    v.volume = isMuted ? 0 : volume;
  }, [isMuted, volume]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) video.pause();
    else video.play();
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    if (value > 0) setIsMuted(false);
    else setIsMuted(true);
  };

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setIsPlaying(false);
      setCaption("Your caption here");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8">
      <h1 className="text-4xl font-bold mb-8 text-gray-900">
        📸 Caption Generator
      </h1>

      {!preview ? (
        <div className="flex flex-col items-center justify-center space-y-6">
          <p className="text-gray-600 text-lg">
            Upload an image or video to get started
          </p>
          <button
            onClick={() => fileInputRef.current.click()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-2xl shadow-md transition"
          >
            Upload File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="relative flex flex-col items-center bg-white rounded-2xl shadow-lg p-6">
          <div className="relative w-[1080px] h-[1080px] bg-black flex items-center justify-center rounded-xl overflow-hidden">
            {file.type.startsWith("image") ? (
              <img
                src={preview}
                alt="preview"
                className="object-contain max-h-full max-w-full"
              />
            ) : (
              <div className="flex items-center justify-center gap-6">
                {/* Video container */}
                <div className="relative w-[900px] h-[900px] flex items-center justify-center">
                  <video
                    ref={videoRef}
                    src={preview}
                    className="object-contain w-full h-full rounded-lg cursor-pointer"
                    onClick={togglePlay}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />

                  {/* Play overlay */}
                  {!isPlaying && (
                    <button
                      onClick={togglePlay}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 rounded-lg transition"
                    >
                      <Play size={80} className="text-white drop-shadow-lg" />
                    </button>
                  )}
                </div>

                {/* Volume controls — white card with vertical slider */}
                <div className="flex flex-col items-center gap-3 bg-white p-3 rounded-xl shadow-md">
                  <button
                    onClick={() => {
                      setIsMuted((m) => {
                        const next = !m;
                        if (!next && volume === 0) setVolume(0.5);
                        return next;
                      });
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? (
                      <VolumeX className="text-gray-800" size={26} />
                    ) : (
                      <Volume2 className="text-gray-800" size={26} />
                    )}
                  </button>

                  {/* truly vertical slider */}
                  <div className="h-28 w-3 flex items-center justify-center">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="accent-blue-600 cursor-pointer [appearance:none] w-full h-28 vertical-slider"
                      orient="vertical"
                      style={{
                        writingMode: "bt-lr",
                        WebkitAppearance: "slider-vertical",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Caption box overlay */}
            <div className="absolute bottom-0 w-full bg-white/80 py-4 px-6 text-center">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                onFocus={() => {
                  if (caption === "Your caption here") setCaption("");
                }}
                placeholder="Type your caption..."
                className="w-full text-center text-2xl font-semibold bg-transparent outline-none text-gray-900"
              />
            </div>
          </div>

          <button
            onClick={() => {
              setFile(null);
              setPreview(null);
            }}
            className="mt-6 bg-red-500 text-white px-5 py-2 rounded-lg hover:bg-red-600 transition"
          >
            Remove & Upload New
          </button>
        </div>
      )}
    </div>
  );
}
