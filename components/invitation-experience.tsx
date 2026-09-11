"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { weddingData } from "@/data/wedding";
import { BackgroundMusic, type BackgroundMusicHandle } from "@/components/background-music";
import { WeddingInvitation } from "@/components/wedding-invitation";
import { lookupGuest } from "@/lib/guest-api";

type AuthorizationState = "idle" | "checking" | "confirmed" | "request-error";
type FallbackGreeting = { firstLine: string; secondLine: string };
type IdentifiedGuest =
  | { name: string; type: "registered"; message: string }
  | { name: string; type: "fallback"; greeting: FallbackGreeting };

const minimumCheckingDuration = 450;
const guestSessionCache = new Map<string, IdentifiedGuest>();

const FALLBACK_FIRST_LINES = [
  "이 초대가 닿아 기쁩니다.",
  "반가운 이름을 확인했습니다.",
  "좋은 소식을 전할 수 있어 기쁩니다.",
  "저희에게 소중한 순간이 찾아왔습니다.",
  "설레는 마음으로 인사드립니다.",
  "저희의 기쁜 소식을 전합니다.",
] as const;

const FALLBACK_SECOND_LINES = [
  "저희 두 사람의 첫걸음을 함께해 주세요.",
  "좋은 날, 함께해 주시면 더없이 기쁘겠습니다.",
  "새로운 시작을 함께 축복해 주세요.",
  "저희의 새로운 시작에 모시고 싶습니다.",
] as const;

function createFallbackGreeting(): FallbackGreeting {
  const firstLine = FALLBACK_FIRST_LINES[
    Math.floor(Math.random() * FALLBACK_FIRST_LINES.length)
  ];
  const secondLine = FALLBACK_SECOND_LINES[
    Math.floor(Math.random() * FALLBACK_SECOND_LINES.length)
  ];

  return {
    firstLine,
    secondLine,
  };
}

