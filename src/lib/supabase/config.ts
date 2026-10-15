export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

function requiredPublicValue(name: string, value: string | undefined) {
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}.`);
  }

  return value.trim();
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = requiredPublicValue(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const publishableKey = requiredPublicValue(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be a valid absolute URL.",
    );
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must use the HTTP or HTTPS protocol.",
    );
  }

  return { url, publishableKey };
}