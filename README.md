# FotoDeporte — Sports Photography Sales Platform

A full-stack platform for sports photographers to sell race and event photos. Runners browse collections, find their folder by bib number, preview their photos, and purchase or access them for free. Built with the T3 Stack on top of Supabase and MercadoPago.

---

## Features

**Public storefront**
- Browse event collections with cover images and descriptions
- Search folders by bib/dorsal number with live filtering
- Blurred preview images for private folders, clear previews for public ones
- Modal flow: preview → buy via MercadoPago → access with email token

**Photo gallery (`/descarga/[token]`)**
- Full-resolution photo grid, paginated (24 at a time)
- Lightbox with keyboard navigation and thumbnail strip
- Multi-select mode with bulk download
- Individual photo download via blob fetch (cross-origin safe)
- Share link via clipboard
- Public folders have permanent tokens; paid folders expire in 72 hours

**Admin panel (`/admin`)**
- Dashboard with sales stats and recent purchases
- Collections: create, edit, publish/draft toggle, delete
- Folders: create individually or via bulk import, publish toggle, public/private toggle
- Photos: upload with per-file progress feed, bulk delete, storage usage bar
- Bulk folder upload: select parent event folder → auto-detects numeric subfolders → uploads all with progress
- Sales table: paginated, status filter, manual approval, copy download link

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL via Supabase |
| ORM | Prisma 6 |
| API | tRPC 11 + TanStack Query 5 |
| Auth | NextAuth v5 (credentials) |
| Storage | Supabase Storage (private bucket) |
| Payments | MercadoPago Checkout Pro |
| Validation | Zod |
| Hosting | Vercel |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                          # Homepage / landing
│   ├── colecciones/[slug]/page.tsx       # Public collection page (folder browser)
│   ├── descarga/[token]/page.tsx         # Photo gallery (post-purchase)
│   ├── descarga/pendiente/page.tsx       # Awaiting payment confirmation
│   ├── admin/
│   │   ├── login/page.tsx                # Admin login
│   │   ├── (protected)/
│   │   │   ├── page.tsx                  # Dashboard
│   │   │   ├── colecciones/              # Collection management
│   │   │   │   ├── page.tsx
│   │   │   │   ├── nueva/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── carpetas/
│   │   │   │           ├── nueva/page.tsx
│   │   │   │           └── [folderId]/page.tsx
│   │   │   └── ventas/page.tsx           # Sales table
│   ├── api/
│   │   ├── auth/[...nextauth]/           # NextAuth handler
│   │   ├── trpc/[trpc]/                  # tRPC handler
│   │   ├── uploads/sign/                 # Supabase signed URL generation
│   │   └── webhooks/mercadopago/         # Payment webhook
│   └── _components/
│       ├── FolderBrowser.tsx             # Collection folder grid with search
│       ├── FolderModal.tsx               # Purchase/access modal
│       ├── PhotoGallery.tsx              # Full gallery with lightbox
│       └── admin/
│           ├── BulkFolderCreate.tsx      # Bulk folder import modal
│           ├── CollectionActions.tsx     # Publish toggle + delete
│           ├── ConfirmModal.tsx          # Reusable confirm dialog
│           ├── EditCollectionForm.tsx    # Collection create/edit form
│           ├── FolderActions.tsx         # Publish/public toggles + delete
│           ├── PhotoManager.tsx          # Photo grid with bulk delete
│           ├── PhotoUploader.tsx         # Upload with live progress feed
│           ├── PublishToggle.tsx         # Animated publish switch
│           ├── SalesTable.tsx            # Purchases table
│           └── StorageBar.tsx            # Storage usage indicator
├── server/
│   ├── api/
│   │   ├── root.ts                       # App router (collection, folder, photo, purchase)
│   │   ├── trpc.ts                       # tRPC context + procedure helpers
│   │   └── routers/
│   │       ├── collection.ts
│   │       ├── folder.ts
│   │       ├── photo.ts
│   │       └── purchase.ts
│   └── auth/
│       ├── config.ts                     # NextAuth config (credentials + Prisma adapter)
│       └── index.ts
├── lib/
│   └── supabase/
│       └── admin.ts                      # Isolated service role client + createSignedUrl
├── trpc/
│   ├── react.tsx                         # Client-side tRPC provider
│   └── server.ts                         # Server-side tRPC caller
├── middleware.ts                         # Auth guard for /admin routes
└── env.js                                # Zod-validated environment variables
```

---

## Database Schema

```prisma
model Collection {
  id          String   @id @default(cuid())
  title       String
  description String?
  coverUrl    String?
  slug        String   @unique
  isPublished Boolean  @default(false)
  folders     Folder[]
}

model Folder {
  id           String   @id @default(cuid())
  number       String                        // bib/dorsal number
  collectionId String
  price        Decimal  @db.Decimal(10, 2)
  isPublished  Boolean  @default(false)
  isPublic     Boolean  @default(false)      // true = no paywall
  collection   Collection @relation(...)
  photos       Photo[]
  purchases    Purchase[]
  @@unique([collectionId, number])
}

model Photo {
  id         String   @id @default(cuid())
  folderId   String
  storageKey String                          // Supabase storage path
  filename   String
  fileSize   Int?                            // bytes, used for storage bar
  width      Int?
  height     Int?
  order      Int      @default(0)
}

model Purchase {
  id                      String         @id @default(cuid())
  folderId                String
  buyerEmail              String
  buyerName               String?
  amountPaid              Decimal        @db.Decimal(10, 2)
  currency                String         @default("ARS")
  status                  PurchaseStatus @default(PENDING)
  mercadopagoPreferenceId String?
  mercadopagoPaymentId    String?
  downloadToken           String?        @unique
  downloadTokenExpires    DateTime?
  isPublic                Boolean        @default(false)  // permanent share
}

