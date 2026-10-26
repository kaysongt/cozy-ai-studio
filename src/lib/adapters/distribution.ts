export const MUSE_TODO =
  "TODO(muse): Muse's API is unknown. Do not invent endpoints. Before this adapter can publish, Cozy Digital needs the base URL, auth scheme, media upload, schedule timezone, idempotency key, and success payload. Until then this records a stub receipt and does not send the cut anywhere.";

export interface DistributionPackage {
  jobId: string;
  title: string;
  platform: string;
  caption: string;
  scheduledAtUtc: string;
  scheduledLabel: string;
  conditional: boolean;
  assetNotes: string[];
  disclaimer: string;
}

export interface MuseReceipt {
  adapter: "muse";
  stub: true;
  status: "stub_not_sent";
  todo: string;
  scheduledLabel: string;
}

/**
 * Muse distribution adapter.
 * The method is the contract. The body is intentionally a stub.
 */
export interface MuseDistributionAdapter {
  publish(input: DistributionPackage): Promise<MuseReceipt>;
}

export const museAdapter: MuseDistributionAdapter = {
  async publish(input) {
    if (!input.caption.trim()) {
      throw new Error("Muse stub refused an empty caption.");
    }
    if (!input.scheduledAtUtc) {
      throw new Error("Muse stub refused a package with no schedule.");
    }
    return {
      adapter: "muse",
      stub: true,
      status: "stub_not_sent",
      todo: MUSE_TODO,
      scheduledLabel: input.scheduledLabel,
    };
  },
};

export interface SocialReceipt {
  adapter: "social-webhook";
  stub: boolean;
  status: "skipped_no_url" | "delivered" | "error";
  detail: string;
  httpStatus: number | null;
}

/** Posts the same package to SOCIAL_WEBHOOK_URL when that env var is set. */
export async function publishSocialWebhook(input: DistributionPackage): Promise<SocialReceipt> {
  const url = process.env.SOCIAL_WEBHOOK_URL?.trim();
  if (!url) {
    return {
      adapter: "social-webhook",
      stub: true,
      status: "skipped_no_url",
      detail: "SOCIAL_WEBHOOK_URL is empty. Nothing was posted.",
      httpStatus: null,
    };
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      adapter: "social-webhook",
      stub: true,
      status: "error",
      detail: "SOCIAL_WEBHOOK_URL is not a URL.",
      httpStatus: null,
    };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return {
      adapter: "social-webhook",
      stub: true,
      status: "error",
      detail: "SOCIAL_WEBHOOK_URL must be http or https.",
      httpStatus: null,
    };
  }
  try {
    const response = await fetch(parsed, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studio: "Cozy AI Studio",
        ...input,
      }),
    });
    return {
      adapter: "social-webhook",
      stub: false,
      status: response.ok ? "delivered" : "error",
      detail: response.ok ? "Webhook accepted the package." : `Webhook returned HTTP ${response.status}.`,
      httpStatus: response.status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook failed";
    return {
      adapter: "social-webhook",
      stub: false,
      status: "error",
      detail: message,
      httpStatus: null,
    };
  }
}
