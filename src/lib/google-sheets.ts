import { createSign, createHash } from "crypto";
import { getServerEnv } from "@/lib/env";

const GOOGLE_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_BASE_URL = "https://sheets.googleapis.com/v4/spreadsheets";

type AccessTokenResponse = {
  access_token: string;
  expires_in: number;
};

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function signJwt(payload: Record<string, unknown>, privateKey: string) {
  const header = { alg: "RS256", typ: "JWT" };
  const body = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(body);
  signer.end();
  const signature = signer.sign(privateKey);
  return `${body}.${base64UrlEncode(signature)}`;
}

async function fetchAccessToken() {
  const env = getServerEnv();
  const email = env.googleServiceAccountEmail;
  const privateKey = env.googleServiceAccountPrivateKey.replaceAll("\\n", "\n");
  if (!email || !privateKey) {
    throw new Error("Google Sheets service account credentials are not configured.");
  }

  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt(
    {
      iss: email,
      scope: GOOGLE_SCOPE,
      aud: TOKEN_URL,
      exp: now + 3600,
      iat: now,
    },
    privateKey,
  );

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Could not authenticate Google Sheets: ${text}`);
  }

  return (await response.json()) as AccessTokenResponse;
}

async function sheetsFetch<T>(path: string, init?: RequestInit) {
  const token = await fetchAccessToken();
  const response = await fetch(`${SHEETS_BASE_URL}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Sheets request failed: ${text}`);
  }

  if (response.status === 204) return null as T;
  return (await response.json()) as T;
}

export type SheetValuesResponse = {
  range: string;
  majorDimension: string;
  values?: string[][];
};

export function hashSheetRow(row: Record<string, unknown>) {
  const ordered = Object.keys(row)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = row[key];
      return acc;
    }, {});
  return createHash("sha256").update(JSON.stringify(ordered)).digest("hex");
}

export function columnNumberToLetter(columnNumber: number) {
  let dividend = columnNumber;
  let columnName = "";
  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }
  return columnName;
}

export async function getSheetValues(spreadsheetId: string, sheetName: string) {
  return sheetsFetch<SheetValuesResponse>(`${spreadsheetId}/values/${encodeURIComponent(sheetName)}`);
}

export async function updateSheetRange(spreadsheetId: string, range: string, values: Array<Array<string | number | boolean | null>>) {
  return sheetsFetch(`${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    body: JSON.stringify({
      range,
      majorDimension: "ROWS",
      values,
    }),
  });
}

export async function appendSheetRows(spreadsheetId: string, sheetName: string, values: Array<Array<string | number | boolean | null>>) {
  return sheetsFetch(`${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: JSON.stringify({
      majorDimension: "ROWS",
      values,
    }),
  });
}
