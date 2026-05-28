import { promises as fs } from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { ApiError, errorResponse } from "@/server/api-helpers";
import { assertPublicRouteRateLimit } from "@/server/public-route-rate-limit";
import { assertSameOriginRequest } from "@/server/request-security";

export const runtime = "nodejs";

const maxScreenshotCount = 5;
const maxScreenshotBytes = 5 * 1024 * 1024;
const allowedScreenshotTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeFileName(name: string): string {
  return (
    name
      .replaceAll("\\", "-")
      .replaceAll("/", "-")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 90) || "screenshot"
  );
}

function getSupportDirectory(id: string): string {
  const baseDirectory =
    process.env.SUPPORT_REQUESTS_DIR?.trim() ??
    path.join(process.env.VERCEL ? os.tmpdir() : process.cwd(), ".data");
  return path.join(baseDirectory, "support-requests", id);
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    assertPublicRouteRateLimit(request, { route: "support_request" });
    const formData = await request.formData();
    const kind = readText(formData, "kind");
    const email = readText(formData, "email");
    const description = readText(formData, "description");

    if (kind !== "bug" && kind !== "feature") {
      throw new ApiError(400, "Choose bug report or feature request.", "validation_error");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, "Leave a valid email address.", "validation_error");
    }

    if (description.length < 12 || description.length > 5000) {
      throw new ApiError(
        400,
        "Description must be between 12 and 5000 characters.",
        "validation_error",
      );
    }

    const screenshots = formData
      .getAll("screenshots")
      .filter((item): item is File => item instanceof File && item.size > 0);

    if (screenshots.length > maxScreenshotCount) {
      throw new ApiError(400, "Attach up to 5 screenshots.", "validation_error");
    }

    const id = `sr-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
    const directory = getSupportDirectory(id);
    await fs.mkdir(directory, { recursive: true });

    const savedFiles = [];
    for (const [index, file] of screenshots.entries()) {
      if (!allowedScreenshotTypes.has(file.type)) {
        throw new ApiError(
          400,
          "Screenshots must be PNG, JPG, WEBP, or GIF files.",
          "validation_error",
        );
      }
      if (file.size > maxScreenshotBytes) {
        throw new ApiError(
          400,
          "Each screenshot must be 5 MB or smaller.",
          "validation_error",
        );
      }

      const fileName = `${index + 1}-${sanitizeFileName(file.name)}`;
      const bytes = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(path.join(directory, fileName), bytes);
      savedFiles.push({
        name: file.name,
        path: fileName,
        size: file.size,
        type: file.type,
      });
    }

    await fs.writeFile(
      path.join(directory, "request.json"),
      JSON.stringify(
        {
          createdAt: new Date().toISOString(),
          description,
          email,
          id,
          kind,
          screenshots: savedFiles,
          source: "public-support-page",
        },
        null,
        2,
      ),
      "utf8",
    );

    return Response.json({ id, ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
