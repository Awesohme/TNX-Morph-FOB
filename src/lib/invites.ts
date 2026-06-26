export type InviteCredentials = {
  fullName: string;
  role: string;
  email: string;
  password: string;
  loginUrl: string;
};

export function roleLabel(role: string) {
  if (role === "admin") return "Admin";
  if (role === "facilitator") return "Facilitator";
  return "Community Manager";
}

export function inviteText(credentials: InviteCredentials) {
  return [
    `Hi${credentials.fullName ? ` ${credentials.fullName.split(" ")[0]}` : ""}! You have been added to Morph by TNX Ops as a ${roleLabel(credentials.role)}.`,
    "",
    "Please see your credentials below:",
    `Email: ${credentials.email}`,
    `Password: ${credentials.password}`,
    "",
    "You can log in here:",
    credentials.loginUrl,
    "",
    "You'll be asked to set your own password on first login.",
  ].join("\n");
}
