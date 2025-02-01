"use client";

import { useRouter } from "next/navigation";

export default function OnboardingComplete() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="card max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Onboarding Complete</h1>
        <p className="mb-6">
          Congratulations! Your Stripe account is now connected.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => router.push("/dashboard/artisan")}
        >
          Go to Artisan Dashboard
        </button>
      </div>
    </div>
  );
}
