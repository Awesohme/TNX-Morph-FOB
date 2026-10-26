import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(new URL("../src/lib/list-pagination.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText;
const exports = {};
new Function("exports", compiled)(exports);
const { parseListPage, listPageHref, scanListRows } = exports;
assert.equal(parseListPage(undefined), 1);
assert.equal(parseListPage("3"), 3);
for (const invalid of ["", "0", "-1", "1.5", "1e2", "01", "Infinity", "9007199254740992"]) assert.equal(parseListPage(invalid), null);
const params = new URLSearchParams({ cohort: "alpha", week: "Week 10", risk: "at-risk", page: "2" });
const next = new URL(listPageHref("/participants", params, 3), "http://localhost");
assert.equal(next.searchParams.get("cohort"), "alpha");
assert.equal(next.searchParams.get("week"), "Week 10");
assert.equal(next.searchParams.get("risk"), "at-risk");
assert.equal(next.searchParams.get("page"), "3");
assert.equal(params.get("page"), "2");
for (const total of [0, 100, 500, 1251]) {
  const records = Array.from({ length: total }, (_, id) => ({ id }));
  const calls = [];
  const result = await scanListRows(async (from, to) => {
    calls.push([from, to]);
    assert.equal(to - from + 1, 500);
    return { data: records.slice(from, to + 1), error: null };
  });
  assert.equal(result.data.length, total);
  assert.deepEqual(result.data, records);
  assert.equal(calls.length, Math.floor(total / 500) + 1);
}
const failed = await scanListRows(async (from) => from === 0 ? { data: Array.from({ length: 500 }, (_, id) => ({ id })), error: null } : { data: null, error: { message: "Database unavailable" } });
assert.deepEqual(failed.data, []);
assert.equal(failed.error.message, "Database unavailable");
console.log("List pagination: parser, parameter preservation, 1,251-row scan, exact batch boundary, and partial failure checks passed.");
