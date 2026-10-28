"use client";

import dynamic from "next/dynamic";

/**
 * The whole game lives in the browser: the world is built from a seed, and where
 * a session resumes from depends on the URL and on localStorage. There is
 * nothing for the server to render that the client would agree with, so we skip
 * server rendering rather than paper over a hydration mismatch.
 */
const ColonyView = dynamic(
  () => import("@/components/colony-view").then((m) => m.ColonyView),
  {
    ssr: false,
    loading: () => (
      <p className="p-6 text-sm text-muted">正在开垦这片土地……</p>
    ),
  },
);

export default function Home() {
  return <ColonyView />;
}
