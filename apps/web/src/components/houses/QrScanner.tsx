"use client";

import { CameraIcon } from "@kinwoo/icons";
import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";

const REPEAT_IGNORE_MS = 2000;
const SCAN_INTERVAL_MS = 120;
const MAX_FRAME_SIDE = 640;
const ZOOM_LEVELS = [1, 2, 3];

type Status = "starting" | "scanning" | "denied" | "unavailable";
type ZoomCapabilities = MediaTrackCapabilities & { zoom?: { min: number; max: number } };
type ZoomConstraints = MediaTrackConstraintSet & { zoom?: number };

const CORNERS = [
  "left-0 top-0 rounded-tl-xl border-l-4 border-t-4",
  "right-0 top-0 rounded-tr-xl border-r-4 border-t-4",
  "bottom-0 left-0 rounded-bl-xl border-b-4 border-l-4",
  "bottom-0 right-0 rounded-br-xl border-b-4 border-r-4",
];

function cameraSupported(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

export function QrScanner({ onScan }: { onScan: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const onScanRef = useRef(onScan);
  const digitalZoomRef = useRef(1);
  const [status, setStatus] = useState<Status>(() =>
    cameraSupported() ? "starting" : "unavailable",
  );
  const [zoom, setZoom] = useState(1);
  const [levels, setLevels] = useState(ZOOM_LEVELS);
  const [hardwareZoom, setHardwareZoom] = useState(false);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const changeZoom = useCallback(
    (value: number) => {
      setZoom(value);
      if (hardwareZoom) {
        const constraints: ZoomConstraints = { zoom: value };
        trackRef.current?.applyConstraints({ advanced: [constraints] }).catch(() => undefined);
      } else {
        digitalZoomRef.current = value;
      }
    },
    [hardwareZoom],
  );

  useEffect(() => {
    if (!cameraSupported()) return;

    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let last: { value: string; at: number } | null = null;

    const scanFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d", { willReadFrequently: true });
      if (!video || !canvas || !context || video.videoWidth === 0) return;

      const cropWidth = video.videoWidth / digitalZoomRef.current;
      const cropHeight = video.videoHeight / digitalZoomRef.current;
      const scale = Math.min(1, MAX_FRAME_SIDE / Math.max(cropWidth, cropHeight));
      canvas.width = Math.round(cropWidth * scale);
      canvas.height = Math.round(cropHeight * scale);
      context.drawImage(
        video,
        (video.videoWidth - cropWidth) / 2,
        (video.videoHeight - cropHeight) / 2,
        cropWidth,
        cropHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(image.data, image.width, image.height, {
        inversionAttempts: "dontInvert",
      });
      if (!result) return;

      const now = Date.now();
      if (last && last.value === result.data && now - last.at < REPEAT_IGNORE_MS) return;
      last = { value: result.data, at: now };
      onScanRef.current(result.data);
    };

    const loop = () => {
      if (stopped) return;
      scanFrame();
      timer = setTimeout(loop, SCAN_INTERVAL_MS);
    };

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        const video = videoRef.current;
        if (stopped || !video) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();

        // Devices without hardware zoom (iOS Safari, desktops) fall back to cropping the frame.
        const track = stream.getVideoTracks()[0] ?? null;
        const hardware = (track?.getCapabilities?.() as ZoomCapabilities | undefined)?.zoom;
        trackRef.current = track;
        if (hardware && hardware.max > hardware.min) {
          setHardwareZoom(true);
          setLevels(ZOOM_LEVELS.filter((level) => level >= hardware.min && level <= hardware.max));
        }
        setStatus("scanning");
        loop();
      } catch (cause) {
        if (stopped) return;
        const blocked =
          cause instanceof DOMException &&
          (cause.name === "NotAllowedError" || cause.name === "SecurityError");
        setStatus(blocked ? "denied" : "unavailable");
      }
    };

    void start();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      trackRef.current = null;
    };
  }, []);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted">
      <video
        ref={videoRef}
        muted
        playsInline
        aria-label="Camera viewfinder"
        className="size-full object-cover"
        style={{ transform: hardwareZoom ? undefined : `scale(${zoom})` }}
      />
      <canvas ref={canvasRef} hidden />
      {status === "scanning" ? (
        <>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative aspect-square w-[88%]">
              {CORNERS.map((corner) => (
                <div key={corner} className={`absolute size-8 border-white ${corner}`} />
              ))}
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-2">
            {levels.map((level) => (
              <button
                key={level}
                type="button"
                aria-label={`Zoom ${level}x`}
                aria-pressed={level === zoom}
                onClick={() => changeZoom(level)}
                className={`size-8 rounded-full font-display text-xs font-medium hover:cursor-pointer ${
                  level === zoom ? "bg-white text-black" : "bg-black/50 text-white"
                }`}
              >
                {level}x
              </button>
            ))}
          </div>
        </>
      ) : null}
      {status === "denied" || status === "unavailable" ? (
        <div
          role="alert"
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-card p-6 text-center"
        >
          <CameraIcon size={40} className="text-muted-foreground" />
          <p className="font-display text-base font-normal text-center whitespace-pre-line">
            {status === "denied"
              ? "Camera access is blocked.\nAllow it in your browser settings, or enter the code instead."
              : "This browser can't open the camera. Enter the code instead."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
