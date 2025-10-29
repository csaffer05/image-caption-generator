import { useState, useRef, useEffect } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("Your caption here");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const videoRef = useRef(null);            // hidden source video
  const fileInputRef = useRef(null);
  const exportCanvasRef = useRef(null);     // 1080 export target
  const previewCanvasRef = useRef(null);    // visible preview canvas

  // Sizes
  const SIZE_EXPORT = 1080;        // export
  const SIZE_PREVIEW_DRAW = 1080;  // draw preview at 1080 for WYSIWYG
  const SIZE_PREVIEW_CSS = 720;    // display size

  // ---------- File load ----------
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreview(null);
    }
  }, [file]);

  // Element preview volume when NOT recording (recording path ignores this)
  useEffect(() => {
    const v = videoRef.current;
    if (!v || isRecording) return;
    v.muted = isMuted;
    v.volume = isMuted ? 0 : volume;
  }, [isMuted, volume, isRecording]);

  const togglePlay = () => {
    if (isRecording) return; // lock during recording
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) v.pause();
    else v.play();
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e) => {
    if (isRecording) return;
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(!(val > 0));
  };

  const applyUploadedFile = (uploadedFile) => {
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setIsPlaying(false);
    setCaption("Your caption here");
  };

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files?.[0];
    applyUploadedFile(uploadedFile);
  };

  // ---------- Drag & Drop (restored) ----------
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const uploadedFile = e.dataTransfer.files?.[0];
    applyUploadedFile(uploadedFile);
  };

  // ---------- Helpers ----------
  function wrapText(ctx, text, maxWidth) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }
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

  /**
   * Compose one frame with true “add-then-resize”:
   * Render to (N × (N+capWork)), then downscale to (N × N), so caption height is preserved.
   */
  function composeFrameTo(ctxOut, N, videoOrImage, captionText, opts = {}) {
    const {
      fontPxFinal = 44,
      paddingXFinal = 32,
      paddingYFinal = 24,
      minLines = 2,
      captionSide = "top", // change to "bottom" if you want
    } = opts;

    // 1) Measure in FINAL space (N×N)
    const measure = document.createElement("canvas").getContext("2d");
    measure.font = `600 ${fontPxFinal}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial`;
    measure.textAlign = "center";
    measure.textBaseline = "middle";
    const maxWidthFinal = N - paddingXFinal * 2;
    const lines = wrapText(measure, captionText || "", maxWidthFinal);
    const m = measure.measureText("M");
    const lineHFinal = Math.max(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent, fontPxFinal) * 1.2;
    const linesCount = Math.max(lines.length, minLines);
    const capFinal = Math.round(linesCount * lineHFinal + paddingYFinal * 2);
    const capFinalClamped = Math.min(Math.max(capFinal, Math.round(1.2 * fontPxFinal)), Math.floor(N * 0.45));

    // 2) Working height so capFinalClamped maps to capFinal after downscale
    const capWork = Math.round((capFinalClamped * N) / (N - capFinalClamped));
    const Hwork = N + capWork;
    const scaleDown = N / Hwork;

    // 3) Offscreen working canvas
    const work = document.createElement("canvas");
    work.width = N;
    work.height = Hwork;
    const wctx = work.getContext("2d");

    // Scale font/padding for working space
    const fontPxWork = fontPxFinal / scaleDown;
    const padXWork = paddingXFinal / scaleDown;
    const padYWork = paddingYFinal / scaleDown;

    // 4) Background
    wctx.fillStyle = "#ffffff";
    wctx.fillRect(0, 0, N, Hwork);

    // 5) Media into N×N block, offset if caption on top
    const mediaY = captionSide === "top" ? capWork : 0;
    const contentH = N;
    if (videoOrImage) drawContain(wctx, videoOrImage, 0, mediaY, N, contentH);

    // 6) Caption rectangle
    const capY = captionSide === "top" ? 0 : Hwork - capWork;
    wctx.fillStyle = "#ffffff";
    wctx.fillRect(0, capY, N, capWork);

    // 7) Caption text
    wctx.font = `600 ${fontPxWork}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial`;
    wctx.textAlign = "center";
    wctx.textBaseline = "middle";
    wctx.fillStyle = "#111111";

    const maxWidthWork = N - padXWork * 2;
    const linesWork = wrapText(wctx, captionText || "", maxWidthWork);
    const mW = wctx.measureText("M");
    const lineHWork = Math.max(mW.actualBoundingBoxAscent + mW.actualBoundingBoxDescent, fontPxWork) * 1.2;

    const centerYWork = capY + capWork / 2;
    const totalHWork = linesWork.length * lineHWork;
    let y = centerYWork - totalHWork / 2 + lineHWork / 2;
    for (const L of linesWork) {
      wctx.fillText(L, N / 2, y);
      y += lineHWork;
    }

    // 8) Downscale to output N×N
    ctxOut.clearRect(0, 0, N, N);
    ctxOut.drawImage(work, 0, 0, N, Hwork, 0, 0, N, N);
  }

  // ---------- Live WYSIWYG preview (draw at 1080, show at 720) ----------
  useEffect(() => {
    const cv = previewCanvasRef.current;
    if (!cv || !file || !preview) return;

    cv.width = SIZE_PREVIEW_DRAW;
    cv.height = SIZE_PREVIEW_DRAW;
    const ctx = cv.getContext("2d");

    let img = null;
    const isImage = file.type.startsWith("image");
    if (isImage) {
      img = new Image();
      img.crossOrigin = "anonymous";
      img.src = preview;
    }

    let raf;
    const tick = () => {
      const source = file.type.startsWith("video") ? videoRef.current : img;
      const ready = file.type.startsWith("video") ? (source && source.readyState >= 2) : !!source?.complete;
      if (ready) composeFrameTo(ctx, SIZE_PREVIEW_DRAW, source, caption);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => raf && cancelAnimationFrame(raf);
  }, [file, preview, caption]);

  // ---------- PNG export ----------
  async function exportPNG() {
    if (!exportCanvasRef.current || !file) return;
    const c = exportCanvasRef.current;
    c.width = SIZE_EXPORT;
    c.height = SIZE_EXPORT;
    const ctx = c.getContext("2d");

    let source = null;
    if (file.type.startsWith("image")) {
      source = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.src = preview;
      });
    } else {
      const v = videoRef.current;
      if (v.readyState < 2) {
        await new Promise((res) => v.addEventListener("loadeddata", res, { once: true }));
      }
      source = v;
    }

    composeFrameTo(ctx, SIZE_EXPORT, source, caption);
    const url = c.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "captioned.png";
    a.click();
  }

  const removeFile = () => {
    try {
      videoRef.current?.pause?.();
      if (videoRef.current) { videoRef.current.removeAttribute("src"); videoRef.current.load(); }
    } catch {}
    setFile(null); setPreview(null); setIsPlaying(false); setCaption("Your caption here");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ---------- WebM export (audio robust + UI locks) ----------
  async function exportWebM() {
    if (!file?.type?.startsWith("video") || !videoRef.current || !exportCanvasRef.current) {
      alert("Upload a video first."); return;
    }
    if (typeof MediaRecorder === "undefined" || !exportCanvasRef.current.captureStream) {
      alert("This browser doesn’t support MediaRecorder/captureStream."); return;
    }

    setIsExportingVideo(true);
    setIsRecording(true);

    const video = videoRef.current;
    const c = exportCanvasRef.current;
    c.width = SIZE_EXPORT;
    c.height = SIZE_EXPORT;
    const ctx = c.getContext("2d");

    // Hard lock playback/seek/rate during recording
    const preventPause = () => { if (isRecording && video.paused) video.play().catch(()=>{}); };
    const preventSeek = (e) => { if (isRecording) { e.preventDefault(); video.currentTime = 0; } };
    const preventRate = () => { if (isRecording && video.playbackRate !== 1) video.playbackRate = 1; };
    video.addEventListener("pause", preventPause);
    video.addEventListener("seeking", preventSeek);
    video.addEventListener("ratechange", preventRate);

    // 1) Canvas stream (video track)
    const canvasStream = c.captureStream(30);

    // 2) AUDIO paths
    let ac, srcNode, recordDest, audioTrack = null;

    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      await ac.resume(); // some browsers require this
      srcNode = ac.createMediaElementSource(video);

      // RECORDING path only (unity gain). We won't route to speakers to avoid echo.
      const recGain = ac.createGain();
      recGain.gain.value = 1.0;
      recordDest = ac.createMediaStreamDestination();
      srcNode.connect(recGain).connect(recordDest);

      // Important: silence speakers from the element (doesn't affect source node)
      video.volume = 0;
      video.muted = true;

      audioTrack = recordDest.stream.getAudioTracks()[0] || null;
    } catch (err) {
      console.warn("[audio] WebAudio graph failed:", err);
    }

    // Fallback: captureStream() audio directly from the element
    if (!audioTrack && video.captureStream) {
      try {
        const vs = video.captureStream();
        const t = vs.getAudioTracks()[0] || null;
        if (t) audioTrack = t;
      } catch (e) {
        console.warn("[audio] captureStream fallback failed:", e);
      }
    }

    // Combine into a FRESH stream (some browsers ignore late-added tracks)
    const combined = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...(audioTrack ? [audioTrack] : []),
    ]);

    if (!audioTrack) {
      console.warn("[audio] No audio track found; export will be silent.");
    }

    // Recorder
    const types = ["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"];
    const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t)) || "video/webm";
    const rec = new MediaRecorder(combined, { mimeType, videoBitsPerSecond: 5_000_000 });
    const chunks = [];
    rec.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);

    let raf;
    const render = () => { composeFrameTo(ctx, SIZE_EXPORT, video, caption); raf = requestAnimationFrame(render); };

    const cleanup = async () => {
      if (raf) cancelAnimationFrame(raf);
      try { video.removeEventListener("pause", preventPause); video.removeEventListener("seeking", preventSeek); video.removeEventListener("ratechange", preventRate); } catch {}
      setIsExportingVideo(false); setIsRecording(false);
      try { video.muted = isMuted; video.volume = isMuted ? 0 : volume; } catch {}
      try { ac && (await ac.close()); } catch {}
    };

    try {
      if (video.readyState < 1) {
        await new Promise((res) => video.addEventListener("loadedmetadata", res, { once: true }));
      }
      video.currentTime = 0; video.playbackRate = 1;

      rec.start(); render();
      await video.play(); // button click = user gesture

      const blob = await new Promise((resolve) => {
        const onEnd = () => rec.stop();
        video.addEventListener("ended", onEnd, { once: true });
        rec.onstop = () => {
          video.removeEventListener("ended", onEnd);
          cleanup();
          resolve(new Blob(chunks, { type: mimeType }));
        };
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "post.webm"; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      await cleanup();
      alert("Video export failed. See console for details.");
    }
  }

  const canExportWebM = !!file?.type?.startsWith("video");

  return (
    <div className="min-h-screen flex flex-col items-center bg-white p-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">📸 Caption Generator</h1>

      {/* Top toolbar */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row items-center gap-3 justify-center mb-6">
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onFocus={() => { if (caption === "Your caption here") setCaption(""); }}
          placeholder="Type your caption…"
          className="flex-1 min-w-[260px] text-center md:text-left text-lg md:text-xl font-semibold bg-white border rounded-xl px-4 py-2 outline-none"
          disabled={isRecording}
        />

        <button
          onClick={exportPNG}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-60"
          disabled={!preview || isRecording}
          title={!preview ? "Upload a file first" : "Export PNG"}
        >Export PNG</button>

        <button
          onClick={exportWebM}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-60"
          disabled={!canExportWebM || isExportingVideo}
          title={!canExportWebM ? "Upload a video" : isExportingVideo ? "Exporting…" : "Export WebM"}
        >{isExportingVideo ? "Exporting…" : "Export WebM"}</button>

        {preview ? (
          <button
            onClick={() => !isRecording && removeFile()}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-60"
            disabled={isRecording}
          >
            Remove &amp; Upload New
          </button>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            Upload File
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

      {/* Stage (WYSIWYG preview: draws at 1080, displayed at 720) */}
      {preview && (
        <div className="relative w-[720px] h-[720px] bg-black flex items-center justify-center rounded-xl overflow-hidden shadow">
          <canvas
            ref={previewCanvasRef}
            className={`block ${isRecording ? "pointer-events-none" : ""}`}
            width={SIZE_PREVIEW_DRAW}
            height={SIZE_PREVIEW_DRAW}
            onClick={() => { if (!isRecording && file?.type?.startsWith("video")) togglePlay(); }}
            style={{ width: `${SIZE_PREVIEW_CSS}px`, height: `${SIZE_PREVIEW_CSS}px` }}
          />
          {!isPlaying && file?.type?.startsWith("video") && !isRecording && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 rounded-lg transition"
            >
              <Play size={80} className="text-white drop-shadow-lg" />
            </button>
          )}
        </div>
      )}

      {/* Volume controls */}
      {preview && file?.type?.startsWith("video") && (
        <div className="mt-4 flex items-center gap-3 bg-white p-3 rounded-xl shadow-md">
          <button
            onClick={() => {
              if (isRecording) return;
              setIsMuted((m) => {
                const next = !m;
                if (!next && volume === 0) setVolume(0.5);
                return next;
              });
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition disabled:opacity-60"
            title={isMuted ? "Unmute" : "Mute"}
            disabled={isRecording}
          >
            {isMuted ? <VolumeX className="text-gray-800" size={26} /> : <Volume2 className="text-gray-800" size={26} />}
          </button>
          <input
            type="range" min="0" max="1" step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="accent-blue-600 cursor-pointer w-40"
            disabled={isRecording}
          />
        </div>
      )}

      {/* Hidden source video */}
      <video
        ref={videoRef}
        src={preview || ""}
        className="hidden"
        playsInline
        crossOrigin="anonymous"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Hidden export canvas */}
      <canvas ref={exportCanvasRef} className="hidden" width={SIZE_EXPORT} height={SIZE_EXPORT} />
    </div>
  );
}
