# Guide: Building MetaMarket PoC with Next.js and Clerk

## Overview

We will create a basic proof of concept for a marketplace-of-marketplaces platform using Clerk for authentication and user management. This PoC will demonstrate:

1. User authentication with Clerk
2. Marketplace creation
3. Stripe Connect integration
4. Basic product management

## Prerequisites

- Next.js app created with create-next-app
- Clerk account and project set up
- Stripe account with Connect enabled
- Environment variables set up:
  ```
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_clerk...
  CLERK_SECRET_KEY=sk_clerk...
  NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
  NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_PUBLISHABLE_KEY=pk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  DATABASE_URL=...
  ```

## Step 1: Initial Setup

1. Install dependencies:

```bash
npm install @clerk/nextjs @prisma/client stripe
npm install -D prisma
```

2. Initialize Prisma:

```bash
npx prisma init
```

3. Create database schema at `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String        @id
  stripeAccountId String?
  marketplaces  Marketplace[] @relation("MarketplaceOwners")
  memberOf      Marketplace[] @relation("MarketplaceMembers")
  products      Product[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model Marketplace {
  id          String    @id @default(cuid())
  name        String
  slug        String    @unique
  description String?
  owners      User[]    @relation("MarketplaceOwners")
  members     User[]    @relation("MarketplaceMembers")
  products    Product[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Product {
  id            String      @id @default(cuid())
  name          String
  description   String
  price         Int
  images        String[]
  marketplace   Marketplace @relation(fields: [marketplaceId], references: [id])
  marketplaceId String
  seller        User        @relation(fields: [sellerId], references: [id])
  sellerId      String
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}
```

## Step 2: Clerk Setup

1. Create middleware file at `middleware.ts`:

```typescript
import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: ["/", "/api/webhooks/clerk", "/api/webhooks/stripe"],
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

2. Update `app/layout.tsx`:

```typescript
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <ClerkProvider>
        <body className={inter.className}>{children}</body>
      </ClerkProvider>
    </html>
  );
}
```

## Step 3: Database Synchronization

1. Create Clerk webhook handler at `app/api/webhooks/clerk/route.ts`:

```typescript
import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { Webhook } from "svix";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env"
    );
  }

  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    return new Response("Error occurred", {
      status: 400,
    });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  if (eventType === "user.created") {
    await prisma.user.create({
      data: {
        id: id,
      },
    });
  }

  if (eventType === "user.deleted") {
    await prisma.user.delete({
      where: { id },
    });
  }

  return new Response("", { status: 200 });
}
```

## Step 4: Stripe Integration

1. Create Stripe utility file at `lib/stripe.ts`:

```typescript
import Stripe from "stripe";
import prisma from "./prisma";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
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

2. Create Stripe Connect endpoint at `app/api/stripe/connect/route.ts`:

```typescript
import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { createConnectAccount } from "@/lib/stripe";

export async function POST() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = await createConnectAccount(userId, "user@example.com"); // Get email from Clerk
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create Stripe account" },
      { status: 500 }
    );
  }
}
```

## Step 5: Marketplace Creation

1. Create marketplace API at `app/api/marketplaces/route.ts`:

```typescript
import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description } = await req.json();
  const slug = name.toLowerCase().replace(/\s+/g, "-");

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
  });

  return NextResponse.json(marketplace);
}

export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const marketplaces = await prisma.marketplace.findMany({
    include: {
      owners: true,
      _count: {
        select: {
          products: true,
          members: true,
        },
      },
    },
  });

  return NextResponse.json(marketplaces);
}
```

## Step 6: Frontend Components

1. Create user profile component at `components/UserProfile.tsx`:

```typescript
"use client";

import { UserProfile } from "@clerk/nextjs";

export default function UserProfilePage() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <UserProfile />
    </div>
  );
}
```

2. Create marketplace creation page at `app/create-marketplace/page.tsx`:

```typescript
"use client";

import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateMarketplace() {
  const { userId } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const response = await fetch("/api/marketplaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });

    if (response.ok) {
      const marketplace = await response.json();
      router.push(`/marketplace/${marketplace.slug}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Create Marketplace</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-md p-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded-md p-2"
            rows={4}
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
        >
          Create Marketplace
        </button>
      </div>
    </form>
  );
}
```

## Step 7: Protected Routes

1. Create protected marketplace page at `app/marketplace/[slug]/page.tsx`:

```typescript
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function MarketplacePage({
  params: { slug },
}: {
  params: { slug: string };
}) {
  const { userId } = auth();
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
    return <div>Marketplace not found</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">{marketplace.name}</h1>
      <p className="text-gray-600 mb-8">{marketplace.description}</p>

      {/* Add product grid and member list components */}
    </div>
  );
}
```

## Step 8: Sign In/Sign Up Pages

1. Create sign-in page at `app/sign-in/[[...sign-in]]/page.tsx`:

```typescript
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn />
    </div>
  );
}
```

2. Create sign-up page at `app/sign-up/[[...sign-up]]/page.tsx`:

```typescript
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignUp />
    </div>
  );
}
```

## Testing the PoC

1. Set up Clerk webhooks:

   - Go to Clerk Dashboard > Webhooks
   - Add endpoint: `your-domain/api/webhooks/clerk`
   - Select events: `user.created`, `user.deleted`

2. Start the application:

```bash
npm run dev
```

3. Test the flow:
   - Sign up new user
   - Complete Stripe Connect onboarding
   - Create marketplace
   - Add products
   - View marketplace

## Next Steps

Consider adding:

1. Product search and filtering
2. Marketplace customization
3. Member management
4. Shopping cart
5. Order processing
6. Analytics dashboard

Remember to:

- Add proper error handling
- Implement loading states
- Add form validation
- Set up proper webhook handling for both Clerk and Stripe events
- Implement proper security measures and rate limiting
