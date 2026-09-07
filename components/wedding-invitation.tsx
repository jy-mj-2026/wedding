"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { weddingData } from "@/data/wedding";
import { WeddingGallery } from "@/components/wedding-gallery";
import { WeddingPracticalInfo } from "@/components/wedding-practical-info";

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
const galleryPreloadCache = new Map<string, HTMLImageElement>();

function preloadGalleryImages() {
  weddingData.galleryImages.forEach(({ src }) => {
    if (galleryPreloadCache.has(src)) return;

    const image = new window.Image();
    image.decoding = "async";
    image.fetchPriority = "low";
    image.src = src;
    galleryPreloadCache.set(src, image);
  });
}

function getDateParts() {
  const [year, month, day] = weddingData.date
    .split(".")
    .filter(Boolean)
    .map(Number);

  return { year, month, day };
}

function getCalendarDays(year: number, month: number) {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return Array.from({ length: firstWeekday + lastDay }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day > 0 ? day : null;
  });
}

export function WeddingInvitation() {
  const [isMainImageLoaded, setIsMainImageLoaded] = useState(false);
  const [hasMainImageFailed, setHasMainImageFailed] = useState(false);
  const mainImageRef = useRef<HTMLImageElement | null>(null);
  const { year, month, day: weddingDay } = getDateParts();
  const calendarDays = getCalendarDays(year, month);

  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(preloadGalleryImages, { timeout: 800 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = setTimeout(preloadGalleryImages, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const image = mainImageRef.current;
    if (!image) return;

    const handleLoad = () => {
      if (image.naturalWidth > 0) setIsMainImageLoaded(true);
    };
    const handleError = () => setHasMainImageFailed(true);

    if (image.complete) {
      if (image.naturalWidth > 0) handleLoad();
      else handleError();
    } else {
      image.addEventListener("load", handleLoad);
      image.addEventListener("error", handleError);
    }

    return () => {
      image.removeEventListener("load", handleLoad);
      image.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <article
      id="wedding-invitation"
      className="wedding-invitation is-revealed"
      aria-labelledby="wedding-invitation-title"
    >
      <section className="wedding-cover" aria-labelledby="wedding-invitation-title">
        <div className="wedding-cover-content">
          <p>WEDDING INVITATION</p>
          <h1 id="wedding-invitation-title">
            <span>{weddingData.groomName}</span>
            <b aria-hidden="true">&amp;</b>
            <span>{weddingData.brideName}</span>
          </h1>
          <i aria-hidden="true" />
          <p className="wedding-cover-date">
            <span>{year}. {month}. {weddingDay}. SAT</span>
          </p>
          <small>{weddingData.missionCode}</small>
        </div>

        <div className="wedding-cover-scroll" aria-hidden="true">
          <span>SCROLL</span>
          <i>⌄</i>
        </div>
      </section>

      <div className="wedding-main">
        <div className={`wedding-main-image ${hasMainImageFailed ? "is-placeholder" : ""}`}>
          <div
            className="wedding-main-placeholder"
            role={hasMainImageFailed ? "img" : undefined}
            aria-label={hasMainImageFailed ? weddingData.mainImage.alt : undefined}
            aria-hidden={hasMainImageFailed ? undefined : true}
          >
            <span>MAIN PHOTO</span>
            <small>사진 준비 중</small>
          </div>

          {!hasMainImageFailed && (
            <Image
              ref={mainImageRef}
              className={isMainImageLoaded ? "is-loaded" : ""}
              src={weddingData.mainImage.src}
              alt={weddingData.mainImage.alt}
              width={1200}
              height={1500}
              priority
              sizes="(max-width: 480px) 100vw, 480px"
              onLoad={() => setIsMainImageLoaded(true)}
              onError={() => setHasMainImageFailed(true)}
            />
          )}

        </div>
      </div>

      {weddingData.invitationMessage && (
        <section className="wedding-section wedding-message" aria-label="초대 문구">
          <p className="wedding-section-code wedding-message-label">INVITATION</p>
          <div className="wedding-message-content">
            {weddingData.invitationMessage.split("\n\n").map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      )}

      <section className="wedding-section wedding-details" aria-label="신랑신부 및 예식 정보">
        <div className="wedding-family-list">
          <div className="wedding-family-person">
            <p><span>{weddingData.groomFather}</span><i>·</i><span>{weddingData.groomMother}</span>의 아들</p>
            <strong>{weddingData.groomName}</strong>
          </div>
          <div className="wedding-family-divider" aria-hidden="true"><span /></div>
          <div className="wedding-family-person">
            <p><span>{weddingData.brideFather}</span><i>·</i><span>{weddingData.brideMother}</span>의 딸</p>
            <strong>{weddingData.brideName}</strong>
          </div>
        </div>

        <div className="wedding-information-grid">
          <div>
            <small>DATE / TIME</small>
            <strong>{year}년 {month}월 {weddingDay}일 {weddingData.weekday}</strong>
            <p>{weddingData.time}</p>
          </div>
          <div>
            <small>VENUE</small>
            <strong>{weddingData.venue}</strong>
            <p>{weddingData.hall}</p>
          </div>
        </div>

        <div className="wedding-calendar">
          <div className="wedding-calendar-heading">
            <h2 id="calendar-title"><span>{year}</span>{month}월</h2>
          </div>

          <table aria-labelledby="calendar-title">
            <caption>{year}년 {month}월 달력, {weddingDay}일 예식</caption>
            <thead>
              <tr>
                {weekdays.map((weekday) => <th key={weekday} scope="col">{weekday}</th>)}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.ceil(calendarDays.length / 7) }, (_, weekIndex) => (
                <tr key={weekIndex}>
                  {Array.from({ length: 7 }, (_, weekdayIndex) => {
                    const date = calendarDays[weekIndex * 7 + weekdayIndex] ?? null;
                    const isWeddingDay = date === weddingDay;

                    return (
                      <td key={weekdayIndex} className={isWeddingDay ? "is-wedding-day" : undefined}>
                        {date && (
                          <span aria-label={isWeddingDay ? `${date}일, 결혼식 날` : undefined}>
                            {date}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="wedding-chapter-divider" aria-hidden="true"><span /></div>

      <WeddingGallery />

      <div className="wedding-chapter-divider" aria-hidden="true"><span /></div>

      <WeddingPracticalInfo />

      <footer className="wedding-document-footer" aria-hidden="true">
        <small>DOCUMENT END</small>
        <strong>{weddingData.groomName} · {weddingData.brideName}</strong>
        <span>{weddingData.date}</span>
      </footer>
    </article>
  );
}
