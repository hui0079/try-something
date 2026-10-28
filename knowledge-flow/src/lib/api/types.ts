import type { GraphDocument } from "@/lib/graph/schema";

export type CurrentUser = {
  id: string;
  email: string;
};

export type StoredGraph = {
  id: string;
  userId: string;
  title: string;
  content: GraphDocument;
  createdAt: string;
  updatedAt: string;
};

export type ApiError = {
  error?: {
    code?: string;
    message?: string;
    fields?: { path: string; message: string }[];
  };
};
