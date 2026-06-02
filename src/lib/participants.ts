export type ParticipantLike = {
  first_name?: unknown;
  last_name?: unknown;
  full_name?: unknown;
};

function cleanPart(value: unknown) {
  return String(value ?? "").trim();
}

export function buildParticipantFullName(firstName: unknown, lastName: unknown) {
  return [cleanPart(firstName), cleanPart(lastName)].filter(Boolean).join(" ").trim();
}

export function splitParticipantName(fullName: unknown) {
  const normalized = cleanPart(fullName).replace(/\s+/g, " ");
  if (!normalized) return { firstName: "", lastName: "" };

  const [firstName, ...rest] = normalized.split(" ");
  return {
    firstName,
    lastName: rest.join(" ").trim(),
  };
}

export function getParticipantDisplayName(participant: ParticipantLike) {
  const combined = buildParticipantFullName(participant.first_name, participant.last_name);
  return combined || cleanPart(participant.full_name) || "Unnamed participant";
}

export function withParticipantNameFields<T extends Record<string, unknown>>(payload: T) {
  const next: T & {
    first_name?: unknown;
    last_name?: unknown;
    full_name?: unknown;
  } = { ...payload };
  const hasSplitNames = "first_name" in next || "last_name" in next;

  if (hasSplitNames) {
    const firstName = cleanPart(next.first_name);
    const lastName = cleanPart(next.last_name);
    next.first_name = firstName || null;
    next.last_name = lastName || null;
    next.full_name = buildParticipantFullName(firstName, lastName) || cleanPart(next.full_name) || null;
    return next;
  }

  const fullName = cleanPart(next.full_name);
  const { firstName, lastName } = splitParticipantName(fullName);
  next.full_name = fullName || null;
  next.first_name = firstName || null;
  next.last_name = lastName || null;
  return next;
}