enum PurchaseStatus { PENDING APPROVED REJECTED REFUNDED }
```

---

## API Routes

### `POST /api/uploads/sign`
Generates a Supabase signed upload URL. Requires admin session.
```json
// Request
{ "path": "collectionId/folderId/timestamp-filename.jpg" }

// Response
{ "signedUrl": "https://..." }
```

### `POST /api/webhooks/mercadopago`
Receives payment status notifications from MercadoPago. On approval:
- Updates `Purchase.status` to `APPROVED`
- Generates a `downloadToken` (UUID)
- Sets `downloadTokenExpires` to 72 hours from now

### `GET/POST /api/auth/[...nextauth]`
NextAuth handler. Credentials provider validates email + bcrypt password hash.

---

## tRPC Procedures

### `collection`
| Procedure | Access | Description |
|---|---|---|
| `list` | public | Published collections |
| `getBySlug` | public | Single collection by slug |
| `adminList` | protected | All collections |
| `adminGetById` | protected | Collection with folders + counts |
| `create` | protected | New collection |
| `update` | protected | Edit fields |
| `delete` | protected | Delete with cascade |
| `togglePublish` | protected | Flip `isPublished` |

### `folder`
| Procedure | Access | Description |
|---|---|---|
| `listByCollection` | public | Published folders with preview URLs |
| `getPreview` | public | 4-photo preview + metadata for modal |
| `adminGetById` | protected | Folder with all photos and purchases |
| `create` | protected | New folder |
| `update` | protected | Edit fields |
| `delete` | protected | Delete with cascade |
| `togglePublish` | protected | Flip `isPublished` |
| `togglePublicFolder` | protected | Flip `isPublic` (free access) |
| `reorderPhotos` | protected | Update photo sort order |

### `photo`
| Procedure | Access | Description |
|---|---|---|
| `bulkAdd` | protected | Add photos after upload |
| `getStorageUsage` | protected | Sum of `fileSize`, returns used/limit |
| `delete` | protected | Remove from DB + Supabase storage |
| `bulkDelete` | protected | Remove batch from DB + storage |

### `purchase`
| Procedure | Access | Description |
|---|---|---|
| `createPreference` | public | MercadoPago preference + redirect URL |
| `getPublicFolderToken` | public | Token for `isPublic` folders (reuses or creates `public@system` purchase) |
| `accessByEmail` | public | Find approved purchase by email and return token |
| `getDownloadInfo` | public | Validate token, return photos with signed URLs |
| `adminList` | protected | Paginated purchases (excludes `public@system`) |
| `manualApprove` | protected | Approve + generate token without webhook |

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...        # Supabase pooler URL (pgbouncer)
DIRECT_URL=postgresql://...          # Direct connection for migrations

# Auth
AUTH_SECRET=...                      # NextAuth secret (required in production)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # Required for signed upload URLs

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=...
MERCADOPAGO_WEBHOOK_SECRET=...
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=...

# App
NEXT_PUBLIC_BASE_URL=https://...     # Used for MercadoPago callback URLs

# Admin seed (optional)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=...
```

---

## Key Design Decisions

**Supabase admin client isolation** — `src/lib/supabase/admin.ts` uses `@supabase/supabase-js` directly with the service role key (not `@supabase/ssr` which requires `next/headers`). This allows it to be called from tRPC server procedures without conflicts.

**Signed URLs for private storage** — All photos are in a private Supabase bucket. `createSignedUrl()` generates temporary access URLs (1 hour). If the `storageKey` starts with `http`, it is treated as a direct URL (for dev/seed data) and returned as-is.

**Public folder token** — When `Folder.isPublic = true`, a `Purchase` row with `buyerEmail: "public@system"` and `isPublic: true` is created/reused as a permanent token. This record is excluded from the admin sales table.

**Download token expiry** — Paid (non-public) purchases get a `downloadToken` that expires 72 hours after approval. Public purchases never expire (`downloadTokenExpires` is null, `isPublic` is true).

**Bulk folder upload** — Uses `<input webkitdirectory>` to read an entire folder tree in the browser. `webkitRelativePath` on each file gives the full path (e.g. `maraton/42/foto.jpg`), from which numeric folder names are extracted and grouped automatically.

**Photo downloads** — Uses `fetch()` + `URL.createObjectURL()` instead of `<a download>` because the cross-origin `download` attribute is blocked by browsers on Supabase-hosted images.

**NextAuth v5 cookie name** — NextAuth v5 changed the session cookie name from `next-auth.session-token` to `authjs.session-token`. The middleware explicitly reads the correct cookie name based on whether the request is over HTTPS.

---

## Local Development

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Fill in DATABASE_URL, DIRECT_URL, AUTH_SECRET, Supabase keys, etc.

# Push schema to database
pnpm prisma db push

# Seed admin user
npx tsx src/scripts/seed-admin.ts

# Start dev server
pnpm dev
```

---

## Deployment (Vercel)

1. Connect the GitHub repo to Vercel
2. Add all environment variables in the Vercel dashboard
3. `DATABASE_URL` should use the Supabase **pooler** (port 5432, pgbouncer mode)
4. `DIRECT_URL` should use the **direct** connection (port 5432, no pooler) for migrations
5. Set `NEXT_PUBLIC_BASE_URL` to your production domain (used for MercadoPago callbacks)
6. The MercadoPago webhook URL is `https://yourdomain.com/api/webhooks/mercadopago`
