# MetaMarketplace

A platform for creating and managing artisan marketplaces, built with Next.js 14, Prisma, and Stripe Connect.

## Core Features

- **Authentication**: Clerk-based authentication system
- **Marketplace Management**: Create and manage marketplaces with owner/member roles
- **Product Management**: List and manage products within marketplaces
- **Payments**: Stripe Connect integration for marketplace payments

## Technical Stack

- **Framework**: Next.js 14 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk
- **Payments**: Stripe Connect (Standard accounts)
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React hooks with Server Components
- **Image Handling**: Next.js Image component with optimization

## Key Components

### Database Schema (Prisma)

```prisma
model User {
  id              String        @id
  stripeAccountId String?
  role            UserRole     @default(CUSTOMER)
  city            String?
  marketplaces    Marketplace[] @relation("MarketplaceOwners")
  memberOf        Marketplace[] @relation("MarketplaceMembers")
  products        Product[]
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model Marketplace {
  id          String     @id @default(cuid())
  name        String
  slug        String     @unique
  description String?
  city        String?
  type        String?
  owners      User[]     @relation("MarketplaceOwners")
  members     User[]     @relation("MarketplaceMembers")
  products    Product[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model Product {
  id            String      @id @default(cuid())
  name          String
  description   String
  price         Int
  images        Json
  marketplace   Marketplace @relation(fields: [marketplaceId], references: [id])
  marketplaceId String
  seller        User        @relation(fields: [sellerId], references: [id])
  sellerId      String
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}
```

### Stripe Integration

- Uses Standard Connect accounts for marketplace owners
- Implemented in `/api/stripe/connect` and `/api/stripe/disconnect` routes
- Dashboard insights available at `/dashboard/stripe`
- Stripe account management through `StripeAccountCard` component

### Key Routes

- `/`: Home page
- `/marketplaces`: Browse all marketplaces
- `/marketplace/[slug]`: Individual marketplace view
- `/dashboard`: User dashboard
- `/dashboard/stripe`: Stripe insights
- `/create-marketplace`: Marketplace creation

### Important Components

#### StripeAccountCard

- Handles Stripe account connection/disconnection
- Shows account insights (revenue, transactions, etc.)
- Located in `src/components/StripeAccountCard.tsx`

#### Marketplace Page

- Displays marketplace details, products, and team members
- Handles role-based access (owner/member/visitor)
- Located in `src/app/marketplace/[slug]/page.tsx`

### API Routes

#### Stripe Related

- `/api/stripe/connect`: Initiates Stripe Connect onboarding
- `/api/stripe/disconnect`: Disconnects Stripe account
- `/api/stripe/insights-summary`: Fetches account insights

#### Marketplace Related

- `/api/marketplaces`: CRUD operations for marketplaces
- `/api/products`: Product management

## Environment Variables

Required environment variables:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgres://..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
STRIPE_SECRET_KEY="sk_..."
```

## Current State

- Basic marketplace creation and management implemented
- Stripe Connect integration working with insights
- User roles and permissions established
- Product management basics implemented
- Responsive UI with shadcn/ui components

## TODO/Next Steps

- Implement product purchase flow
- Add marketplace search/filtering
- Enhance user profiles
- Add marketplace analytics
- Implement notifications system

## Development Notes

- Using functional patterns throughout
- Server Components where possible
- Client Components for interactive features
- Stripe Connect Standard for maximum flexibility
- Role-based access control implemented at route level

## Style Guide

- Using a consistent color scheme:
  - Primary: #453E3E
  - Secondary: #666666
  - Accent: #F97316
  - Background: #faf9f7
- Consistent border radius and shadows
- Mobile-first responsive design
- shadcn/ui components for consistency

## Development & Deployment

This project uses pnpm for managing dependencies and running scripts. Use the following commands:

- Install dependencies: pnpm install
- Start the development server: pnpm dev
- Build for production: pnpm build
- Start the production server: pnpm start

## Testing & Linting

Ensure code quality by running tests and linting. You can use the following commands (assuming these scripts are configured):

- Run tests: pnpm test
- Run linter: pnpm lint

## Contributing

Contributions are welcome! Please follow these guidelines:

- Use functional code patterns throughout the codebase
- Adhere to the established coding style and design principles
- Ensure new code passes linting and testing before submitting a pull request
- Use feature branches for new features or bug fixes
- Provide clear commit messages and documentation for any significant changes

## Troubleshooting & FAQ

- If you encounter issues with Stripe onboarding or API calls, double-check your environment variables for correct configuration.
- For problems with Clerk authentication, verify your Clerk configuration and webhook settings.
- Ensure your database (PostgreSQL) connection details in the .env file are correct.
- Refer to the official documentation for Next.js, Prisma, Stripe, and Clerk for further guidance.

## Folder Structure

Here's an overview of the main directories and files in the project:

- **/src**
  - **/app**: Contains Next.js pages and API routes.
    - **/dashboard**: User dashboard pages, including Stripe insights.
    - **/marketplace**: Pages for individual marketplace views.
    - **/api**: API endpoints for Stripe, marketplaces, products, etc.
  - **/components**: Reusable UI components such as the `StripeAccountCard`, `NavBar`, and other shared components.
  - **/lib**: Shared libraries and utilities, e.g., `prisma.ts` for database access, `stripe.ts` for Stripe integration.
- **/prisma**: Contains the Prisma schema and migration files (e.g., `schema.prisma`).
- **.env**: Environment variable definitions (not in version control).
- **README.md**: Project documentation and reference.

This structure supports a modular and scalable development approach.

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Clerk Documentation](https://clerk.dev/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

## License

This project is licensed under the MIT License.

## Vision & Goals

MetaMarketplace is designed to be much more than a simple ecommerce platform. Our vision is to empower artisans, creators, and local communities by providing a robust, community-driven marketplace that emphasizes user control and professional independence. Key objectives include:

- **Community-Driven Features:**

  - Facilitate interactive message boards and discussions organized by tags (e.g., "Toronto", "Pottery") to foster local and thematic communities.
  - Enable intersections of tags, allowing users to connect over specific, niche interests.

- **Empowering Merchants:**

  - Allow merchants to create their own standardized merchant pages, effectively giving them the tools to operate as independent marketplaces.
  - Integrate advanced CMS-level controls using systems like Strapi or Sanity, enabling merchants to manage content (e.g., blogs, product layouts) and customize their online presence.
  - Provide support for advanced marketing strategies, including integrations with social media bots to promote their products and reach a wider audience.

- **Long-Term Integration & Expansion:**
  - Eventually merge MetaMarketplace with a larger ecosystem focused on translation and transformation of JSON data, enhancing support for merchants.
  - Draw inspiration from platforms like Etsy, Amazon, and Facebook Marketplace while remaining committed to providing users with maximum control and minimal interference.
  - Support local community efforts by connecting store owners with artisans, streamlining the process of sourcing, collaboration, and localized marketing.
