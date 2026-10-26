"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { HOUSE_THEMES, PLATFORMS, VIDEO_TYPES } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/studio-bits";

export default function IntakePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [videoType, setVideoType] = useState("skit");
  const [platform, setPlatform] = useState("reels");
  const [goal, setGoal] = useState("");
  const [topic, setTopic] = useState("");
  const [themes, setThemes] = useState<string[]>([...HOUSE_THEMES]);
  const [custom, setCustom] = useState("");
  const [themeNotes, setThemeNotes] = useState("");
  const [mustGoViral, setMustGoViral] = useState(true);
  const [simulateGateMiss, setSimulateGateMiss] = useState(false);
  const [runNow, setRunNow] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const videoItems = Object.fromEntries(VIDEO_TYPES.map((item) => [item.id, item.label]));
  const platformItems = Object.fromEntries(PLATFORMS.map((item) => [item.id, item.label]));

  function toggleTheme(theme: string) {
    setThemes((current) => (current.includes(theme) ? current.filter((item) => item !== theme) : [...current, theme]));
  }

  function addCustom() {
    const next = custom.trim();
    if (!next || themes.includes(next)) return;
    setThemes((current) => [...current, next]);
    setCustom("");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          videoType,
          platform,
          goal,
          topic,
          themes,
          themeNotes,
          mustGoViral,
          simulateGateMiss,
          runNow,
        }),
      });
      const payload = (await response.json()) as { error?: string; job?: { id: string } };
      if (!response.ok || !payload.job) throw new Error(payload.error || "The brief did not file.");
      router.push(`/jobs/${payload.job.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The brief did not file.");
      setPending(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        kicker="Intake"
        title="File the brief."
        lede="House defaults are Black characters, Black issues, and finance, shaped as a short money-moment drama: a hard first line, a dollar on screen, one recurring character, a comment keyword, about 15–45 seconds. Turn any theme off. Any video type is allowed. “Must clear the gate” sends a miss back to the writers’ room. It does not mean the cut will travel."
      />
      <form onSubmit={onSubmit} className="space-y-5 rounded-2xl bg-card px-4 py-5 ring-1 ring-foreground/10 md:px-6">
        <Field label="Working title" hint="Optional. The topic stands in if you leave this blank.">
          <Input value={title} onValueChange={setTitle} placeholder="Closing costs at the kitchen table" className="h-10" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Video type">
            <Select items={videoItems} value={videoType} onValueChange={(value) => setVideoType(value ?? "skit")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIDEO_TYPES.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Platform">
            <Select items={platformItems} value={platform} onValueChange={(value) => setPlatform(value ?? "reels")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Goal" hint="What should a viewer be able to do or say after it?">
          <Textarea value={goal} onChange={(event) => setGoal(event.target.value)} required minLength={8} className="min-h-20" placeholder="Help a first-time buyer spot lender charges before she signs." />
        </Field>
        <Field label="Topic" hint="One specific situation. A person, a document, a number that changed.">
          <Textarea value={topic} onChange={(event) => setTopic(event.target.value)} required minLength={8} className="min-h-24" placeholder="A Houston transit scheduler finds the cash due at closing is not the payment she was quoted." />
        </Field>
        <fieldset>
          <legend className="text-sm font-medium">Themes</legend>
          <p className="mt-1 text-xs text-muted-foreground">Defaults are on. Clear them if this brief is about something else.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {themes.map((theme) => (
              <button
                key={theme}
                type="button"
                aria-pressed="true"
                onClick={() => toggleTheme(theme)}
                className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground"
              >
                {theme}
              </button>
            ))}
            {HOUSE_THEMES.filter((theme) => !themes.includes(theme)).map((theme) => (
              <button
                key={theme}
                type="button"
                aria-pressed="false"
                onClick={() => toggleTheme(theme)}
                className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
              >
                {theme}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input value={custom} onValueChange={setCustom} placeholder="Add another theme" className="h-10" />
            <Button type="button" variant="outline" onClick={addCustom}>
              Add
            </Button>
          </div>
        </fieldset>
        <Field label="Notes for the desks" hint="Optional.">
          <Textarea value={themeNotes} onChange={(event) => setThemeNotes(event.target.value)} className="min-h-16" placeholder="Keep it one person and one document." />
        </Field>
        <Toggle
          checked={mustGoViral}
          onChange={setMustGoViral}
          label="Must clear the viral-readiness gate"
          hint="A miss returns to the writers’ room. After three misses the brief is held for a person. This is not a promise of virality."
        />
        <Toggle
          checked={simulateGateMiss}
          onChange={setSimulateGateMiss}
          label="Demo: fail the first QC pass once"
          hint="The checklist can be clean and the floor still sends it back once, so you can watch the loop. The report says it was an override."
        />
        <Toggle checked={runNow} onChange={setRunNow} label="Run it as soon as it’s filed" hint="Leave this on to watch the desks move. Turn it off to leave the brief queued." />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={pending} className="h-10 px-4">
          {pending ? "Filing…" : "File brief"}
        </Button>
      </form>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="block space-y-1.5">
      <Label>{label}</Label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-muted/60 px-3 py-3">
      <div>
        <p className="text-sm">{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
