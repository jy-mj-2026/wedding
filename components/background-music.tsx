"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { publicAssetPath } from "@/lib/public-path";

const backgroundMusicSource = publicAssetPath("/audio/bgm.mp3");

export type BackgroundMusicHandle = {
  play: () => Promise<boolean>;
};

type BackgroundMusicProps = {
  isVisible: boolean;
};

export const BackgroundMusic = forwardRef<BackgroundMusicHandle, BackgroundMusicProps>(function BackgroundMusic(
  { isVisible },
  ref,
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isTogglingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);

  async function play() {
    const audio = audioRef.current;
    if (!audio) return false;
    if (!audio.paused) return true;
    if (isTogglingRef.current) return false;

    isTogglingRef.current = true;

    try {
      await audio.play();
      return true;
    } catch (error) {
      setIsPlaying(false);
      console.error("배경음악을 재생하지 못했습니다.", error);
      return false;
    } finally {
      isTogglingRef.current = false;
    }
  }

  useImperativeHandle(ref, () => ({ play }));

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || isTogglingRef.current) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    void play();
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={backgroundMusicSource}
        loop
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => setIsPlaying(false)}
      />
      {isVisible && (
        <div className="wedding-bgm">
          <button
            type="button"
            className={isPlaying ? "is-playing" : undefined}
            onClick={togglePlayback}
            aria-label={isPlaying ? "배경음악 일시정지" : "배경음악 재생"}
            aria-pressed={isPlaying}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path className="wedding-bgm-speaker" d="M4.5 9.25h3.1l4.15-3.45v12.4L7.6 14.75H4.5z" />
              {isPlaying ? (
                <>
                  <path className="wedding-bgm-wave" d="M15 8.4c1.8 1.95 1.8 5.25 0 7.2" />
                  <path className="wedding-bgm-wave" d="M17.55 6.1c3.05 3.3 3.05 8.5 0 11.8" />
                </>
              ) : (
                <path className="wedding-bgm-muted" d="m15.2 9.1 4.7 5.8m0-5.8-4.7 5.8" />
              )}
            </svg>
          </button>
        </div>
      )}
    </>
  );
});
