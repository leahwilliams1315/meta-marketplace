# Tagging System Implementation Guide for MetaMarketplace

This document provides an in-depth, step-by-step guide to implementing a robust tagging system for MetaMarketplace using Next.js 14, Prisma, Supabase (PostgreSQL), and the pgvector extension. It covers the following goals:

- **Flat, Free-Form Tag Structure:** A single, shared tag system used for products, marketplaces, and posts.
- **Tag Creation Limits and Deduplication:** Enforce monthly tag creation quotas for paying users and deduplicate similar tags using vector similarity.
- **Faceted Search:** Enable inclusive/exclusive searches via SQL queries.
- **Tag Metadata and Moderation:** Store additional metadata (status, usage count, etc.) for each tag.
- **UI/UX Integration:** Build a pill-style tag input component with autocomplete.
- **Maximum 5 Tags per Item:** Enforce a rule that each item can have a maximum of 5 tags.

> **Important:** Some operations (e.g., enabling extensions, creating certain indexes, and executing vector queries) must be performed directly on your Supabase/PostgreSQL instance using SQL.

---

## Table of Contents

1. [Prerequisites and Setup](#prerequisites-and-setup)
2. [Step 1: Enabling the pgvector Extension](#step-1-enabling-the-pgvector-extension)
3. [Step 2: Defining the Prisma Schema](#step-2-defining-the-prisma-schema)
4. [Step 3: Indexing and SQL Configurations](#step-3-indexing-and-sql-configurations)
5. [Step 4: Business Logic & Enforcement](#step-4-business-logic--enforcement)
   - [4.1 Tag Creation Limits](#41-tag-creation-limits)
   - [4.2 Enforcing a Maximum of 5 Tags per Item](#42-enforcing-a-maximum-of-5-tags-per-item)
   - [4.3 Tag Deduplication with Vector Similarity](#43-tag-deduplication-with-vector-similarity)
6. [Step 5: SQL Examples for Faceted Search](#step-5-sql-examples-for-faceted-search)
7. [Step 6: Real-Time Tag Similarity and Recommendations](#step-6-real-time-tag-similarity-and-recommendations)
8. [Step 7: UI/UX Integration](#step-7-uiux-integration)
9. [Manual Tasks and Additional Considerations](#manual-tasks-and-additional-considerations)
10. [Conclusion](#conclusion)

---

## Prerequisites and Setup

- **Framework & Libraries:** Next.js 14, Prisma, Supabase, Tailwind CSS, and shadcn/ui.
- **Database:** PostgreSQL hosted on Supabase.
- **Extensions:** [pgvector](https://github.com/pgvector/pgvector) for vector-based similarity search.
- **LLM/API:** Integration with an embedding generator (e.g., OpenAI’s `text-embedding-ada-002`) for computing tag embeddings.

Ensure your environment variables are set (e.g., `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, etc.) in your `.env` file.

---

## Step 1: Enabling the pgvector Extension

Before anything else, you must enable the pgvector extension on your Supabase/PostgreSQL instance.

**SQL Command (execute via Supabase SQL Editor):**

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

> **Manual Task:** Log in to your Supabase dashboard, open the SQL editor, and run the above command.

---

## Step 2: Defining the Prisma Schema

Update your `schema.prisma` file to include the Tag model, join tables for many-to-many relationships, and an example Product model.

```prisma
datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector")]
}

generator client {
  provider = "prisma-client-js"
}

// Tag model - central to the tagging system.
model Tag {
  id          Int      @id @default(autoincrement())
  name        String   @unique                   // Ensures no duplicate tag names.
  // Using Unsupported for vector type until Prisma adds native support.
  embedding   Unsupported("vector(1536)")?      
  createdBy   Int?     // User ID that created the tag.
  createdAt   DateTime @default(now())
  status      String   @default("active")          // Possible values: "active", "pending", "banned"
  usageCount  Int      @default(0)                 // Counter for how often this tag is used.

  // Relations to join tables.
  productTags       ProductTag[]
  marketplaceTags   MarketplaceTag[]
  postTags          PostTag[]
}

// Join table for Product - Tag relationship.
model ProductTag {
  productId   Int
  tagId       Int
  assignedAt  DateTime @default(now())

  product     Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  tag         Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([productId, tagId])
}

// Join table for Marketplace - Tag.
model MarketplaceTag {
  marketplaceId Int
  tagId         Int
  assignedAt    DateTime @default(now())

  marketplace   Marketplace @relation(fields: [marketplaceId], references: [id], onDelete: Cascade)
  tag           Tag         @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([marketplaceId, tagId])
}

// Join table for Post - Tag.
model PostTag {
  postId     Int
  tagId      Int
  assignedAt DateTime @default(now())

  post       Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag        Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])
}

// Example Product model.
model Product {
  id    Int    @id @default(autoincrement())
  name  String
  // Additional fields for the product...
  tags  Tag[]  @relation(name: "ProductTags", through: ProductTag)
}

// (Define your Marketplace and Post models similarly)
```

> **Note:**  
> - The `embedding` field uses `Unsupported("vector(1536)")` because Prisma does not yet support vector types natively.  
> - Ensure you add similar relations for your Marketplace and Post models.

---

## Step 3: Indexing and SQL Configurations

After deploying the Prisma schema, you need to manually create several indexes on your Supabase/PostgreSQL instance.

### 3.1. Composite Indexes for Join Tables

These indexes improve performance when joining or filtering by tags.

```sql
-- Create composite indexes on the ProductTag join table.
CREATE INDEX idx_product_tag ON "ProductTag"("productId", "tagId");
CREATE INDEX idx_tag_product ON "ProductTag"("tagId", "productId");

-- Similarly, create indexes for MarketplaceTag and PostTag:
CREATE INDEX idx_marketplace_tag ON "MarketplaceTag"("marketplaceId", "tagId");
CREATE INDEX idx_tag_marketplace ON "MarketplaceTag"("tagId", "marketplaceId");

CREATE INDEX idx_post_tag ON "PostTag"("postId", "tagId");
CREATE INDEX idx_tag_post ON "PostTag"("tagId", "postId");
```

### 3.2. Vector Index on Tag Embedding

For fast vector similarity searches, create an IVFFlat index:

```sql
CREATE INDEX tag_embedding_index 
  ON "Tag" USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);
```

> **Manual Task:** Execute these SQL commands using Supabase’s SQL editor.  
> **Tip:** If you later decide to use an array field for denormalized tag storage, create a GIN index on that field (see below).

### 3.3. (Optional) Array Index for Denormalized Tag Data

If you choose to maintain an array column for fast filtering:

```sql
-- Suppose you add a computed column "tags_array" (of type integer[]) to your Product table.
CREATE INDEX idx_product_tags_array ON "Product" USING GIN (tags_array);
```

> **Note:** This approach is optional and used only if you want to leverage fast array containment queries.

---

## Step 4: Business Logic & Enforcement

### 4.1. Tag Creation Limits

Paying users have a quota on how many new tags they can create per month.

#### Application-Level Check (TypeScript Example):

```typescript
import { prisma } from '@/lib/prisma';
import { subDays } from 'date-fns';

/**
 * Checks if a user can create a new tag based on a monthly limit.
 * @param userId - The ID of the user.
 * @param monthlyLimit - The allowed number of new tags per month.
 */
async function canUserCreateTag(userId: number, monthlyLimit: number): Promise<boolean> {
  const thirtyDaysAgo = subDays(new Date(), 30);
  const tagCount = await prisma.tag.count({
    where: {
      createdBy: userId,
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
  });
  return tagCount < monthlyLimit;
}
```

> **Manual Task:** Ensure your API endpoint calls this function before creating a new tag.

---

### 4.2. Enforcing a Maximum of 5 Tags per Item

Before assigning a tag to a product (or marketplace/post), enforce a 5-tag limit.

#### Application-Level Check (TypeScript Example):

```typescript
async function addTagToProduct(productId: number, tagId: number): Promise<void> {
  // Retrieve current tags for the product.
  const currentTags = await prisma.productTag.findMany({
    where: { productId },
  });

  if (currentTags.length >= 5) {
    throw new Error('A product can have a maximum of 5 tags.');
  }

  // Create the new ProductTag record.
  await prisma.productTag.create({
    data: { productId, tagId },
  });
}
```

> **Alternative:**  
> You could also implement a PostgreSQL trigger to enforce this rule at the database level. However, this is more complex and is not directly supported by Prisma.

---

### 4.3. Tag Deduplication with Vector Similarity

When a new tag is submitted, generate its vector embedding and check for duplicates using a similarity query.

#### Step 1: Generate an Embedding  
Use your preferred LLM (e.g., OpenAI) to generate a 1536-dimension embedding for the new tag.

#### Step 2: Query Similar Tags

**SQL Query Example:**

```sql
-- Assume :new_embedding is the vector for the new tag.
SELECT id, name, embedding <-> :new_embedding AS distance
FROM "Tag"
ORDER BY embedding <-> :new_embedding
LIMIT 5;
```

> **Explanation:**  
> - The `<->` operator computes the distance (e.g., cosine) between the stored embedding and the new tag's embedding.  
> - If any returned tag has a distance below a threshold (e.g., 0.1 or another value based on experimentation), prompt the user to consider reusing the existing tag.

#### Application-Level Pseudocode Example:

```typescript
async function findSimilarTags(newEmbedding: number[]): Promise<Array<{ id: number; name: string; distance: number }>> {
  // Use prisma.$queryRaw to run a raw SQL query.
  const similarTags = await prisma.$queryRaw`
    SELECT id, name, embedding <-> ${newEmbedding} AS distance
    FROM "Tag"
    ORDER BY embedding <-> ${newEmbedding}
    LIMIT 5;
  `;
  return similarTags;
}

// Then, in your tag creation flow:
const similarTags = await findSimilarTags(newTagEmbedding);
if (similarTags.some(tag => tag.distance < 0.1)) {
  // Inform the user and suggest using an existing tag.
  console.warn("A similar tag already exists. Please consider using the existing tag:", similarTags);
}
```

> **Manual Task:**  
> Integrate with your LLM API to compute embeddings and adjust the similarity threshold based on your empirical data.

---

## Step 5: SQL Examples for Faceted Search

Faceted search lets you include or exclude items based on tag combinations. Below are thorough examples.

### 5.1. Inclusive Search: Items Must Have All Specified Tags

**Example:** Find products that have **both** tag IDs 15 and 25.

```sql
SELECT p.*
FROM "Product" p
WHERE EXISTS (
  SELECT 1 FROM "ProductTag" pt 
  WHERE pt."productId" = p.id AND pt."tagId" = 15
)
AND EXISTS (
  SELECT 1 FROM "ProductTag" pt 
  WHERE pt."productId" = p.id AND pt."tagId" = 25
);
```

> **Explanation:**  
> - Two subqueries ensure that the product has tag 15 **and** tag 25.

### 5.2. Exclusive Search: Exclude Items with Specific Tags

**Example:** Find products that do **not** have tag IDs 50 or 99.

```sql
SELECT p.*
FROM "Product" p
WHERE NOT EXISTS (
  SELECT 1 FROM "ProductTag" pt 
  WHERE pt."productId" = p.id AND pt."tagId" IN (50, 99)
);
```

> **Explanation:**  
> - The `NOT EXISTS` subquery filters out any products with either tag 50 or 99.

### 5.3. Combined Inclusive and Exclusive Search

**Example:** Find products that have tags 15 and 25 but exclude those with tags 50 or 99.

```sql
SELECT p.*
FROM "Product" p
WHERE EXISTS (
  SELECT 1 FROM "ProductTag" pt 
  WHERE pt."productId" = p.id AND pt."tagId" = 15
)
AND EXISTS (
  SELECT 1 FROM "ProductTag" pt 
  WHERE pt."productId" = p.id AND pt."tagId" = 25
)
AND NOT EXISTS (
  SELECT 1 FROM "ProductTag" pt 
  WHERE pt."productId" = p.id AND pt."tagId" IN (50, 99)
);
```

> **Tip:**  
> For performance, ensure you have created the composite indexes as described in Step 3.

---

## Step 6: Real-Time Tag Similarity and Recommendations

Leverage tag embeddings for recommendation and related tag suggestions.

### 6.1. Finding Similar Tags

**SQL Example:**  
Suppose you want to find tags similar to the tag "AI". First, retrieve its embedding, then run:

```sql
-- Assume the embedding for "AI" has been retrieved and is stored in :ai_embedding.
SELECT id, name, embedding <-> :ai_embedding AS distance
FROM "Tag"
ORDER BY embedding <-> :ai_embedding
LIMIT 5;
```

> **Usage:**  
> - Use these similar tags to offer tag suggestions in your UI or to merge duplicate tags.

### 6.2. Recommendations Based on Tag Overlap

#### Direct Overlap Query:
Find products that share at least one tag with a given product.

```sql
SELECT DISTINCT p2.*
FROM "ProductTag" pt1
JOIN "ProductTag" pt2 ON pt1."tagId" = pt2."tagId"
JOIN "Product" p2 ON pt2."productId" = p2.id
WHERE pt1."productId" = :currentProductId
  AND p2.id != :currentProductId;
```

> **Explanation:**  
> - This query retrieves all products that share at least one common tag with the current product, excluding the current product itself.

#### Semantic Similarity Recommendation (Advanced):

1. **Compute Item Embedding:**  
   Compute the average of all tag embeddings for a product (this must be done in your application or via a trigger).

2. **Compare Using Vector Search:**  
   Store this computed vector in your `Product` table and run a query similar to:

```sql
-- Assume :current_product_vector is the computed average vector.
SELECT p.*, p.embedding <-> :current_product_vector AS similarity
FROM "Product" p
ORDER BY p.embedding <-> :current_product_vector
LIMIT 5;
```

> **Manual Task:**  
> - Write custom logic to compute and update the average embedding for each product.
> - Use a trigger or scheduled job if real-time updates are required.

---

## Step 7: UI/UX Integration

### 7.1. Pill-Style Tag Input Component

Implement a tag input component in your Next.js app that:
- Displays existing tags as selectable pills.
- Autocompletes tag suggestions as the user types.
- Enforces the maximum of 5 tags per item.
- Offers a separate “create new tag” flow if the tag does not exist.

**Example (React with TypeScript):**

```tsx
import { useState, useEffect } from 'react';

interface Tag {
  id: number;
  name: string;
}

interface TagInputProps {
  existingTags: Tag[];
  onChange: (tags: Tag[]) => void;
  maxTags?: number;
}

export default function TagInput({ existingTags, onChange, maxTags = 5 }: TagInputProps) {
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);

  useEffect(() => {
    // Fetch tag suggestions from your API endpoint using inputValue.
    async function fetchSuggestions() {
      const res = await fetch(`/api/tags?suggest=${inputValue}`);
      const data = await res.json();
      setSuggestions(data);
    }
    if (inputValue.length > 1) fetchSuggestions();
  }, [inputValue]);

  const addTag = (tag: Tag) => {
    if (selectedTags.length >= maxTags) {
      alert(`You can only add up to ${maxTags} tags.`);
      return;
    }
    setSelectedTags([...selectedTags, tag]);
    onChange([...selectedTags, tag]);
    setInputValue('');
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {selectedTags.map((tag) => (
          <span key={tag.id} className="px-3 py-1 bg-gray-200 rounded-full">
            {tag.name}
          </span>
        ))}
      </div>
      <input
        type="text"
        placeholder="Type to search tags..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="mt-2 border p-2 rounded"
      />
      {suggestions.length > 0 && (
        <ul className="border mt-1">
          {suggestions.map((tag) => (
            <li key={tag.id} onClick={() => addTag(tag)} className="p-2 hover:bg-gray-100 cursor-pointer">
              {tag.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

> **Manual Task:**  
> - Create API endpoints to handle tag suggestion queries (using trigram indexing or full-text search on `Tag.name`).
> - Implement the “create new tag” modal that calls the tag creation API and triggers the deduplication flow (see Step 4.3).

---

## Manual Tasks and Additional Considerations

1. **Enabling pgvector:**  
   Execute the SQL command to enable pgvector via Supabase.

2. **Index Creation:**  
   Manually create indexes for composite keys and vector searches using Supabase’s SQL editor.

3. **Database Triggers (Optional):**  
   Consider writing PostgreSQL triggers if you want to enforce the 5-tag limit at the database level. This can be more robust but adds complexity.

4. **LLM Integration for Embeddings:**  
   Integrate your chosen LLM to generate tag embeddings. This must be done in your server-side code (outside Prisma) and then stored using raw SQL if necessary.

5. **Moderation Workflow:**  
   Build an admin interface to review new tags (status "pending") and merge similar tags based on deduplication results.

6. **Testing:**  
   Thoroughly test each component (schema, API endpoints, UI components) with unit and integration tests.

---

## Conclusion

This guide provides a comprehensive walkthrough for implementing a tagging system in MetaMarketplace. It covers the complete lifecycle—from schema design and indexing in Supabase/PostgreSQL to enforcing business rules in your Next.js application, with extensive SQL examples for faceted search and vector similarity. Follow each section step by step, test thoroughly, and adjust thresholds and limits as needed based on your user data and application performance.

Happy coding and building a robust, scalable tagging experience for your marketplace!