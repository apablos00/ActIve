"use client";

import { useEffect, useState } from "react";
import Onboarding from "@/components/Onboarding";
import Library from "@/components/Library";
import Session from "@/components/Session";
import Summary from "@/components/Summary";
import type { ConceptMap, SessionResult, Step, StudentProfile } from "@/lib/types";

const PROFILE_KEY = "sparring.profile";
const MAP_KEY = "sparring.conceptMap";

export default function Page() {
  const [step, setStep] = useState<Step>("onboarding");
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [conceptMap, setConceptMap] = useState<ConceptMap | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [backToTeacher, setBackToTeacher] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (saved) setProfile(JSON.parse(saved));
      const map = localStorage.getItem(MAP_KEY);
      if (map) setConceptMap(JSON.parse(map));
    } catch {}
    setLoaded(true);
  }, []);

  const loadConceptMap = (map: ConceptMap) => {
    setConceptMap(map);
    try {
      localStorage.setItem(MAP_KEY, JSON.stringify(map));
    } catch {}
  };

  const finishOnboarding = (p: StudentProfile) => {
    setProfile(p);
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } catch {}
    setStep("library");
  };

  if (!loaded) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      {step === "onboarding" && <Onboarding initial={profile} startAtTeacher={backToTeacher} onDone={finishOnboarding} />}
      {step === "library" && profile && (
        <Library
          profile={profile}
          conceptMap={conceptMap}
          onLoaded={loadConceptMap}
          onStart={() => setStep("session")}
          onBack={() => {
            setBackToTeacher(true);
            setStep("onboarding");
          }}
        />
      )}
      {step === "session" && profile && conceptMap && (
        <Session
          profile={profile}
          conceptMap={conceptMap}
          onEnd={(r) => {
            setResult(r);
            setStep("summary");
          }}
        />
      )}
      {step === "summary" && <Summary />}
    </main>
  );
}