export function InvitationExperience() {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<AuthorizationState>("idle");
  const [guest, setGuest] = useState<IdentifiedGuest | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isInvitationOpen, setIsInvitationOpen] = useState(false);
  const requestControllerRef = useRef<AbortController | null>(null);
  const lookupInProgressRef = useRef(false);
  const openingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backgroundMusicRef = useRef<BackgroundMusicHandle | null>(null);

  useEffect(() => {
    return () => {
      requestControllerRef.current?.abort();
      if (openingTimerRef.current) clearTimeout(openingTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isInvitationOpen) return;

    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });

    return () => cancelAnimationFrame(frame);
  }, [isInvitationOpen]);

  async function verifyGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || status === "checking" || lookupInProgressRef.current) return;

    lookupInProgressRef.current = true;
    setStatus("checking");
    setGuest(null);

    const controller = new AbortController();
    requestControllerRef.current = controller;
    const minimumCheckingTime = new Promise((resolve) =>
      setTimeout(resolve, minimumCheckingDuration)
    );

    try {
      const cachedGuest = guestSessionCache.get(trimmedName);

      if (cachedGuest) {
        setGuest(cachedGuest);
        await minimumCheckingTime;
        setStatus("confirmed");
        return;
      }

      const result = await lookupGuest(trimmedName, controller.signal);
      let identifiedGuest: IdentifiedGuest;

      if (result.found) {
        identifiedGuest = {
          name: trimmedName,
          type: "registered",
          message: result.message,
        };
      } else {
        identifiedGuest = {
          name: trimmedName,
          type: "fallback",
          greeting: createFallbackGreeting(),
        };
      }

      guestSessionCache.set(trimmedName, identifiedGuest);
      setGuest(identifiedGuest);
      await minimumCheckingTime;
      setStatus("confirmed");
    } catch {
      if (controller.signal.aborted) return;
      setStatus("request-error");
    } finally {
      if (requestControllerRef.current === controller) requestControllerRef.current = null;
      lookupInProgressRef.current = false;
    }
  }

  function updateName(value: string) {
    setName(value);
    if (status === "confirmed" || status === "request-error") {
      setGuest(null);
      setStatus("idle");
    }
  }

  function openInvitation() {
    if (isUnlocking || isInvitationOpen) return;

    void backgroundMusicRef.current?.play();

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      window.scrollTo({ top: 0, behavior: "auto" });
      setIsInvitationOpen(true);
      return;
    }

    setIsUnlocking(true);
    openingTimerRef.current = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
      setIsInvitationOpen(true);
    }, 420);
  }

  const isChecking = status === "checking";

  if (isInvitationOpen) {
    return (
      <>
        <BackgroundMusic ref={backgroundMusicRef} isVisible />
        <WeddingInvitation />
      </>
    );
  }

  return (
    <>
      <BackgroundMusic ref={backgroundMusicRef} isVisible={false} />
      <section
        className={`invitation-access ${isUnlocking ? "is-unlocking" : ""}`}
        aria-label="모바일 청첩장 하객 확인"
      >
      <div className="invitation-orbit invitation-orbit-one" aria-hidden="true" />
      <div className="invitation-orbit invitation-orbit-two" aria-hidden="true" />

      {isUnlocking && (
        <div className="invitation-unlock-status" role="status" aria-live="assertive">
          <span aria-hidden="true">✓</span>
          <p>접속 승인 완료</p>
        </div>
      )}

      <div className="invitation-minimal-shell">
        <div className="invitation-minimal-marker" aria-hidden="true">
          <span />
          <i />
          <span />
        </div>

        <section className="invitation-details" aria-label="결혼식 정보">
          <div className="invitation-data-block">
            <p className="invitation-data-label">일시</p>
            <p className="invitation-data-value">{weddingData.date} {weddingData.weekday}</p>
            <p className="invitation-data-subvalue">{weddingData.time}</p>
          </div>
          <div className="invitation-technical-divider" aria-hidden="true"><span /></div>
          <div className="invitation-data-block">
            <p className="invitation-data-label">장소</p>
            <p className="invitation-data-value">{weddingData.venue}</p>
            <p className="invitation-data-subvalue">{weddingData.hall}</p>
          </div>
        </section>

        <section className="invitation-authorization" aria-label="초대 대상 확인">
          <div className="invitation-action-transition" aria-hidden="true"><span /></div>
          <p className="invitation-action-prompt">성함을 입력해 주세요</p>

          <form className="invitation-form" onSubmit={verifyGuest}>
            <div className="invitation-input-frame">
              <input
                id="invitation-guest-name"
                type="text"
                value={name}
                onChange={(event) => updateName(event.target.value)}
                placeholder="성함"
                aria-label="성함을 입력해 주세요"
                aria-describedby="invitation-result"
                autoComplete="name"
                disabled={isChecking}
              />
              {isChecking && <span className="invitation-input-scan" aria-hidden="true" />}
            </div>
            <button type="submit" disabled={isChecking || !name.trim()}>
              <span>{isChecking ? "확인 중" : "확인하기"}</span>
              {!isChecking && <i aria-hidden="true">›</i>}
            </button>
          </form>

          <div
            id="invitation-result"
            className={`invitation-result invitation-result-${status}`}
            aria-live="polite"
            aria-atomic="true"
          >
            {status === "checking" && (
              <div className="invitation-checking">
                <span className="invitation-checking-pulse" aria-hidden="true" />
                <p>초대 정보를 확인하고 있습니다...</p>
              </div>
            )}

            {status === "confirmed" && guest && (
              <div className="invitation-confirmed">
                <div className="invitation-confirmed-title">
                  <span aria-hidden="true">✓</span>
                  <div>
                    <p>초대 손님 확인 완료</p>
                  </div>
                </div>
                <p className="invitation-guest-name">
                  {guest.name}{!guest.name.endsWith("님") && <> <span>님</span></>}
                </p>
                <p className="invitation-guest-message">
                  {guest.type === "registered" ? (
                    guest.message
                  ) : (
                    <>
                      <span>{guest.greeting.firstLine}</span>
                      <span>{guest.greeting.secondLine}</span>
                    </>
                  )}
                </p>
                <button
                  type="button"
                  className="invitation-open-button"
                  onClick={openInvitation}
                  disabled={isUnlocking}
                >
                  <span>초대장 열기</span>
                </button>
              </div>
            )}

            {status === "request-error" && (
              <div className="invitation-request-error">
                <p>초대 정보를 불러오지 못했습니다.</p>
                <small>잠시 후 다시 시도해 주세요.</small>
              </div>
            )}
          </div>
        </section>
      </div>
      </section>
    </>
  );
}
