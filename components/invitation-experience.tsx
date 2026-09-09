"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { weddingData } from "@/data/wedding";
import { BackgroundMusic, type BackgroundMusicHandle } from "@/components/background-music";
import { WeddingInvitation } from "@/components/wedding-invitation";
import { lookupGuest } from "@/lib/guest-api";

type AuthorizationState = "idle" | "checking" | "confirmed" | "not-found" | "request-error";
type IdentifiedGuest = { name: string; message: string };

const minimumCheckingDuration = 450;

export function InvitationExperience() {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<AuthorizationState>("idle");
  const [guest, setGuest] = useState<IdentifiedGuest | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isInvitationOpen, setIsInvitationOpen] = useState(false);
  const requestControllerRef = useRef<AbortController | null>(null);
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
    if (!trimmedName || status === "checking") return;

    setStatus("checking");
    setGuest(null);

    const controller = new AbortController();
    requestControllerRef.current = controller;

    try {
      const [result] = await Promise.all([
        lookupGuest(trimmedName, controller.signal),
        new Promise((resolve) => setTimeout(resolve, minimumCheckingDuration)),
      ]);

      if (result.found) {
        setGuest({ name: trimmedName, message: result.message });
        setStatus("confirmed");
      } else {
        setStatus("not-found");
      }
    } catch {
      if (controller.signal.aborted) return;
      setStatus("request-error");
    } finally {
      if (requestControllerRef.current === controller) requestControllerRef.current = null;
    }
  }

  function updateName(value: string) {
    setName(value);
    if (status === "confirmed" || status === "not-found" || status === "request-error") {
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
                <p className="invitation-guest-name">{guest.name} <span>님</span></p>
                <p className="invitation-guest-message">{guest.message}</p>
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

            {status === "not-found" && (
              <div className="invitation-not-found">
                <p>성함을 다시 한번 확인해주세요.</p>
                <small>초대받으신 성함과 동일하게 입력해주세요.</small>
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
