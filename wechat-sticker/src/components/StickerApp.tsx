"use client";

import { useEffect, useMemo, useState } from "react";

import { defaultCaptions } from "@/lib/sticker-templates";

import styles from "./StickerApp.module.css";

type Step = 1 | 2 | 3;

type SlotStatus = "idle" | "loading" | "done" | "error";

type StickerSlot = {
  caption: string;
  status: SlotStatus;
  imageBase64?: string;
  error?: string;
};

function emptySlots(captions: string[]): StickerSlot[] {
  return captions.map((caption) => ({
    caption,
    status: "idle" as const,
  }));
}

export function StickerApp() {
  const [step, setStep] = useState<Step>(1);
  const [prompt, setPrompt] = useState(
    "圆头圆脑的橘色小猫，穿蓝色卫衣，大眼睛，微笑",
  );
  const [reference, setReference] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [characterBase64, setCharacterBase64] = useState<string | null>(null);
  const [captions, setCaptions] = useState(defaultCaptions);
  const [slots, setSlots] = useState<StickerSlot[]>(() =>
    emptySlots(defaultCaptions()),
  );
  const [busy, setBusy] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gifBusy, setGifBusy] = useState(false);
  const [gifProgress, setGifProgress] = useState<string | null>(null);
  const [gifBase64, setGifBase64] = useState<string | null>(null);
  const [gifError, setGifError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) {
      setReferencePreview(null);
      return;
    }
    const url = URL.createObjectURL(reference);
    setReferencePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [reference]);

  const stepLabel = useMemo(
    () =>
      [
        { id: 1 as const, label: "1. 定妆" },
        { id: 2 as const, label: "2. 文案" },
        { id: 3 as const, label: "3. 下载" },
      ] as const,
    [],
  );

  const doneCount = slots.filter((s) => s.status === "done").length;
  const totalCount = slots.length;

  async function generateCharacter() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("prompt", prompt);
    if (reference) {
      form.set("reference", reference);
    }
    try {
      const response = await fetch("/api/character", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as {
        imageBase64?: string;
        error?: string;
      };
      if (!response.ok || !payload.imageBase64) {
        setError(payload.error || "定妆失败，请稍后重试");
        return;
      }
      setCharacterBase64(payload.imageBase64);
      setSlots(emptySlots(captions));
      setGifBase64(null);
      setGifError(null);
      setGifProgress(null);
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  async function generateOneVariant(
    index: number,
    caption: string,
  ): Promise<StickerSlot> {
    const response = await fetch("/api/variant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        characterBase64,
        caption,
        index,
      }),
    });
    const payload = (await response.json()) as {
      imageBase64?: string;
      error?: string;
    };
    if (!response.ok || !payload.imageBase64) {
      return {
        caption,
        status: "error",
        error: payload.error || "生成失败",
      };
    }
    return {
      caption,
      status: "done",
      imageBase64: payload.imageBase64,
    };
  }

  async function generateAllVariants() {
    if (busy || !characterBase64 || !prompt.trim()) return;
    setBusy(true);
    setError(null);
    setStep(3);

    const next = captions.map((caption) => ({
      caption,
      status: "idle" as const,
    }));
    setSlots(next);

    for (let i = 0; i < captions.length; i++) {
      const caption = captions[i]!;
      setProgressLabel(`正在生成 ${i + 1}/${captions.length}：${caption}`);
      setSlots((current) =>
        current.map((slot, idx) =>
          idx === i
            ? { ...slot, caption, status: "loading", error: undefined }
            : slot,
        ),
      );

      try {
        const result = await generateOneVariant(i, caption);
        setSlots((current) =>
          current.map((slot, idx) => (idx === i ? result : slot)),
        );
      } catch {
        setSlots((current) =>
          current.map((slot, idx) =>
            idx === i
              ? { caption, status: "error", error: "网络异常" }
              : slot,
          ),
        );
      }
    }

    setProgressLabel(null);
    setBusy(false);
  }

  async function retrySlot(index: number) {
    if (busy || !characterBase64 || !prompt.trim()) return;
    const caption = captions[index] ?? slots[index]?.caption;
    if (!caption) return;

    setBusy(true);
    setError(null);
    setProgressLabel(`正在重试 ${index + 1}/${captions.length}：${caption}`);
    setSlots((current) =>
      current.map((slot, idx) =>
        idx === index
          ? { caption, status: "loading", error: undefined }
          : slot,
      ),
    );

    try {
      const result = await generateOneVariant(index, caption);
      setSlots((current) =>
        current.map((slot, idx) => (idx === index ? result : slot)),
      );
    } catch {
      setSlots((current) =>
        current.map((slot, idx) =>
          idx === index
            ? { caption, status: "error", error: "网络异常" }
            : slot,
        ),
      );
    } finally {
      setProgressLabel(null);
      setBusy(false);
    }
  }

  async function exportPack() {
    const ready = slots.filter((s) => s.status === "done" && s.imageBase64);
    if (busy || ready.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stickers: ready.map((s, i) => ({
            caption: s.caption,
            imageBase64: s.imageBase64,
            index: i,
          })),
        }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error || "打包失败，请稍后重试");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "stickers.zip";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  async function generateGifDemo() {
    if (gifBusy || busy || !characterBase64) return;
    setGifBusy(true);
    setGifError(null);
    setGifProgress("正在生成视频并转成 GIF（通常 1–3 分钟）…");
    try {
      const response = await fetch("/api/gif-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterBase64 }),
      });
      const payload = (await response.json()) as {
        gifBase64?: string;
        error?: string;
      };
      if (!response.ok || !payload.gifBase64) {
        setGifError(payload.error || "动图生成失败，请稍后重试");
        setGifProgress(null);
        return;
      }
      setGifBase64(payload.gifBase64);
      setGifProgress(null);
    } catch {
      setGifError("网络异常，请稍后重试");
      setGifProgress(null);
    } finally {
      setGifBusy(false);
    }
  }

  function downloadGif() {
    if (!gifBase64) return;
    const anchor = document.createElement("a");
    anchor.href = gifBase64;
    anchor.download = "sticker.gif";
    anchor.click();
  }

  function updateCaption(index: number, value: string) {
    const next = value.slice(0, 8);
    setCaptions((current) =>
      current.map((item, i) => (i === index ? next : item)),
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>WECHAT STICKER LAB</p>
        <h1>微信表情包生成器</h1>
        <p className={styles.lede}>
          AI 定妆后，按每条文案用定妆图生成表情动图，导出 240×240 循环 GIF
          压缩包，可自行添加到微信自定义表情。
        </p>
      </header>

      <nav className={styles.steps} aria-label="步骤">
        {stepLabel.map((item) => (
          <span
            key={item.id}
            className={`${styles.stepChip} ${
              step === item.id ? styles.stepChipActive : ""
            }`}
          >
            {item.label}
          </span>
        ))}
      </nav>

      {step === 1 && (
        <section className={styles.panel}>
          <label className={styles.label} htmlFor="prompt">
            角色描述
          </label>
          <p className={styles.hint}>
            写清楚外形、服装和气质。可选上传一张参考图做风格参考。
          </p>
          <textarea
            id="prompt"
            className={styles.textarea}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={200}
          />
          <div className={styles.fileRow}>
            <label className={styles.label} htmlFor="reference">
              参考图（可选）
            </label>
            <input
              id="reference"
              className={styles.fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/bmp"
              onChange={(e) => setReference(e.target.files?.[0] ?? null)}
            />
            {referencePreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={styles.refPreview}
                src={referencePreview}
                alt="参考图预览"
              />
            )}
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              disabled={busy || gifBusy || !prompt.trim()}
              onClick={generateCharacter}
            >
              {busy ? "生成中…" : characterBase64 ? "重新定妆" : "生成定妆"}
            </button>
            <button
              type="button"
              className={styles.secondary}
              disabled={!characterBase64 || busy || gifBusy}
              onClick={() => setStep(2)}
            >
              下一步：编辑文案
            </button>
            <button
              type="button"
              className={styles.secondary}
              disabled={!characterBase64 || busy || gifBusy}
              onClick={generateGifDemo}
            >
              {gifBusy ? "动图生成中…" : "试做动图 GIF"}
            </button>
          </div>
          {characterBase64 && (
            <div className={styles.characterPreview}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={characterBase64} alt="定妆角色" />
            </div>
          )}
          {(gifProgress || gifBase64 || gifError) && (
            <div className={styles.gifDemo}>
              {gifProgress && <p className={styles.hint}>{gifProgress}</p>}
              {gifBase64 && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className={styles.gifPreview}
                    src={gifBase64}
                    alt="试做动图预览"
                  />
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.primary}
                      onClick={downloadGif}
                    >
                      下载 sticker.gif
                    </button>
                    <button
                      type="button"
                      className={styles.secondary}
                      disabled={gifBusy || busy}
                      onClick={generateGifDemo}
                    >
                      重新生成动图
                    </button>
                  </div>
                </>
              )}
              {gifError && <p className={styles.error}>{gifError}</p>}
            </div>
          )}
          {error && <p className={styles.error}>{error}</p>}
        </section>
      )}

      {step === 2 && (
        <section className={styles.panel}>
          <p className={styles.hint}>
            每条文案最多 8 个字。下一步会按定妆图逐张生成表情动图（每张约 1–3 分钟，共 8 次图生视频）。
          </p>
          <div className={styles.captionGrid}>
            {captions.map((caption, index) => (
              <div className={styles.captionItem} key={index}>
                <label htmlFor={`caption-${index}`}>表情 {index + 1}</label>
                <input
                  id={`caption-${index}`}
                  className={styles.captionInput}
                  value={caption}
                  maxLength={8}
                  onChange={(e) => updateCaption(index, e.target.value)}
                />
              </div>
            ))}
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              disabled={busy}
              onClick={() => setStep(1)}
            >
              返回定妆
            </button>
            <button
              type="button"
              className={styles.primary}
              disabled={busy || captions.some((c) => !c.trim())}
              onClick={generateAllVariants}
            >
              生成表情动图
            </button>
          </div>
          {error && <p className={styles.error}>{error}</p>}
        </section>
      )}

      {step === 3 && (
        <section className={styles.panel}>
          <p className={styles.hint}>
            {progressLabel
              ? progressLabel
              : `已完成 ${doneCount}/${totalCount}。失败的可单张重试，成功的可打包下载。`}
          </p>
          {busy && (
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-valuenow={doneCount}
              aria-valuemin={0}
              aria-valuemax={totalCount}
            >
              <div
                className={styles.progressBar}
                style={{
                  width: `${Math.round((doneCount / Math.max(totalCount, 1)) * 100)}%`,
                }}
              />
            </div>
          )}
          <div className={styles.previewGrid}>
            {slots.map((slot, index) => (
              <div className={styles.previewCard} key={`${slot.caption}-${index}`}>
                {slot.status === "done" && slot.imageBase64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={slot.imageBase64} alt={slot.caption} />
                ) : (
                  <div className={styles.previewPlaceholder}>
                    {slot.status === "loading"
                      ? "生成中…"
                      : slot.status === "error"
                        ? "失败"
                        : "等待中"}
                  </div>
                )}
                <span>{slot.caption}</span>
                {slot.status === "error" && (
                  <>
                    <p className={styles.slotError}>{slot.error}</p>
                    <button
                      type="button"
                      className={styles.retryBtn}
                      disabled={busy}
                      onClick={() => retrySlot(index)}
                    >
                      重试
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              disabled={busy}
              onClick={() => setStep(2)}
            >
              改文案
            </button>
            <button
              type="button"
              className={styles.primary}
              disabled={busy || doneCount === 0}
              onClick={exportPack}
            >
              {busy && !progressLabel
                ? "打包中…"
                : `下载已成功 ${doneCount} 个动图`}
            </button>
          </div>
          <p className={styles.note}>
            提示：每张表情都会调用一次图生视频（约 1–3 分钟）；本工具不做官方表情商店上架。
          </p>
          {error && <p className={styles.error}>{error}</p>}
        </section>
      )}
    </main>
  );
}
