import { useState, useRef, useEffect } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("Your caption here");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [exportPreviewUrl, setExportPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const exportCanvasRef = useRef(null);

  const CANVAS_SIZE = 1080;

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [file]);

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
    setIsMuted(!(value > 0));
  };

  const applyUploadedFile = (uploadedFile) => {
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setIsPlaying(false);
    setCaption("Your caption here");
    setExportPreviewUrl(null);
  };

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files?.[0];
    applyUploadedFile(uploadedFile);
  };

  // Drag & drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const uploadedFile = e.dataTransfer.files?.[0];
    applyUploadedFile(uploadedFile);
  };

  // --- Canvas helpers ---
  function drawContain(ctx, media, x, y, w, h) {
    const mw = media.videoWidth ?? media.naturalWidth;
    const mh = media.videoHeight ?? media.naturalHeight;
    if (!mw || !mh) return;
    const scale = Math.min(w / mw, h / mh);
    const dw = Math.round(mw * scale);
    const dh = Math.round(mh * scale);
    const dx = x + Math.round((w - dw) / 2);
    const dy = y + Math.round((h - dh) / 2);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(media, dx, dy, dw, dh);
  }

  function wrapText(ctx, text, maxWidth) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (ctx.measureText(test).width > maxWidth && cur) {
        lines.push(cur);
        cur = w;
      } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  async function renderCompositeToCanvas(canvas) {
    if (!preview || !canvas) return null;
    const ctx = canvas.getContext("2d");
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    // ---- Caption metrics & wrapping (compute BEFORE heights) ----
    const paddingX = 32;              // horizontal padding inside caption bar
    const paddingY = 24;              // vertical padding inside caption bar
    const fontPx = 44;                // caption font size
    const minLines = 2;               // reserve room for 2 lines minimum
    ctx.font = `600 ${fontPx}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const maxWidth = CANVAS_SIZE - paddingX * 2;
    const lines = wrapText(ctx, caption || "", maxWidth);
    const m = ctx.measureText("M");
    const lineH = Math.max(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent, fontPx) * 1.2;

    // Dynamic caption height: base for 2 lines; grows 1 line-height per extra line
    const linesCount = Math.max(lines.length, minLines);
    const capH = Math.round(linesCount * lineH + paddingY * 2);

    // ---- Draw background ----
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // ---- Draw media (below the caption) ----
    const contentY = capH;
    const contentH = CANVAS_SIZE - capH;

    if (file.type.startsWith("image")) {
      await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          drawContain(ctx, img, 0, contentY, CANVAS_SIZE, contentH);
          resolve();
        };
        img.src = preview;
      });
    } else if (file.type.startsWith("video") && videoRef.current) {
      drawContain(ctx, videoRef.current, 0, contentY, CANVAS_SIZE, contentH);
    }

    // ---- Caption bar (top) ----
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_SIZE, capH);

    // ---- Caption text (centered in caption bar) ----
    ctx.fillStyle = "#111111";
    const centerY = capH / 2;
    const totalH = lines.length * lineH;
    let y = centerY - totalH / 2 + lineH / 2;
    for (const line of lines) {
      ctx.fillText(line, CANVAS_SIZE / 2, y);
      y += lineH;
    }

    return canvas.toDataURL("image/png");
  }

  // Export PNG
  async function exportPNG() {
    const url = await renderCompositeToCanvas(exportCanvasRef.current);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = "captioned.png";
    a.click();
  }

  // Auto-refresh composite
  useEffect(() => {
    let isActive = true;
    (async () => {
      const url = await renderCompositeToCanvas(exportCanvasRef.current);
      if (isActive) setExportPreviewUrl(url);
    })();
    return () => {
      isActive = false;
    };
  }, [caption, preview]);

  // For video frames
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const update = async () => {
      const url = await renderCompositeToCanvas(exportCanvasRef.current);
      setExportPreviewUrl(url);
    };
    v.addEventListener("timeupdate", update);
    return () => v.removeEventListener("timeupdate", update);
  }, [preview]);

  const isTypingCaption =
    caption && caption !== "Your caption here" && caption.trim().length > 0;
  const showComposite = Boolean(exportPreviewUrl && isTypingCaption);

  const removeFile = () => {
    try {
      videoRef.current?.pause?.();
      if (videoRef.current) {
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
      }
    } catch {}
    setFile(null);
    setPreview(null);
    setExportPreviewUrl(null);
    setIsPlaying(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-white p-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
        📸 Caption Generator
      </h1>

      {/* Top toolbar */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row items-center gap-3 justify-center mb-6">
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onFocus={() => {
            if (caption === "Your caption here") setCaption("");
          }}
          placeholder="Type your caption…"
          className="flex-1 min-w-[260px] text-center md:text-left text-lg md:text-xl font-semibold bg-white border rounded-xl px-4 py-2 outline-none"
        />

        <button
          onClick={exportPNG}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          disabled={!preview}
          title={!preview ? "Upload a file first" : "Export PNG"}
        >
          Export PNG
        </button>

        {!preview ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            Upload File
          </button>
        ) : (
          <button
            onClick={removeFile}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
          >
            Remove & Upload New
          </button>
        )}
      </div>

      {/* Centered drag-and-drop box (visible only when no file) */}
      {!preview && (
        <div
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer select-none w-[280px] h-[280px] rounded-2xl border-2 flex flex-col items-center justify-center text-center text-sm px-3 mb-10
            ${
              isDragging
                ? "border-blue-600 bg-blue-50"
                : "border-dashed border-gray-300 hover:bg-gray-50"
            }`}
          title="Drag & drop a file here, or click to upload"
        >
          <div className="text-gray-500">
            <div className="font-semibold text-gray-700 mb-1">Drag & Drop</div>
            image or video
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Stage (scaled 720x720) */}
      {preview && (
        <div className="relative w-[720px] h-[720px] bg-black flex items-center justify-center rounded-xl overflow-hidden shadow">
          {showComposite ? (
            <img
              src={exportPreviewUrl}
              alt="composite preview"
              className="object-contain w-full h-full"
            />
          ) : file.type.startsWith("image") ? (
            <img src={preview} alt="preview" className="object-contain w-full h-full" />
          ) : (
            <div className="flex items-center justify-center gap-6">
              <div className="relative w-[600px] h-[600px] flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={preview}
                  className="object-contain w-full h-full rounded-lg cursor-pointer"
                  onClick={togglePlay}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                {!isPlaying && (
                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 rounded-lg transition"
                  >
                    <Play size={80} className="text-white drop-shadow-lg" />
                  </button>
                )}
              </div>

              {/* Volume controls */}
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
                <div className="h-28 w-3 flex items-center justify-center">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="accent-blue-600 cursor-pointer [appearance:none] w-full h-28"
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
        </div>
      )}

      <canvas ref={exportCanvasRef} className="hidden" width={1080} height={1080} />
    </div>
  );
}
