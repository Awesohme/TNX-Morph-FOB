export const ALUMNI_DEMO_DONE = ["Live Presented", "Recorded Submitted"] as const;

function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function qualifiesForAlumni(participant: {
  demo_status?: unknown;
  mvp_status?: unknown;
}) {
  return ALUMNI_DEMO_DONE.includes(String(participant.demo_status ?? "") as (typeof ALUMNI_DEMO_DONE)[number])
    && String(participant.mvp_status ?? "") === "Completed";
}

export function matchesExistingAlumni(
  participant: {
    full_name?: unknown;
    email?: unknown;
    whatsapp?: unknown;
  },
  alumni: {
    name?: unknown;
    email?: unknown;
    whatsapp?: unknown;
  },
) {
  const participantEmail = normalizeText(participant.email);
  const participantWhatsapp = normalizeText(participant.whatsapp);
  const participantName = normalizeText(participant.full_name);
  const alumniEmail = normalizeText(alumni.email);
  const alumniWhatsapp = normalizeText(alumni.whatsapp);
  const alumniName = normalizeText(alumni.name);

  if (participantEmail && alumniEmail && participantEmail === alumniEmail) return true;
  if (participantWhatsapp && alumniWhatsapp && participantWhatsapp === alumniWhatsapp) return true;
  if (!participantEmail && !participantWhatsapp && participantName && alumniName && participantName === alumniName) return true;
  return false;
}
