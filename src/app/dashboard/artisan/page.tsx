import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { StripeOnboardingButton } from "@/components/StripeOnboardingButton";

export default async function ArtisanDashboard() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Fetch the user to check role and stripe account status
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, stripeAccountId: true, city: true },
  });

  if (!user) {
    return <div className="text-center py-10">User not found</div>;
  }

  // Ensure the user is an artisan
  if (user.role !== "ARTISAN") {
    return (
      <div className="text-center py-10">
        <p>You do not have access to the Artisan Dashboard.</p>
      </div>
    );
  }

  return (
    <div className="py-10">
      <h1 className="text-3xl font-bold text-center mb-8">Artisan Dashboard</h1>

      {!user.stripeAccountId && (
        <div className="mb-8 text-center">
          <p className="mb-4">
            Connect your Stripe account to start receiving payments:
          </p>
          <StripeOnboardingButton />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="card">
          <h2 className="text-xl font-semibold mb-2">Upcoming Events</h2>
          <p className="text-muted-foreground">
            (Events feature coming soon — stay tuned for artisan meetups and
            pop-up events!)
          </p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-2">Community Forum</h2>
          <p className="text-muted-foreground">
            (Forum feature coming soon — connect with fellow artisans and share
            ideas.)
          </p>
        </div>
      </div>
    </div>
  );
}
