## src/app/api/marketplaces/route.ts

```ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// For the POST request
export async function POST(req: Request) {
  // 1) Auth
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  try {
    const { name, description } = (await req.json()) as {
      name: string;
      description?: string;
    };

    if (!name) {
      return NextResponse.json(
        { error: "Marketplace name is required" },
        { status: 400 }
      );
    }

    // 2) Ensure user exists in database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      // Create user if they don't exist
      await prisma.user.create({
        data: { id: userId },
      });
    }

    // 3) Create marketplace with owner and member relationships
    const slug = name.trim().toLowerCase().replace(/\s+/g, "-");
    const marketplace = await prisma.marketplace.create({
      data: {
        name,
        description,
        slug,
        owners: {
          connect: { id: userId },
        },
        members: {
          connect: { id: userId },
        },
      },
      include: {
        owners: true,
        members: true,
      },
    });

    return NextResponse.json(marketplace);
  } catch (error) {
    console.error("POST /api/marketplaces error:", error);
    return NextResponse.json(
      { error: "Something went wrong creating the marketplace" },
      { status: 500 }
    );
  }
}

// For the GET request
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  try {
    // Find all marketplaces where user is an owner or member
    const marketplaces = await prisma.marketplace.findMany({
      where: {
        OR: [
          { owners: { some: { id: userId } } },
          { members: { some: { id: userId } } },
        ],
      },
      include: {
        owners: true,
        members: true,
      },
    });

    return NextResponse.json(marketplaces);
  } catch (error) {
    console.error("GET /api/marketplaces error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

```

## src/app/api/products/route.ts

```ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  try {
    const { name, description, price, images, marketplaceId } =
      await req.json();

    // 1) Verify the user is a member or owner of the marketplace
    const marketplace = await prisma.marketplace.findUnique({
      where: { id: marketplaceId },
      include: { members: true, owners: true },
    });
    if (!marketplace) {
      return NextResponse.json(
        { error: "Marketplace not found" },
        { status: 404 }
      );
    }

    const isMemberOrOwner =
      marketplace.members.some((m) => m.id === userId) ||
      marketplace.owners.some((o) => o.id === userId);

    if (!isMemberOrOwner) {
      return NextResponse.json(
        { error: "You are not a member of this marketplace" },
        { status: 403 }
      );
    }

    // 2) Create the product
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: price || 0,
        images: images || [],
        sellerId: userId,
        marketplaceId,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}

```

## src/app/api/stripe/connect/route.ts

```ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createConnectAccount } from "@/lib/stripe";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email } = await req.json();
    const url = await createConnectAccount(userId, email);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Stripe Connect error:", error);
    return NextResponse.json(
      { error: "Failed to create Stripe account" },
      { status: 500 }
    );
  }
}

```

## src/app/api/webhooks/clerk/route.ts

```ts
import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { Webhook } from "svix";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  console.log("Received webhook request");

  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env"
    );
  }

  // Get the headers asynchronously
  const headersList = await headers();
  const svix_id = headersList.get("svix-id");
  const svix_timestamp = headersList.get("svix-timestamp");
  const svix_signature = headersList.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.log("Missing svix headers");
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  let evt: WebhookEvent;

  try {
    const rawBody = await req.text();

    if (!rawBody) {
      console.log("Empty request body");
      return new Response("Empty request body", { status: 400 });
    }

    // Create a new Webhook instance with your secret
    const wh = new Webhook(WEBHOOK_SECRET);

    // Verify the webhook and get the event data
    evt = wh.verify(rawBody, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;

    // Get the ID and event type from the verified event
    const { id } = evt.data as { id: string };
    const eventType = evt.type;

    console.log(`Processing ${eventType} event for user ${id}`);

    // Handle the webhook
    if (eventType === "user.created") {
      await prisma.user.create({
        data: {
          id,
        },
      });
      console.log(`Created user ${id}`);
    }

    if (eventType === "user.deleted") {
      await prisma.user.delete({
        where: { id },
      });
      console.log(`Deleted user ${id}`);
    }

    return new Response("Webhook processed successfully", { status: 200 });
  } catch (err) {
    // Safe error logging that won't cause console.error to throw
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.log("Webhook error:", errorMessage);

    return new Response(`Webhook error: ${errorMessage}`, { status: 500 });
  }
}

```

## src/app/create-marketplace/[[...rest]]/page.tsx

