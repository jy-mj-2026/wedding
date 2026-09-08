"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { weddingData } from "@/data/wedding";

type GalleryImageData = (typeof weddingData.galleryImages)[number];
type Point = { x: number; y: number };
type LightboxTransform = { scale: number; x: number; y: number };
type LightboxGeometry = {
  mediaWidth: number;
  mediaHeight: number;
  imageWidth: number;
  imageHeight: number;
};
type LightboxGesture =
  | {
      mode: "pan";
      pointerId: number;
      start: Point;
      origin: LightboxTransform;
    }
  | {
      mode: "pinch";
      startDistance: number;
      startMidpoint: Point;
      center: Point;
      origin: LightboxTransform;
    };

const maximumLightboxScale = 3;
const doubleTapLightboxScale = 2;
const doubleTapDelay = 320;
const doubleTapDistance = 32;

function getDistance(first: Point, second: Point) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function getMidpoint(first: Point, second: Point): Point {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

function GalleryImage({ image, lightbox = false }: { image: GalleryImageData; lightbox?: boolean }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const element = imageRef.current;
    if (!element) return;
    let isCurrent = true;

    const revealDecodedImage = async () => {
      try {
        await element.decode();
      } catch {
        // Some browsers reject decode() for an already decoded cached image.
      }

      if (isCurrent && element.naturalWidth > 0) setIsLoaded(true);
    };
    const handleLoad = () => { void revealDecodedImage(); };
    const handleError = () => setHasFailed(true);

    if (element.complete) {
      if (element.naturalWidth > 0) void revealDecodedImage();
      else handleError();
    } else {
      element.addEventListener("load", handleLoad);
      element.addEventListener("error", handleError);
    }

    return () => {
      isCurrent = false;
      element.removeEventListener("load", handleLoad);
      element.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <div className={`wedding-gallery-image ${lightbox ? "is-lightbox" : ""}`}>
      <div
        className="wedding-gallery-placeholder"
        role={hasFailed ? "img" : undefined}
        aria-label={hasFailed ? image.alt : undefined}
        aria-hidden={hasFailed ? undefined : true}
      >
        <span>PHOTO</span>
        <i aria-hidden="true" />
      </div>
      {!hasFailed && (
        <Image
          ref={imageRef}
          className={isLoaded ? "is-loaded" : ""}
          src={image.src}
          alt={image.alt}
          fill
          sizes={lightbox ? "100vw" : "(max-width: 480px) calc(100vw - 48px), 432px"}
          loading="eager"
          draggable={false}
          onContextMenu={(event) => event.preventDefault()}
          onDragStart={(event) => event.preventDefault()}
          onError={() => setHasFailed(true)}
        />
      )}
    </div>
  );
}

export function WeddingGallery() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"previous" | "next">("next");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const galleryRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const slidePointerStartRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const slideSwipeTimeRef = useRef(0);
  const lightboxMediaRef = useRef<HTMLDivElement | null>(null);
  const lightboxTransformElementRef = useRef<HTMLDivElement | null>(null);
  const lightboxPointersRef = useRef(new Map<number, Point>());
  const lightboxGestureRef = useRef<LightboxGesture | null>(null);
  const lightboxTransformRef = useRef<LightboxTransform>({ scale: 1, x: 0, y: 0 });
  const lightboxGeometryRef = useRef<LightboxGeometry | null>(null);
  const lightboxHadPinchRef = useRef(false);
  const lightboxLastTapRef = useRef<{ time: number; point: Point } | null>(null);
  const images = weddingData.galleryImages;
  const isLightboxOpen = activeIndex !== null;

  function measureLightboxGeometry() {
    const media = lightboxMediaRef.current;
    if (!media) return null;

    const mediaWidth = media.clientWidth;
    const mediaHeight = media.clientHeight;
    const image = lightboxTransformElementRef.current?.querySelector("img");

    if (!image?.naturalWidth || !image.naturalHeight) {
      return { mediaWidth, mediaHeight, imageWidth: mediaWidth, imageHeight: mediaHeight };
    }

    const fitScale = Math.min(mediaWidth / image.naturalWidth, mediaHeight / image.naturalHeight);
    return {
      mediaWidth,
      mediaHeight,
      imageWidth: image.naturalWidth * fitScale,
      imageHeight: image.naturalHeight * fitScale,
    };
  }

  function applyLightboxTransform(next: LightboxTransform, animated = false) {
    const scale = Math.max(1, Math.min(maximumLightboxScale, next.scale));
    const geometry = lightboxGeometryRef.current ?? measureLightboxGeometry();
    if (geometry) lightboxGeometryRef.current = geometry;

    const horizontalLimit = geometry
      ? Math.max(0, (geometry.imageWidth * scale - geometry.mediaWidth) / 2)
      : 0;
    const verticalLimit = geometry
      ? Math.max(0, (geometry.imageHeight * scale - geometry.mediaHeight) / 2)
      : 0;
    const transform = {
      scale,
      x: scale === 1 ? 0 : Math.max(-horizontalLimit, Math.min(horizontalLimit, next.x)),
      y: scale === 1 ? 0 : Math.max(-verticalLimit, Math.min(verticalLimit, next.y)),
    };

    lightboxTransformRef.current = transform;
    const element = lightboxTransformElementRef.current;
    if (!element) return;

    element.style.transition = animated ? "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)" : "none";
    element.style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`;
  }

  function beginPinchGesture() {
    const points = Array.from(lightboxPointersRef.current.values());
    if (points.length < 2) return;

    const [first, second] = points;
    const rect = lightboxMediaRef.current?.getBoundingClientRect();
    const center = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: 0, y: 0 };

    lightboxHadPinchRef.current = true;
    lightboxGestureRef.current = {
      mode: "pinch",
      startDistance: Math.max(1, getDistance(first, second)),
      startMidpoint: getMidpoint(first, second),
      center,
      origin: { ...lightboxTransformRef.current },
    };
  }

  function toggleLightboxZoom(point: Point) {
    if (lightboxTransformRef.current.scale > 1) {
      applyLightboxTransform({ scale: 1, x: 0, y: 0 }, true);
      return;
    }

    const rect = lightboxMediaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    const scaleOffset = doubleTapLightboxScale - 1;

    applyLightboxTransform({
      scale: doubleTapLightboxScale,
      x: -(point.x - center.x) * scaleOffset,
      y: -(point.y - center.y) * scaleOffset,
    }, true);
  }

  useEffect(() => {
    if (!isLightboxOpen) return;

    const body = document.body;
    const invitation = document.querySelector<HTMLElement>("#wedding-invitation");
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const scrollPosition = window.scrollY;
    const previousStyles = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };

    invitation?.setAttribute("inert", "");
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollPosition}px`;
    body.style.width = "100%";
    const frame = requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      cancelAnimationFrame(frame);
      invitation?.removeAttribute("inert");
      body.style.overflow = previousStyles.overflow;
      body.style.position = previousStyles.position;
      body.style.top = previousStyles.top;
      body.style.width = previousStyles.width;
      const root = document.documentElement;
      const previousScrollBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.scrollTo({ top: scrollPosition, behavior: "auto" });
      root.style.scrollBehavior = previousScrollBehavior;
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [isLightboxOpen]);

  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex((current) => current === null ? null : Math.max(0, current - 1));
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveIndex((current) => current === null ? null : Math.min(images.length - 1, current + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length, isLightboxOpen]);

  useEffect(() => {
    lightboxPointersRef.current.clear();
    lightboxGestureRef.current = null;
    lightboxHadPinchRef.current = false;
    lightboxLastTapRef.current = null;
    lightboxGeometryRef.current = null;
    lightboxTransformRef.current = { scale: 1, x: 0, y: 0 };

    const element = lightboxTransformElementRef.current;
    if (element) {
      element.style.transition = "none";
      element.style.transform = "translate3d(0, 0, 0) scale(1)";
    }
  }, [activeIndex]);

  function moveSlide(direction: -1 | 1) {
    const nextIndex = Math.max(0, Math.min(images.length - 1, currentIndex + direction));
    if (nextIndex === currentIndex) return;
    setSlideDirection(direction < 0 ? "previous" : "next");
    setCurrentIndex(nextIndex);
  }

  function moveLightbox(direction: -1 | 1) {
    lightboxPointersRef.current.clear();
    lightboxGestureRef.current = null;
    lightboxHadPinchRef.current = false;
    lightboxLastTapRef.current = null;
    lightboxGeometryRef.current = null;
    lightboxTransformRef.current = { scale: 1, x: 0, y: 0 };

    const element = lightboxTransformElementRef.current;
    if (element) {
      element.style.transition = "none";
      element.style.transform = "translate3d(0, 0, 0) scale(1)";
    }

    setActiveIndex((current) => current === null
      ? null
      : Math.max(0, Math.min(images.length - 1, current + direction)));
  }

  function handleSlidePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse") return;
    slidePointerStartRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function handleSlidePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const start = slidePointerStartRef.current;
    slidePointerStartRef.current = null;
    if (!start || start.id !== event.pointerId) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.3) return;
    slideSwipeTimeRef.current = Date.now();
    moveSlide(deltaX < 0 ? 1 : -1);
  }

  function handleLightboxPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    lightboxTransformElementRef.current?.style.setProperty("transition", "none");
    lightboxGeometryRef.current = measureLightboxGeometry();
    lightboxPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (lightboxPointersRef.current.size >= 2) {
      beginPinchGesture();
      return;
    }

    lightboxGestureRef.current = {
      mode: "pan",
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      origin: { ...lightboxTransformRef.current },
    };
  }

  function handleLightboxPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!lightboxPointersRef.current.has(event.pointerId)) return;

    lightboxPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const gesture = lightboxGestureRef.current;

    if (lightboxPointersRef.current.size >= 2) {
      event.preventDefault();
      if (!gesture || gesture.mode !== "pinch") {
        beginPinchGesture();
        return;
      }

      const [first, second] = Array.from(lightboxPointersRef.current.values());
      const midpoint = getMidpoint(first, second);
      const scale = Math.max(
        1,
        Math.min(maximumLightboxScale, gesture.origin.scale * (getDistance(first, second) / gesture.startDistance)),
      );
      const scaleRatio = scale / gesture.origin.scale;
      const focalX = gesture.startMidpoint.x - gesture.center.x - gesture.origin.x;
      const focalY = gesture.startMidpoint.y - gesture.center.y - gesture.origin.y;

      applyLightboxTransform({
        scale,
        x: midpoint.x - gesture.center.x - focalX * scaleRatio,
        y: midpoint.y - gesture.center.y - focalY * scaleRatio,
      });
      return;
    }

    if (gesture?.mode === "pan" && gesture.pointerId === event.pointerId && gesture.origin.scale > 1) {
      event.preventDefault();
      applyLightboxTransform({
        scale: gesture.origin.scale,
        x: gesture.origin.x + event.clientX - gesture.start.x,
        y: gesture.origin.y + event.clientY - gesture.start.y,
      });
    }
  }

  function handleLightboxPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = lightboxGestureRef.current;
    const wasSinglePointer = lightboxPointersRef.current.size === 1;
    const hadPinch = lightboxHadPinchRef.current;
    const pointerDelta = gesture?.mode === "pan" && gesture.pointerId === event.pointerId
      ? {
          x: event.clientX - gesture.start.x,
          y: event.clientY - gesture.start.y,
        }
      : null;
    const canSwipe = wasSinglePointer
      && gesture?.mode === "pan"
      && gesture.pointerId === event.pointerId
      && !hadPinch
      && lightboxTransformRef.current.scale === 1;
    const deltaX = canSwipe && pointerDelta ? pointerDelta.x : 0;
    const deltaY = canSwipe && pointerDelta ? pointerDelta.y : 0;
    const isTap = wasSinglePointer
      && !hadPinch
      && pointerDelta !== null
      && Math.hypot(pointerDelta.x, pointerDelta.y) < 12;

    lightboxPointersRef.current.delete(event.pointerId);

    if (lightboxPointersRef.current.size === 1) {
      const [pointerId, point] = Array.from(lightboxPointersRef.current.entries())[0];
      lightboxGestureRef.current = {
        mode: "pan",
        pointerId,
        start: point,
        origin: { ...lightboxTransformRef.current },
      };
    } else if (lightboxPointersRef.current.size === 0) {
      lightboxGestureRef.current = null;
      lightboxHadPinchRef.current = false;
    }

    if (Math.abs(deltaX) >= 52 && Math.abs(deltaX) >= Math.abs(deltaY) * 1.25) {
      lightboxLastTapRef.current = null;
      moveLightbox(deltaX < 0 ? 1 : -1);
      return;
    }

    if (isTap) {
      const tap = { x: event.clientX, y: event.clientY };
      const now = Date.now();
      const previousTap = lightboxLastTapRef.current;

      if (
        previousTap
        && now - previousTap.time <= doubleTapDelay
        && getDistance(previousTap.point, tap) <= doubleTapDistance
      ) {
        lightboxLastTapRef.current = null;
        toggleLightboxZoom(tap);
      } else {
        lightboxLastTapRef.current = { time: now, point: tap };
      }
    }
  }

  function handleLightboxPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    lightboxPointersRef.current.delete(event.pointerId);
    lightboxGestureRef.current = null;
    lightboxHadPinchRef.current = false;
    lightboxLastTapRef.current = null;
  }

  const lightbox = activeIndex !== null ? createPortal(
    <div className="wedding-lightbox" role="dialog" aria-modal="true" aria-label="웨딩 사진 크게 보기">
      <div className="wedding-lightbox-topbar">
        <p aria-live="polite">{activeIndex + 1} / {images.length}</p>
        <button ref={closeButtonRef} type="button" onClick={() => setActiveIndex(null)} aria-label="사진 크게 보기 닫기">×</button>
      </div>

      <div
        ref={lightboxMediaRef}
        className="wedding-lightbox-media"
        onPointerDown={handleLightboxPointerDown}
        onPointerMove={handleLightboxPointerMove}
        onPointerUp={handleLightboxPointerUp}
        onPointerCancel={handleLightboxPointerCancel}
      >
        <div
          key={images[activeIndex].src}
          ref={lightboxTransformElementRef}
          className="wedding-lightbox-transform"
        >
          <GalleryImage image={images[activeIndex]} lightbox />
        </div>
      </div>

      <button className="wedding-lightbox-nav is-previous" type="button" onClick={() => moveLightbox(-1)} aria-label="이전 사진" disabled={activeIndex === 0}>‹</button>
      <button className="wedding-lightbox-nav is-next" type="button" onClick={() => moveLightbox(1)} aria-label="다음 사진" disabled={activeIndex === images.length - 1}>›</button>
    </div>,
    document.body,
  ) : null;

  return (
    <section ref={galleryRef} className="wedding-section wedding-gallery" aria-labelledby="gallery-title">
      <div className="wedding-section-heading">
        <p className="wedding-section-code">VISUAL ARCHIVE</p>
        <h2 id="gallery-title">갤러리</h2>
      </div>

      <div className="wedding-gallery-carousel">
        <div className="wedding-gallery-frame">
          <button
            key={images[currentIndex].src}
            type="button"
            className={`wedding-gallery-slide is-${slideDirection}`}
            onClick={() => {
              if (Date.now() - slideSwipeTimeRef.current < 400) return;
              setActiveIndex(currentIndex);
            }}
            onPointerDown={handleSlidePointerDown}
            onPointerUp={handleSlidePointerUp}
            onPointerCancel={() => { slidePointerStartRef.current = null; }}
            aria-label={`${images[currentIndex].alt} 크게 보기`}
          >
            <GalleryImage image={images[currentIndex]} />
          </button>
        </div>

        <div className="wedding-gallery-controls">
          <button type="button" onClick={() => moveSlide(-1)} aria-label="이전 사진" disabled={currentIndex === 0}>‹</button>
          <div className="wedding-gallery-status">
            <p className="wedding-gallery-counter" aria-live="polite">
              {String(currentIndex + 1).padStart(2, "0")} <span>/</span> {String(images.length).padStart(2, "0")}
            </p>
            <div
              className="wedding-gallery-progress"
              role="progressbar"
              aria-label="갤러리 진행 상태"
              aria-valuemin={1}
              aria-valuemax={images.length}
              aria-valuenow={currentIndex + 1}
            >
              <i style={{ transform: `scaleX(${(currentIndex + 1) / images.length})` }} />
            </div>
          </div>
          <button type="button" onClick={() => moveSlide(1)} aria-label="다음 사진" disabled={currentIndex === images.length - 1}>›</button>
        </div>
      </div>

      {lightbox}
    </section>
  );
}
