"use client";

import { useId, type ChangeEvent, type DragEvent } from "react";

import styles from "./TryOnApp.module.css";

type ImageDropzoneProps = {
  label: string;
  hint: string;
  file: File | null;
  previewUrl: string | null;
  inputLabel: string;
  onFile: (file: File | null) => void;
};

export function ImageDropzone({
  label,
  hint,
  file,
  previewUrl,
  inputLabel,
  onFile,
}: ImageDropzoneProps) {
  const inputId = useId();

  function applyFile(next: File | null) {
    onFile(next);
  }

  function onInput(event: ChangeEvent<HTMLInputElement>) {
    applyFile(event.target.files?.[0] ?? null);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    applyFile(event.dataTransfer.files[0] ?? null);
  }

  return (
    <label
      className={previewUrl ? `${styles.dropzone} ${styles.dropzoneFilled}` : styles.dropzone}
      htmlFor={inputId}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <span className={styles.dropLabel}>{label}</span>
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.preview} src={previewUrl} alt={label} />
      ) : (
        <span className={styles.dropHint}>{hint}</span>
      )}
      {file ? <span className={styles.fileName}>{file.name}</span> : null}
      <input
        id={inputId}
        className={styles.fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/bmp"
        aria-label={inputLabel}
        onChange={onInput}
      />
    </label>
  );
}