```ts
"use client";

import { useAuth, SignIn, SignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";

export default function CreateMarketplacePage() {
  const router = useRouter();
  const { userId, isLoaded } = useAuth();

  // Tab for sign in vs. sign up if user is not logged in
  const [activeAuthForm, setActiveAuthForm] = useState<"sign_in" | "sign_up">(
    "sign_in"
  );

  // Marketplace creation form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [successSlug, setSuccessSlug] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // If user not signed in -> show sign in / sign up inline
  if (!userId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="max-w-md w-full p-6 bg-white rounded shadow space-y-6">
          <h2 className="text-2xl font-bold text-center">
            Create a Marketplace
          </h2>
          <p className="text-center text-gray-600">
            Please sign in or sign up below (or use the Sign In button in the
            nav).
          </p>

          <div className="flex border-b border-gray-200">
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeAuthForm === "sign_in"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500"
              }`}
              onClick={() => setActiveAuthForm("sign_in")}
            >
              Sign In
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeAuthForm === "sign_up"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500"
              }`}
              onClick={() => setActiveAuthForm("sign_up")}
            >
              Sign Up
            </button>
          </div>

          {activeAuthForm === "sign_in" ? (
            <SignIn
              afterSignInUrl="/create-marketplace"
              appearance={{
                elements: {
                  card: "shadow-none p-0 border-0",
                  formFieldInput: "bg-gray-100 rounded",
                  formButtonPrimary:
                    "bg-blue-600 hover:bg-blue-700 text-white border-0",
                },
              }}
            />
          ) : (
            <SignUp
              afterSignUpUrl="/create-marketplace"
              appearance={{
                elements: {
                  card: "shadow-none p-0 border-0",
                  formFieldInput: "bg-gray-100 rounded",
                  formButtonPrimary:
                    "bg-blue-600 hover:bg-blue-700 text-white border-0",
                },
              }}
            />
          )}
        </div>
      </div>
    );
  }

  // Else user is signed in -> show creation form
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/marketplaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (!res.ok) {
        const { error: serverError } = await res.json();
        throw new Error(serverError || "Failed to create marketplace");
      }

      const data = (await res.json()) as { slug: string };
      setSuccessSlug(data.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  function handleGoToMarketplace() {
    if (successSlug) {
      router.push(`/marketplace/${successSlug}`);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-50 min-h-screen">
      <div className="max-w-lg w-full p-6 bg-white rounded shadow">
        {successSlug ? (
          <div className="text-center space-y-4">
            <p className="text-green-600 text-lg">
              Marketplace created successfully! Slug:{" "}
              <strong>{successSlug}</strong>
            </p>
            <button
              onClick={handleGoToMarketplace}
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded"
            >
              View Marketplace
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4 text-center">
              Create Your Marketplace
            </h2>
            {error && (
              <div className="p-3 mb-4 text-red-600 border border-red-300 rounded">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Name</label>
                <input
                  className="w-full p-2 border border-gray-300 rounded"
                  type="text"
                  placeholder="e.g., Toronto Pottery Community"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Description</label>
                <textarea
                  className="w-full p-2 border border-gray-300 rounded"
                  rows={4}
                  placeholder="A place for local potters to share and sell..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded"
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Create Marketplace"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

```

## src/app/dashboard/page.tsx

```ts
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { CreateProductForm } from "@/components/CreateProductForm";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // 1) Get user from DB, including any marketplaces they own or are a member of
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      products: true,
      memberOf: true, // Marketplaces the user has joined
      marketplaces: true, // Marketplaces the user owns
    },
  });

  if (!user) {
    // Should not happen if they're logged in, but just in case
    return <div>User not found</div>;
  }

  // 2) A combined list of all marketplaces the user can post in (owner or member)
  const userMarketplaces = [...user.memberOf, ...user.marketplaces].filter(
    (m, i, self) => self.findIndex((x) => x.id === m.id) === i
  );

  // 3) The user's products
  const { products } = user;

  return (
    <div className="container py-10 space-y-8">
      <h1 className="text-3xl font-bold">My Dashboard</h1>

      {/* Create Product Form */}
      <div className="p-6 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Create a New Product</h2>
        <CreateProductForm marketplaces={userMarketplaces} />
      </div>

      {/* My Products */}
      <div>
        <h2 className="text-xl font-semibold mb-4">My Products</h2>
        {products.length === 0 ? (
          <p className="text-gray-600">You have no products yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="border rounded p-4 shadow-sm">
                <h3 className="font-medium">{product.name}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {product.description}
                </p>
                <p className="font-bold mt-2">
                  ${(product.price / 100).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

```

## src/app/layout.tsx

