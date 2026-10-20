import { NextResponse } from "next/server";

import type { ErrorCode } from "@/lib/tiktok/types";

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  INVALID_URL: 400,
  UNSUPPORTED_URL: 422,
  VIDEO_NOT_FOUND: 404,
  VIDEO_PRIVATE: 403,
  RATE_LIMITED: 429,
  PROVIDER_UNAVAILABLE: 503,
  UPSTREAM_ERROR: 502,
};

const FALLBACK_MESSAGE = "Something went wrong while resolving this video.";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly hint?: string;

  constructor(code: ErrorCode, message: string = FALLBACK_MESSAGE, hint?: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS[code];
    this.hint = hint;
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof Error && /abort|timeout/i.test(error.message)) {
    return new AppError(
      "PROVIDER_UNAVAILABLE",
      "The resolver timed out.",
      "TikTok is responding slowly. Please try again.",
    );
  }

  return new AppError("UPSTREAM_ERROR");
}

export function errorResponse(error: unknown, extraHeaders?: HeadersInit): NextResponse {
  const appError = toAppError(error);

  if (appError.code === "UPSTREAM_ERROR") {
    // Unexpected failures are useful in server logs, but never leak to clients.
    console.error("[lamptik] unexpected error:", error);
  }

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.hint ? { hint: appError.hint } : {}),
      },
    },
    {
      status: appError.status,
      headers: {
        "Cache-Control": "no-store",
        ...(extraHeaders as Record<string, string> | undefined),
      },
    },
  );
}
