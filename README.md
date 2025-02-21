# MetaMarketplace

A platform for creating and managing artisan marketplaces, built with Next.js 14, Prisma, and Stripe Connect.

## Core Features

- **Authentication**: Clerk-based authentication system for user management.
- **Marketplace Management**: Create and manage marketplaces with owner/member roles. Marketplaces can be created, edited, and managed by authorized users. Owners can manage members and products.
- **Product Management**: List and manage products within marketplaces. Artisans can add, update, and delete products within their marketplaces.
- **Payments**: Stripe Connect integration for marketplace payments. Stripe Connect Standard accounts are used to handle payments between buyers and sellers.
- **Purchase Requests**: Allow artisans to sell request-based items, with approval workflow. Artisans can approve or reject purchase requests, enabling a more customized sales process.

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
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum UserRole {
  CUSTOMER
  ARTISAN
  HOST
}

model User {
  id                    String            @id
  slug                  String?           @unique
  stripeAccountId       String?
  role                  UserRole          @default(CUSTOMER)
  city                  String? // For location-based filtering
  marketplaces          Marketplace[]     @relation("MarketplaceOwners")
  memberOf              Marketplace[]     @relation("MarketplaceMembers")
  products              Product[]
  purchaseRequests      PurchaseRequest[] @relation("BuyerRequests")
  receivedRequests      PurchaseRequest[] @relation("SellerRequests")
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt
}

model Marketplace {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String?
  city        String? // If you want location-based searches on the marketplace
  type        String? // e.g., "Pottery", "Jewelry", etc. for future
  owners      User[]   @relation("MarketplaceOwners")
  members     User[]   @relation("MarketplaceMembers")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  prices Price[]
}

enum PaymentStyle {
  INSTANT // Immediate purchase
  REQUEST // Requires merchant approval
}

model Product {
  id              String   @id @default(cuid())
  name            String
  description     String
  images          Json     @default("[]")
  stripeProductId String? // Stripe product identifier
  totalQuantity   Int      @default(0)
  seller          User     @relation(fields: [sellerId], references: [id])
  sellerId        String
  prices          Price[]
  requests        PurchaseRequest[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([sellerId])
}

model Price {
  id                String       @id @default(cuid())
  stripePriceId     String
  unitAmount        Int
  currency          String
  isDefault         Boolean      @default(false)
  paymentStyle      PaymentStyle @default(INSTANT)
  allocatedQuantity Int          @default(0)
  marketplace   Marketplace? @relation(fields: [marketplaceId], references: [id])
  marketplaceId String?
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  productId String
  requests PurchaseRequest[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([marketplaceId])
  @@index([productId])
}

enum PurchaseRequestStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

model PurchaseRequest {
  id        String                @id @default(cuid())
  buyer     User                  @relation("BuyerRequests", fields: [buyerId], references: [id])
  buyerId   String
  seller    User                  @relation("SellerRequests", fields: [sellerId], references: [id])
  sellerId  String
  product   Product               @relation(fields: [productId], references: [id])
  productId String
  price     Price                 @relation(fields: [priceId], references: [id])
  priceId   String
  status    PurchaseRequestStatus @default(PENDING)
  createdAt DateTime              @default(now())
  updatedAt DateTime              @updatedAt

  @@index([buyerId])
  @@index([sellerId])
  @@index([productId])
  @@index([priceId])
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
- `/dashboard/purchase-requests`: Purchase requests management
- `/dashboard/stripe`: Stripe insights
- `/create-marketplace`: Marketplace creation

### Important Components

#### StripeAccountCard

- Handles Stripe account connection/disconnection
- Shows account insights (revenue, transactions, etc.)
- Located in `src/components/StripeAccountCard.tsx`

#### MiniPurchaseRequestCard

- Displays a summary of recent purchase requests on the dashboard.
- Located in `src/components/MiniPurchaseRequestCard.tsx`

### API Routes

#### Stripe Related

- `/api/stripe/connect`: Initiates Stripe Connect onboarding
- `/api/stripe/disconnect`: Disconnects Stripe account
- `/api/stripe/insights-summary`: Fetches account insights

#### Marketplace Related

- `/api/marketplaces`: CRUD operations for marketplaces
- `/api/products`: Product management
- `/api/purchase-requests`: Handles creation of purchase requests
- `/api/purchase-requests/[id]/approve`: Route for approving purchase requests
- `/api/purchase-requests/[id]/reject`: Route for rejecting purchase requests

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
- Purchase request flow implemented with approval workflow

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

## Purchase Request Flow Architecture

The purchase request flow allows artisans to sell request-based items. Here's a breakdown of the architecture:

1.  **Product Creation**: Artisans create products and mark them as request-based.
2.  **Cart Management**: When a user adds a request-based product to the cart, a purchase request is created instead of a direct purchase.
3.  **API Endpoint**: The `/api/purchase-requests` endpoint handles the creation of purchase requests, linking the buyer, seller, product, and price.
4.  **Dashboard**: Artisans can view pending purchase requests on their dashboard.
5.  **Approval/Rejection**: Artisans can approve or reject purchase requests via the `/api/purchase-requests/[id]/approve` and `/api/purchase-requests/[id]/reject` endpoints.
6.  **Notifications**: (TODO) Implement notifications to inform buyers about the status of their requests.

## Insights and Tips

*   **Data Modeling**: Ensure clear relationships between users, products, and purchase requests in your database schema.
*   **API Design**: Implement RESTful API endpoints for managing purchase requests, including creation, approval, and rejection.
*   **Role-Based Access Control**: Enforce role-based access control to restrict access to sensitive data and functionality.
*   **Real-Time Updates**: Consider using WebSockets or server-sent events for real-time updates on purchase request statuses.

## Potential Pitfalls

*   **Type Errors**: Ensure type safety when working with Prisma and Next.js API routes. Use type assertions and validation to prevent runtime errors.
*   **Route Parameters**: In Next.js 14, dynamic route parameters are provided as Promises. Make sure to await the parameters before accessing them.
*   **API Endpoint URLs**: When you have a [route.ts](cci:7://file:///Users/leahwilliams/WebstormProjects/meta-marketplace/src/app/api/marketplaces/%5BmarketplaceId%5D/membership/route.ts:0:0-0:0) file inside a folder, the actual endpoint needs to include the trailing slash.

## Image Optimization

*   Use Next.js's `Image` component for automatic image optimization, lazy loading, and responsive sizing.
*   Wrap the `Image` component in a relative container with fixed dimensions to prevent layout shift.

## Data Flow

1.  **User Interaction**: Users interact with the UI, triggering events such as creating a marketplace, adding a product, or submitting a purchase request.
2.  **API Call**: The UI sends API requests to the server-side routes.
3.  **Authentication**: The server verifies the user's identity and permissions using Clerk.
4.  **Data Processing**: The server processes the request, interacting with the database using Prisma.
5.  **Database Update**: Prisma updates the database with the new or modified data.
6.  **Response**: The server sends a response back to the client, indicating success or failure.

## Security Considerations

*   **Authentication**: Ensure that all API endpoints are protected with authentication to prevent unauthorized access.
*   **Authorization**: Implement role-based access control to restrict access to sensitive data and functionality.
*   **Data Validation**: Validate all user inputs to prevent injection attacks and data corruption.
*   **Rate Limiting**: Implement rate limiting to prevent abuse and denial-of-service attacks.