```ts
import { ClerkProvider } from "@clerk/nextjs";
import { NavBar } from "@/components/navbar";
import "./globals.css"; // or wherever your tailwind styles are

export const metadata = {
  title: "MetaMarket",
  description: "Multi-marketplace platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <ClerkProvider>
        <body className="min-h-screen flex flex-col">
          {/* Shared top nav for the entire site */}
          <NavBar />
          {/* Main content area */}
          <main className="flex-1">{children}</main>
        </body>
      </ClerkProvider>
    </html>
  );
}

```

## src/app/marketplace/[slug]/page.tsx

```ts
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import type { Marketplace, Product, User } from "@prisma/client";

type ProductWithSeller = Product & {
  seller: User;
};

type MarketplaceWithRelations = Marketplace & {
  products: ProductWithSeller[];
  owners: User[];
  members: User[];
};

export default async function MarketplacePage({
  params: { slug },
}: {
  params: { slug: string };
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const marketplace = await prisma.marketplace.findUnique({
    where: { slug },
    include: {
      products: {
        include: {
          seller: true,
        },
      },
      owners: true,
      members: true,
    },
  });

  if (!marketplace) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[var(--background)] to-[var(--muted)] py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="card text-center">
            <h1 className="text-2xl font-bold text-red-500">
              Marketplace not found
            </h1>
          </div>
        </div>
      </div>
    );
  }

  const typedMarketplace = marketplace as MarketplaceWithRelations;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--background)] to-[var(--muted)]">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="card mb-8">
          <h1 className="text-3xl font-bold mb-2">{typedMarketplace.name}</h1>
          <p className="text-[var(--muted-foreground)]">
            {typedMarketplace.description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {typedMarketplace.products.map((product) => (
            <div
              key={product.id}
              className="card hover:shadow-md transition-shadow"
            >
              {product.images[0] && (
                <div className="aspect-video mb-4 rounded-lg overflow-hidden">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <h3 className="font-semibold mb-2">{product.name}</h3>
              <p className="text-[var(--muted-foreground)] text-sm mb-4">
                {product.description}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-[var(--foreground)]">
                  ${(product.price / 100).toFixed(2)}
                </span>
                <span className="text-sm text-[var(--muted-foreground)]">
                  by {product.seller.id}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="card mt-8">
          <h2 className="text-xl font-semibold mb-4">Members</h2>
          <div className="flex flex-wrap gap-2">
            {typedMarketplace.members.map((member) => (
              <div
                key={member.id}
                className="bg-[var(--muted)] text-[var(--muted-foreground)] px-3 py-1 rounded-full text-sm"
              >
                {member.id}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

```

## src/app/marketplaces/page.tsx

```ts
import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function MarketplacesPage() {
  // 1. Fetch marketplaces from DB
  const marketplaces = await prisma.marketplace.findMany({
    orderBy: { createdAt: "desc" },
    // You can also take, skip if you want pagination
  });

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Browse Marketplaces</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {marketplaces.map((m) => (
          <div key={m.id} className="border rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-2">{m.name}</h2>
            <p className="text-gray-600 mb-4 line-clamp-3">{m.description}</p>
            <Link
              href={`/marketplace/${m.slug}`}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              View Marketplace
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

```

## src/app/page.tsx

```ts
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
        {/* Hero Section */}
        <div className="text-center mb-24">
          <h1 className="text-5xl sm:text-6xl font-bold mb-8 tracking-tight">
            Welcome to MetaMarket
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            Create and manage your own marketplace, or join existing ones. The
            platform where communities and commerce come together.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              href="/create-marketplace"
              className="btn-primary text-center text-lg"
            >
              Create a Marketplace
            </Link>
            <Link
              href="/marketplaces"
              className="btn-secondary text-center text-lg"
            >
              Browse Marketplaces
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-24">
          <div className="card hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-4 text-center">
              Quick Setup
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed text-center">
              Create your marketplace in minutes with our intuitive onboarding
              process
            </p>
          </div>

          <div className="card hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <svg
                className="w-8 h-8 text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-4 text-center">
              Community First
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed text-center">
              Build and grow your community with powerful management tools
            </p>
          </div>

          <div className="card hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <svg
                className="w-8 h-8 text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-4 text-center">
              Secure Payments
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed text-center">
              Integrated with Stripe for safe and reliable transactions
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="card bg-muted border-none">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 tracking-tight">
              Ready to start your marketplace journey?
            </h2>
            <p className="text-xl mb-10 text-muted-foreground leading-relaxed">
              Join thousands of creators and entrepreneurs who are building
              their dream marketplaces.
            </p>
            <Link
              href="/create-marketplace"
              className="btn-primary inline-block text-lg px-8 py-4"
            >
              Create Your Marketplace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

```

