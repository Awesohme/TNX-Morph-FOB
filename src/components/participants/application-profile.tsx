import { BadgeCheck, GraduationCap, Laptop, Mail, Phone, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export type ApplicationProfileRow = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  age_range: string | null;
  institution: string | null;
  level_of_study: string | null;
  background: string | null;
  built_product_before: string | null;
  bootcamp_interest: string | null;
  has_idea: string | null;
  idea_description: string | null;
  beneficiary: string | null;
  skills_hoping_to_gain: string | null;
  giving_back_importance: string | null;
  contribution_interest: string | null;
  interested_community_lead: string | null;
  community_lead_reason: string | null;
  prior_experience: string | null;
  prior_experience_detail: string | null;
  community_strengths: string | null;
  scholarship_code: string | null;
  can_commit: string | null;
  anything_else: string | null;
  heard_about_us: string | null;
  has_laptop: string | null;
  has_internet: string | null;
  good_fit_reason: string | null;
  decision: string | null;
};

function isYes(value: string | null) {
  return Boolean(value && value.trim().toLowerCase().startsWith("yes"));
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[200px_1fr] sm:gap-4">
      <dt className="text-[13px] font-medium text-slate-500">{label}</dt>
      <dd className="whitespace-pre-wrap text-[14px] leading-6 text-slate-800">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  if (Array.isArray(items) && items.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</p>
      <dl className="mt-1 divide-y divide-slate-100">{children}</dl>
    </div>
  );
}

export function ApplicationProfile({ profile }: { profile: ApplicationProfileRow }) {
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || "Applicant";

  return (
    <Card className="space-y-7 overflow-hidden p-0">
      {/* hero */}
      <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-6 pb-6 pt-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Application profile</p>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950">{fullName}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-500">
              {profile.email ? (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-3.5" />
                  {profile.email}
                </span>
              ) : null}
              {profile.phone ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5" />
                  {profile.phone}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isYes(profile.interested_community_lead) ? <Badge tone="blue">Community Lead interest</Badge> : null}
            {profile.decision ? <Badge tone="green">{profile.decision}</Badge> : null}
            <Badge>Read only</Badge>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-[12px]">
          {profile.gender ? <Chip>{profile.gender}</Chip> : null}
          {profile.age_range ? <Chip>{profile.age_range}</Chip> : null}
          {profile.institution ? (
            <Chip>
              <GraduationCap className="size-3.5" />
              {profile.institution}
            </Chip>
          ) : null}
          {profile.level_of_study ? <Chip>{profile.level_of_study}</Chip> : null}
          {profile.background ? <Chip>{profile.background} background</Chip> : null}
          {profile.scholarship_code ? <Chip>Scholarship: {profile.scholarship_code}</Chip> : null}
        </div>
      </div>

      <div className="space-y-7 px-6 pb-7">
        <Section title="Background & interest">
          <DetailRow label="Built a product before" value={profile.built_product_before} />
          <DetailRow label="Interest in bootcamp" value={profile.bootcamp_interest} />
          <DetailRow label="Skills hoping to gain" value={profile.skills_hoping_to_gain} />
        </Section>

        <Section title="Idea & goals">
          <DetailRow label="Has an idea" value={profile.has_idea} />
          <DetailRow label="Idea to build" value={profile.idea_description} />
          <DetailRow label="Who benefits most" value={profile.beneficiary} />
        </Section>

        <Section title="Community & leadership">
          <DetailRow label="Why giving back matters" value={profile.giving_back_importance} />
          <DetailRow label="Ways to contribute" value={profile.contribution_interest} />
          <DetailRow label="Wants Community Lead" value={profile.interested_community_lead} />
          <DetailRow label="Community Lead reason" value={profile.community_lead_reason} />
          <DetailRow label="Prior leadership experience" value={profile.prior_experience} />
          <DetailRow label="Experience detail" value={profile.prior_experience_detail} />
          <DetailRow label="Strengths brought" value={profile.community_strengths} />
        </Section>

        <Section title="Logistics">
          <div className="flex flex-wrap gap-2 py-3">
            <ReadinessChip ok={isYes(profile.has_laptop)} icon={<Laptop className="size-3.5" />} label="Laptop" />
            <ReadinessChip ok={isYes(profile.has_internet)} icon={<Wifi className="size-3.5" />} label="Internet" />
            <ReadinessChip ok={isYes(profile.can_commit)} icon={<BadgeCheck className="size-3.5" />} label="Can commit" />
          </div>
          <DetailRow label="Heard about us" value={profile.heard_about_us} />
          <DetailRow label="Why a good fit" value={profile.good_fit_reason} />
          <DetailRow label="Anything else" value={profile.anything_else} />
        </Section>
      </div>
    </Card>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-slate-600 shadow-sm ring-1 ring-slate-200">
      {children}
    </span>
  );
}

function ReadinessChip({ ok, icon, label }: { ok: boolean; icon: React.ReactNode; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium ${
        ok ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
      }`}
    >
      {icon}
      {label} {ok ? "✓" : "—"}
    </span>
  );
}
