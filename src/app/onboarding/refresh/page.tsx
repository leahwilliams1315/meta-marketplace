"use client";

import { useRouter } from "next/navigation";

export default function OnboardingRefresh() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="card max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Onboarding Incomplete</h1>
        <p className="mb-6">
          It looks like your onboarding process was not completed. Please try
          again.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => router.push("/dashboard/artisan")}
        >
          Retry Onboarding
        </button>
      </div>
    </div>
  );
}