## src/app/sign-in/[[...sign-in]]/page.tsx

```ts
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn />
    </div>
  );
}

```

## src/app/sign-up/[[...sign-up]]/page.tsx

```ts
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignUp />
    </div>
  );
}

```

## src/components/CreateProductForm.tsx

```ts
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Marketplace {
  id: string;
  name: string;
  slug: string;
}

export const CreateProductForm = ({
  marketplaces,
}: {
  marketplaces: Marketplace[];
}) => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0"); // keep as string for input
  const [images, setImages] = useState<string[]>([]);
  const [selectedMarketplaceId, setSelectedMarketplaceId] = useState(
    marketplaces[0]?.id ?? ""
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          price: parseInt(price, 10),
          images,
          marketplaceId: selectedMarketplaceId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create product");
      }
      // Clear the form
      setName("");
      setDescription("");
      setPrice("0");
      setImages([]);
      // Possibly refresh the page to show the updated product list
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // For demonstration: a simple input to push one image URL onto `images`
  const [tempImage, setTempImage] = useState("");
  function handleAddImage() {
    if (tempImage) {
      setImages([...images, tempImage]);
      setTempImage("");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="text-red-600">{error}</div>}

      <div>
        <label className="block mb-1 font-medium">Marketplace</label>
        <select
          className="p-2 border rounded w-full"
          value={selectedMarketplaceId}
          onChange={(e) => setSelectedMarketplaceId(e.target.value)}
          required
        >
          {marketplaces.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block mb-1 font-medium">Name</label>
        <input
          className="p-2 border rounded w-full"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div>
        <label className="block mb-1 font-medium">Description</label>
        <textarea
          className="p-2 border rounded w-full"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
        />
      </div>

      <div>
        <label className="block mb-1 font-medium">Price (in cents)</label>
        <input
          className="p-2 border rounded w-full"
          type="number"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={loading}
        />
      </div>

      <div>
        <label className="block mb-1 font-medium">Image URL</label>
        <div className="flex gap-2">
          <input
            className="p-2 border rounded w-full"
            type="text"
            value={tempImage}
            onChange={(e) => setTempImage(e.target.value)}
            disabled={loading}
          />
          <button
            type="button"
            onClick={handleAddImage}
            className="px-4 py-2 bg-gray-200 rounded"
            disabled={loading}
          >
            Add
          </button>
        </div>
        {images.length > 0 && (
          <ul className="list-disc ml-5 mt-1">
            {images.map((img, idx) => (
              <li key={idx}>{img}</li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white rounded"
        disabled={loading}
      >
        {loading ? "Creating..." : "Create Product"}
      </button>
    </form>
  );
};

```

## src/components/navbar.tsx

```ts
"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export const NavBar = () => {
  return (
    <nav className="flex items-center justify-between w-full py-4 px-6 bg-gray-50 border-b border-gray-200">
      <div>
        <Link href="/">
          <h1 className="font-bold text-xl tracking-tight">MetaMarket</h1>
        </Link>
      </div>
      <div className="flex items-center space-x-4">
        {/* SignedOut = only show these when user is logged out */}
        <SignedOut>
          <SignInButton mode="modal">
            <button className="px-4 py-2 bg-blue-600 text-white rounded">
              Sign In
            </button>
          </SignInButton>
          {/* 
            If you also want a "Sign Up" button, use <SignUpButton> similarly.
            e.g.:

            <SignUpButton mode="modal">
              <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded">
                Sign Up
              </button>
            </SignUpButton>
          */}
        </SignedOut>

        {/* SignedIn = only show these when user is logged in */}
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </nav>
  );
};

```

## src/lib/prisma.ts

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

```

## src/lib/stripe.ts

```ts
import Stripe from "stripe";
import prisma from "./prisma";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

export async function createConnectAccount(userId: string, email: string) {
  const account = await stripe.accounts.create({
    type: "express",
    country: "CA",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeAccountId: account.id },
  });

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.NEXT_PUBLIC_URL}/onboarding/refresh`,
    return_url: `${process.env.NEXT_PUBLIC_URL}/onboarding/complete`,
    type: "account_onboarding",
  });

  return accountLink.url;
}

```

## src/lib/supabaseAdmin.ts

```ts
// lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  throw new Error("Missing Supabase environment variables");
}

// This is for server-side usage only.
// DO NOT expose the service role key to the client.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

```

## src/lib/utils.ts

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```

## src/middleware.ts

```ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

```
