import { useState, useRef, useEffect } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("Your caption here");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  // Default to TOP caption
  const [captionPosition, setCaptionPosition] = useState("top"); // "top" | "bottom"
  const [exportPreviewUrl, setExportPreviewUrl] = useState(null);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // hidden canvas for export/preview (still renders at 1080)
  const exportCanvasRef = useRef(null);
  const CANVAS_SIZE = 1080;

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
      setExportPreviewUrl(null);
      setCaptionPosition("top");
    }
  };

  // ---- Shared draw helpers (export & preview) ----
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
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  async function renderCompositeToCanvas(canvas) {
    if (!preview || !canvas) return null;

    const ctx = canvas.getContext("2d");
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    // white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // layout
    const captionPct = 18; // fixed for now
    const capH = Math.round((captionPct / 100) * CANVAS_SIZE);

    // content area depends on caption position
    let contentY = 0;
    let contentH = CANVAS_SIZE - capH;
    if (captionPosition === "top") {
      contentY = capH;
    }

    // draw media (image or current video frame)
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

    // caption bar (top or bottom)
    ctx.fillStyle = "#ffffff";
    if (captionPosition === "top") {
      ctx.fillRect(0, 0, CANVAS_SIZE, capH);
    } else {
      ctx.fillRect(0, CANVAS_SIZE - capH, CANVAS_SIZE, capH);
    }

    // caption text — centered
    const padding = 32;
    const fontPx = 44;
    ctx.fillStyle = "#111111";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = `600 ${fontPx}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial`;

    const maxWidth = CANVAS_SIZE - padding * 2;
    const lines = wrapText(ctx, caption || "", maxWidth);

    const m = ctx.measureText("M");
    const lineH =
      Math.max(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent, fontPx) * 1.2;

    const centerY = captionPosition === "top" ? capH / 2 : CANVAS_SIZE - capH / 2;
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

  // Auto-refresh the export preview when caption/position/preview changes
  useEffect(() => {
    let isActive = true;
    (async () => {
      const url = await renderCompositeToCanvas(exportCanvasRef.current);
      if (isActive) setExportPreviewUrl(url);
    })();
    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caption, captionPosition, preview]);

  // If video, refresh preview on time updates
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const update = async () => {
      const url = await renderCompositeToCanvas(exportCanvasRef.current);
      setExportPreviewUrl(url);
    };
    v.addEventListener("timeupdate", update);
    return () => v.removeEventListener("timeupdate", update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  // When user types a real caption, show composite in the stage
  const isTypingCaption =
    caption && caption !== "Your caption here" && caption.trim().length > 0;
  const showComposite = Boolean(exportPreviewUrl && isTypingCaption);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-white p-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
        📸 Caption Generator
      </h1>

      {/* Top toolbar: caption + buttons (ALWAYS on top) */}
      <div className="w-full max-w-5xl mb-4 flex flex-col md:flex-row items-center gap-3 justify-center">
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

        {/* Caption position toggle (default Top) */}
        <div className="flex items-center gap-1 border rounded-lg px-2 py-1 bg-white">
          <span className="text-sm text-gray-700 mr-1">Caption:</span>
          <button
            onClick={() => setCaptionPosition("top")}
            className={`text-sm px-2 py-1 rounded-md ${
              captionPosition === "top" ? "bg-gray-900 text-white" : "hover:bg-gray-100"
            }`}
          >
            Top
          </button>
          <button
            onClick={() => setCaptionPosition("bottom")}
            className={`text-sm px-2 py-1 rounded-md ${
              captionPosition === "bottom" ? "bg-gray-900 text-white" : "hover:bg-gray-100"
            }`}
          >
            Bottom
          </button>
        </div>

        <button
          onClick={exportPNG}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          Export PNG
        </button>

        {!preview ? (
          <button
            onClick={() => fileInputRef.current.click()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            Upload File
          </button>
        ) : (
          <button
            onClick={() => {
              setFile(null);
              setPreview(null);
              setExportPreviewUrl(null);
            }}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
          >
            Remove & Upload New
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Stage — scaled down to 720×720 */}
      {!preview ? (
        <div className="text-gray-600 mt-8">Upload an image or video to get started</div>
      ) : (
        <div className="relative w-[720px] h-[720px] bg-black flex items-center justify-center rounded-xl overflow-hidden shadow">
          {/* Stage media: raw media OR live composite preview */}
          {showComposite ? (
            <img
              src={exportPreviewUrl}
              alt="composite preview"
              className="object-contain w-full h-full"
            />
          ) : file.type.startsWith("image") ? (
            <img
              src={preview}
              alt="preview"
              className="object-contain w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center gap-6">
              {/* Video container — scaled to fit inside stage */}
              <div className="relative w-[600px] h-[600px] flex items-center justify-center">
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

                {/* Vertical slider */}
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

      {/* hidden canvas for export */}
      <canvas ref={exportCanvasRef} className="hidden" width={1080} height={1080} />
    </div>
  );
}
