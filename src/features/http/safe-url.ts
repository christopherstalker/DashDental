"use client";

const pathSegmentPattern = /^[A-Za-z0-9._:-]{1,160}$/;

export function safePathSegment(value: string, label = "identifier"): string {
  const trimmed = value.trim();

  if (!pathSegmentPattern.test(trimmed)) {
    throw new Error(`Invalid ${label}.`);
  }

  return encodeURIComponent(trimmed);
}

export function safeQueryString(
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    const normalized = String(value).trim();
    if (normalized.length > 500) {
      throw new Error(`Invalid ${key}.`);
    }

    searchParams.set(key, normalized);
  }

  return searchParams.toString();
}
