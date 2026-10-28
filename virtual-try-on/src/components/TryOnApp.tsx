"use client";

import { useEffect, useState } from "react";

import { ImageDropzone } from "./ImageDropzone";
import styles from "./TryOnApp.module.css";

const GARMENT_TYPES = [
  { id: "top", label: "上衣" },
  { id: "bottom", label: "下装" },
  { id: "dress", label: "连衣裙" },
] as const;

type ImageSlot = {
  file: File;
  previewUrl: string;
};

function replaceSlot(current: ImageSlot | null, file: File | null): ImageSlot | null {
  if (current) {
    URL.revokeObjectURL(current.previewUrl);
  }
  return file ? { file, previewUrl: URL.createObjectURL(file) } : null;
}

export function TryOnApp() {
  const [person, setPerson] = useState<ImageSlot | null>(null);
  const [garment, setGarment] = useState<ImageSlot | null>(null);
  const [garmentType, setGarmentType] = useState("top");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (person) URL.revokeObjectURL(person.previewUrl);
    };
  }, [person]);

  useEffect(() => {
    return () => {
      if (garment) URL.revokeObjectURL(garment.previewUrl);
    };
  }, [garment]);

  async function onSubmit() {
    if (!person || !garment || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    setResultUrl(null);
    const form = new FormData();
    form.set("person", person.file);
    form.set("garment", garment.file);
    form.set("garmentType", garmentType);
    try {
      const response = await fetch("/api/try-on", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as {
        imageUrl?: string;
        error?: string;
      };
      if (!response.ok || !payload.imageUrl) {
        setError(payload.error || "试衣失败，请稍后重试");
        return;
      }
      setResultUrl(payload.imageUrl);
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>VIRTUAL ATELIER</p>
        <h1>试衣间</h1>
        <p className={styles.lede}>
          上传一张正面全身人物照，再上传一件平铺衣物图。模型会按你选的类型把衣服换到人身上，并尽量保住原脸。
        </p>
      </header>

      <section className={styles.uploads}>
        <ImageDropzone
          label="人物照"
          hint="正面全身、单人、光线清楚"
          file={person?.file ?? null}
          previewUrl={person?.previewUrl ?? null}
          inputLabel="选择人物图片"
          onFile={(file) => setPerson((current) => replaceSlot(current, file))}
        />
        <ImageDropzone
          label="衣物照"
          hint="单件平铺、背景干净、主体尽量大"
          file={garment?.file ?? null}
          previewUrl={garment?.previewUrl ?? null}
          inputLabel="选择衣物图片"
          onFile={(file) => setGarment((current) => replaceSlot(current, file))}
        />
      </section>

      <fieldset className={styles.types}>
        <legend>衣物类型</legend>
        <div className={styles.typeRow}>
          {GARMENT_TYPES.map((item) => (
            <label key={item.id} className={styles.typeOption}>
              <input
                type="radio"
                name="garmentType"
                value={item.id}
                checked={garmentType === item.id}
                onChange={() => setGarmentType(item.id)}
              />
              {item.label}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        className={styles.submit}
        type="button"
        disabled={!person || !garment || busy}
        onClick={onSubmit}
      >
        {busy ? "正在试衣…" : "开始试衣"}
      </button>

      {error ? <p className={styles.error}>{error}</p> : null}

      {resultUrl ? (
        <section className={styles.result}>
          <h2>试衣结果</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resultUrl} alt="试衣结果" />
          <a className={styles.download} href={resultUrl} target="_blank" rel="noreferrer">
            打开原图 / 下载
          </a>
        </section>
      ) : null}

      <aside className={styles.notes}>
        <p>人物最好是正面全身；衣物最好是平铺图。只换上衣时，下装有可能被模型重绘。</p>
        <p>出图走阿里云百炼 AI试衣，通常需要 15–40 秒。</p>
      </aside>
    </main>
  );
}
