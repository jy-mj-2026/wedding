"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { weddingData } from "@/data/wedding";

type AccountSide = "groom" | "bride";
type CopyStatus = "copied" | "failed";

export function WeddingPracticalInfo() {
  const [hasMapFailed, setHasMapFailed] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isBusOpen, setIsBusOpen] = useState(false);
  const [openAccountSide, setOpenAccountSide] = useState<AccountSide | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<{ key: string; status: CopyStatus } | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tmapFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tmapVisibilityHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (tmapFallbackTimerRef.current) clearTimeout(tmapFallbackTimerRef.current);
      if (tmapVisibilityHandlerRef.current) {
        document.removeEventListener("visibilitychange", tmapVisibilityHandlerRef.current);
      }
    };
  }, []);

  function openTmap(baseUrl: string) {
    const destination = encodeURIComponent(weddingData.venue);
    const deepLink = `${baseUrl}?name=${destination}`;
    const userAgent = navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(userAgent)
      || (/Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(userAgent);
    const fallbackUrl = isIos
      ? "https://apps.apple.com/kr/app/id431589174"
      : isAndroid
        ? "https://play.google.com/store/apps/details?id=com.skt.tmap.ku"
        : weddingData.location.mapLinks[0].url;

    if (tmapFallbackTimerRef.current) clearTimeout(tmapFallbackTimerRef.current);
    if (tmapVisibilityHandlerRef.current) {
      document.removeEventListener("visibilitychange", tmapVisibilityHandlerRef.current);
    }

    const cancelFallback = () => {
      if (document.visibilityState !== "hidden") return;
      if (tmapFallbackTimerRef.current) clearTimeout(tmapFallbackTimerRef.current);
      document.removeEventListener("visibilitychange", cancelFallback);
      tmapVisibilityHandlerRef.current = null;
    };

    tmapVisibilityHandlerRef.current = cancelFallback;
    document.addEventListener("visibilitychange", cancelFallback);
    tmapFallbackTimerRef.current = setTimeout(() => {
      document.removeEventListener("visibilitychange", cancelFallback);
      tmapVisibilityHandlerRef.current = null;
      if (document.visibilityState === "visible") window.location.assign(fallbackUrl);
    }, 1400);

    window.location.assign(deepLink);
  }

  function toggleAccounts(side: AccountSide) {
    setOpenAccountSide((current) => current === side ? null : side);
    setCopyFeedback(null);
  }

  async function copyAccount(accountNumber: string, key: string) {
    if (!accountNumber) return;

    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(accountNumber);
      setCopyFeedback({ key, status: "copied" });
    } catch {
      setCopyFeedback({ key, status: "failed" });
    }

    copyTimerRef.current = setTimeout(() => setCopyFeedback(null), 1600);
  }

  return (
    <>
      <section className="wedding-section wedding-location" aria-labelledby="location-title">
        <div className="wedding-section-heading">
          <p className="wedding-section-code">LOCATION</p>
          <h2 id="location-title">오시는 길</h2>
        </div>

        <div className="wedding-location-address">
          <strong>{weddingData.venue}</strong>
          <p>{weddingData.location.address}<br /><span>{weddingData.location.lotAddress}</span></p>
        </div>

        <div className={`wedding-location-map ${hasMapFailed ? "is-placeholder" : ""}`}>
          <div
            className="wedding-location-map-placeholder"
            role={hasMapFailed ? "img" : undefined}
            aria-label={hasMapFailed ? weddingData.location.mapImage.alt : undefined}
            aria-hidden={hasMapFailed ? undefined : true}
          >
            <span>VENUE MAP</span>
            <small>약도 준비 중</small>
          </div>
          {!hasMapFailed && (
            <Image
              className={isMapLoaded ? "is-loaded" : ""}
              src={weddingData.location.mapImage.src}
              alt={weddingData.location.mapImage.alt}
              width={weddingData.location.mapImage.width}
              height={weddingData.location.mapImage.height}
              sizes="(max-width: 480px) calc(100vw - 48px), 432px"
              loading="lazy"
              onLoad={() => setIsMapLoaded(true)}
              onError={() => setHasMapFailed(true)}
            />
          )}
        </div>

        <div className="wedding-map-links" aria-label="지도 앱에서 열기">
          {weddingData.location.mapLinks.map((mapLink) => mapLink.id === "tmap" ? (
            <button
              key={mapLink.id}
              type="button"
              onClick={() => openTmap(mapLink.url)}
              aria-label={`${mapLink.label}에서 ${weddingData.venue} 검색`}
            >
              {mapLink.label}<span aria-hidden="true">↗</span>
            </button>
          ) : (
            <a key={mapLink.id} href={mapLink.url} target="_blank" rel="noopener noreferrer" aria-label={`${mapLink.label}에서 ${weddingData.venue} 검색`}>
              {mapLink.label}<span aria-hidden="true">↗</span>
            </a>
          ))}
        </div>

        <div className="wedding-arrival-guide">
          <div className="wedding-transport-group">
            <p className="wedding-transport-label">{weddingData.transportation.subway.title}</p>
            <div className="wedding-transport-body">
              <strong className="wedding-transport-primary">{weddingData.transportation.subway.route}</strong>
              <dl className="wedding-transport-secondary">
                {weddingData.transportation.subway.details.map((detail) => (
                  <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>
                ))}
              </dl>
            </div>
          </div>

          <div className="wedding-transport-group">
            <p className="wedding-transport-label">{weddingData.transportation.car.title}</p>
            <div className="wedding-transport-body">
              <strong className="wedding-transport-primary">{weddingData.transportation.parking.benefit}</strong>
              <p className="wedding-transport-secondary">{weddingData.transportation.parking.description}</p>
            </div>
          </div>

          <div className="wedding-transport-group">
            <p className="wedding-transport-label">{weddingData.transportation.bus.title}</p>
            <div className="wedding-transport-body wedding-transport-body--action">
              <strong className="wedding-transport-primary">{weddingData.transportation.bus.stop}</strong>

              <div className={`wedding-bus-accordion wedding-transport-action ${isBusOpen ? "is-open" : ""}`}>
              <button
                type="button"
                aria-expanded={isBusOpen}
                aria-controls="wedding-bus-routes"
                onClick={() => setIsBusOpen((current) => !current)}
              >
                <span>버스 노선 보기</span>
                <i aria-hidden="true" />
              </button>

              {isBusOpen && (
                <div id="wedding-bus-routes" className="wedding-bus-panel">
                  <div className="wedding-bus-routes">
                    {weddingData.transportation.bus.routes.map((route) => (
                      <div key={route.label}>
                        <span>{route.label}</span>
                        <p>{route.numbers.join(", ")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="wedding-chapter-divider" aria-hidden="true"><span /></div>

      <section className="wedding-section wedding-accounts" aria-labelledby="accounts-title">
        <div className="wedding-section-heading">
          <p className="wedding-section-code">WITH GRATITUDE</p>
          <h2 id="accounts-title">마음 전하실 곳</h2>
        </div>
        <p className="wedding-accounts-notice">{weddingData.accounts.notice}</p>

        <div className="wedding-account-accordions">
          {(["groom", "bride"] as const).map((side) => {
            const isOpen = openAccountSide === side;
            const sideLabel = side === "groom" ? "신랑 측" : "신부 측";
            const contentId = `${side}-accounts`;

            return (
              <div key={side} className={`wedding-account-accordion ${isOpen ? "is-open" : ""}`}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={contentId}
                  onClick={() => toggleAccounts(side)}
                >
                  <span>{sideLabel}</span>
                  <i aria-hidden="true" />
                </button>

                {isOpen && (
                  <div id={contentId} className="wedding-account-panel">
                    {weddingData.accounts[side].map((account, index) => {
                      const accountKey = `${side}-${index}`;
                      const feedback = copyFeedback?.key === accountKey ? copyFeedback.status : null;

                      return (
                        <div key={accountKey} className="wedding-account-row">
                          <div className="wedding-account-person">
                            <small>{account.role}</small>
                            <strong>{account.name}</strong>
                          </div>
                          <div className="wedding-account-detail">
                            <span>{account.bank || "은행 정보 준비 중"}</span>
                            <strong>{account.accountNumber || "계좌 정보 준비 중"}</strong>
                          </div>
                          <button
                            type="button"
                            disabled={!account.accountNumber}
                            onClick={() => copyAccount(account.accountNumber, accountKey)}
                            aria-label={account.accountNumber ? `${account.name} 계좌번호 복사` : `${account.name} 계좌 정보 준비 중`}
                          >
                            {feedback === "copied" ? "복사 완료 ✓" : feedback === "failed" ? "복사 실패" : account.accountNumber ? "복사" : "준비 중"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <aside className="wedding-flower-notice" aria-label="화환 안내">
        <div>
          {weddingData.flowerNotice.map((line) => <p key={line}>{line}</p>)}
        </div>
      </aside>
    </>
  );
}
