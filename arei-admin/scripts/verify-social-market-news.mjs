import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`OK: ${message}`);
  }
}

const api = read("api/social-market-news.js");
const client = read("socialMarketNews.ts");
const app = read("app.tsx");
const view = read("MarketNewsSocialAgentView.tsx");
const migration = fs.readFileSync(path.resolve(root, "../migrations/024_market_news_social_drafts.sql"), "utf8");

assert(api.includes("OPENAI_API_KEY"), "server API supports OpenAI configuration");
assert(api.includes("ANTHROPIC_API_KEY"), "server API supports Anthropic configuration");
assert(api.includes("INSTAGRAM_ACCESS_TOKEN"), "server API supports Instagram token configuration");
assert(api.includes("approval_status !== \"approved\""), "server API enforces approval before Instagram publishing");
assert(api.includes("source_url"), "server API validates source URL fields");
assert(api.includes("publish_status: \"published\""), "server API records successful publish status");
assert(api.includes("publish_status: status"), "server API records publish failures/not configured states");
assert(api.includes("getBearerToken"), "server API reads Supabase Bearer tokens");
assert(api.includes("sb.auth.getUser(token)"), "server API verifies Supabase access tokens");
assert(api.includes(".from(\"admin_users\")"), "server API checks admin_users before allowing access");
assert(api.includes("status: 401"), "server API returns 401 for missing or invalid auth");
assert(api.includes("status: 403"), "server API returns 403 for valid non-admin users");

assert(!client.includes("OPENAI_API_KEY"), "client wrapper does not reference OpenAI secret env var");
assert(!client.includes("ANTHROPIC_API_KEY"), "client wrapper does not reference Anthropic secret env var");
assert(!client.includes("INSTAGRAM_ACCESS_TOKEN"), "client wrapper does not reference Instagram secret env var");
assert(!client.includes("SUPABASE_SERVICE_ROLE_KEY"), "client wrapper does not reference Supabase service-role env var");
assert(client.includes("Authorization: `Bearer ${token}`"), "client sends Supabase access token to Market Social API");
assert(app.includes("MarketNewsSocialAgentView"), "admin UI exposes Market Social tab");
assert(view.includes("canPublishInstagram"), "admin UI disables Instagram publish through local gate");
assert(view.includes("Copy"), "admin UI includes manual copy/export fallback");
assert(view.includes("Generate social drafts"), "admin UI includes generation action");

assert(migration.includes("market_news_social_drafts"), "migration creates market_news_social_drafts table");
assert(migration.includes("ALTER TABLE public.market_news_social_drafts ENABLE ROW LEVEL SECURITY"), "migration enables RLS");
assert(!migration.includes("TO anon"), "migration does not grant anon draft access");

if (process.exitCode) {
  process.exit(process.exitCode);
}
