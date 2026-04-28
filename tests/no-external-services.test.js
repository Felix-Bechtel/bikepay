// Asserts the SPA contains zero LLM / token / paid-API dependencies, and
// that no module in src/ makes outbound network calls. Runs without network
// and without API keys. Uses node:test (Node 20+ built-in).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|jsx|mjs)$/.test(p)) out.push(p);
  }
  return out;
}

const ALL_SOURCES = walk(SRC);

test("package.json has no LLM / paid-API SDK dependencies", () => {
  const pkg = JSON.parse(
    readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8")
  );
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const banned = [
    "@anthropic-ai/sdk",
    "openai",
    "@google/genai",
    "@google-ai/generativelanguage",
    "@huggingface/inference",
    "cohere-ai",
    "replicate",
    "langchain",
  ];
  for (const name of banned) {
    assert.equal(deps[name], undefined, `${name} must not be a dependency`);
  }
});

test("no source file imports a known LLM SDK", () => {
  const banned = [
    /from\s+['"]@anthropic-ai\/sdk['"]/,
    /from\s+['"]openai['"]/,
    /from\s+['"]@google\/genai['"]/,
    /from\s+['"]@huggingface\/inference['"]/,
    /from\s+['"]cohere-ai['"]/,
    /from\s+['"]replicate['"]/,
    /from\s+['"]langchain['"]/,
  ];
  for (const f of ALL_SOURCES) {
    const text = readFileSync(f, "utf8");
    for (const re of banned) {
      assert.doesNotMatch(text, re, `LLM import found in ${f}`);
    }
  }
});

test("no source file calls a known LLM HTTP endpoint", () => {
  const banned = [
    /api\.openai\.com/i,
    /api\.anthropic\.com/i,
    /generativelanguage\.googleapis\.com/i,
    /api\.cohere\.ai/i,
    /api-inference\.huggingface\.co/i,
  ];
  for (const f of ALL_SOURCES) {
    const text = readFileSync(f, "utf8");
    for (const re of banned) {
      assert.doesNotMatch(text, re, `LLM endpoint URL found in ${f}`);
    }
  }
});

test("no source file makes an outbound fetch() to an external host", () => {
  // The SPA is purely local. Any fetch() in src/ would be a regression.
  for (const f of ALL_SOURCES) {
    const text = readFileSync(f, "utf8");
    // Allow fetch in the service worker (it pass-throughs same-origin reqs)
    if (f.endsWith("/sw.js") || f.includes("/public/")) continue;
    assert.doesNotMatch(
      text,
      /\bfetch\s*\(/,
      `Unexpected fetch() in ${f}. The SPA must be purely local.`
    );
  }
});

test("no source file references an Opus codec library", () => {
  const banned = [/\blibopus\b/i, /['"]opusscript['"]/, /['"]opus-recorder['"]/];
  for (const f of ALL_SOURCES) {
    const text = readFileSync(f, "utf8");
    for (const re of banned) {
      assert.doesNotMatch(text, re, `Opus codec dependency in ${f}`);
    }
  }
});

test("no source file uses an API_KEY-style runtime secret", () => {
  const re = /\b(?:OPENAI|ANTHROPIC|HF|COHERE|REPLICATE)_API_KEY\b/;
  for (const f of ALL_SOURCES) {
    const text = readFileSync(f, "utf8");
    assert.doesNotMatch(text, re, `Tokenized API key reference in ${f}`);
  }
});
