# Claude Handoff Context - Silhouette CRM / CRM Negozi

## 1. Project Snapshot

- Project name in codebase: `crm-negozi`
- Product/marketing name currently used on landing: `Silhouette CRM`
- Stack:
  - Next.js App Router (`next@16.2.2`)
  - TypeScript
  - React 19
  - Clerk Organizations
  - Supabase Postgres + Storage
  - Tailwind CSS v4
  - Private storage + signed URLs
  - PWA metadata already present
- Repository workspace path:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi`
- Current active integration branch:
  - `codex/proposals-voice-images-hardening`

## 2. What Is Already Implemented

The app is no longer an early prototype. The current codebase already includes:

- Auth and multi-tenancy
  - Clerk-based auth
  - Active Organization as active tenant
  - Supabase tables tenant-aware with `org_id`
  - RLS already in place and extended for new modules
- Retail core
  - products
  - product_variants
  - stores
  - inventory_movements
  - stock views and movement history
- Multimodal inputs
  - barcode scanning
  - browser-based voice input
  - document upload
  - PDF parsing
  - photo / handwriting document ingestion
- Proposal layer
  - `inventory_proposals`
  - `inventory_proposal_items`
  - approval/reject/apply flow
  - proposal review UI
  - movement writes routed through proposal apply for non-trusted flows
- Product media
  - private `product_images`
  - upload, preview via signed URLs, primary image, delete
- Marketing / public surface
  - root landing page with Silhouette positioning

## 3. Important Recent Architectural Direction

The domain was recently corrected to avoid catalog explosion:

- `variant` should represent real commercial differences:
  - color
  - material
  - finish / composition where relevant
- `size` should **not** be treated as the main identity of a variant
- current incremental refactor already moved the app in this direction

This means:

- UI and stock views are being shifted toward:
  - product
  - commercial variant (`color/material`)
  - size only when present and relevant
- Voice/document matching has started prioritizing:
  - product
  - color
  - material
  - size as secondary signal

Do **not** revert this direction.

## 4. Key Migrations Already Present

Located in:
- `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\supabase\migrations`

Current migration set:

1. `001_initial_schema.sql`
2. `002_rls_policies.sql`
3. `003_clerk_native_auth.sql`
4. `004_inventory_proposals.sql`
5. `005_inventory_proposals_rls.sql`
6. `006_document_capture_metadata.sql`
7. `007_product_images.sql`
8. `008_product_images_rls.sql`
9. `009_variant_material_and_optional_size.sql`

Meaning:

- proposal layer exists in DB
- product images exist in DB
- document photo metadata exists
- variant/material refactor has already started in DB

## 5. Critical Files / Areas To Understand Before Editing

### Public / landing / shell

- Root landing route:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\app\page.tsx`
- Landing component:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\components\landing\landing-content.tsx`
- Root layout:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\app\layout.tsx`
- Middleware:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\middleware.ts`

### Mobile / PWA baseline

- Manifest:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\public\manifest.json`
- Global styles:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\app\globals.css`
- Next config:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\next.config.ts`

Important note:

- `next-pwa` is in `package.json`
- but `next.config.ts` explicitly says PWA is handled manually and `next-pwa` is not actively wired
- there is currently no obvious service worker registration path in source
- current mobile capability is more “PWA metadata + mobile-first UI” than a full installable native shell

### Proposals

- Proposal service:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\modules\proposals\application\proposals-service.ts`
- Repository:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\modules\proposals\infrastructure\proposals-repository.ts`
- Domain types:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\modules\proposals\domain\proposal-types.ts`
- Proposal UI:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\app\dashboard\proposals\page.tsx`
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\app\dashboard\proposals\[id]\page.tsx`
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\components\proposals\proposal-review-editor.tsx`

### Voice

- Parser / normalizers:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\modules\voice\application\voice-normalizers.ts`
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\modules\voice\application\voice-intent-parser.ts`
- Voice service:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\modules\voice\application\voice-service.ts`
- Voice UI:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\app\dashboard\voice\page.tsx`

### Documents / OCR / multimodal ingest

- Document service:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\modules\documents\application\documents-service.ts`
- Document -> proposal:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\modules\documents\application\document-proposal-service.ts`
- Parser registry:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\modules\documents\infrastructure\parser-registry.ts`
- OCR adapter:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\modules\documents\infrastructure\ocr-registry.ts`

### Products / variants / images

- Product service:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\modules\products\application\products-service.ts`
- Product images service:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\modules\products\application\product-images-service.ts`
- Variant display helper:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\modules\products\domain\variant-display.ts`

### Inventory / stock

- Inventory service:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\modules\inventory\application\inventory-service.ts`
- Inventory page:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\app\dashboard\inventory\page.tsx`
- Movements page:
  - `C:\Users\avvsa\OneDrive - AVVOCATO SAPONE\Desktop\Siti\APP\CRM negozi\crm-negozi\src\app\dashboard\movements\page.tsx`

## 6. Recent Relevant Commits

Recent commits that matter for understanding current state:

- `7535e32` Move Silhouette landing to root route and cleanup
- `2c02a29` Fix Clerk middleware and build issues, add landing page and AI assistant features
- `eac57d6` Prioritize color and material in matching
- `9bf61ce` Refactor variants toward color and material
- `e161f60` Fix inventory links and dynamic stock views
- `e4c3852` Clarify selected proposal candidate state
- `9e629a8` Refine proposal review actions and search defaults
- `68094f0` Handle spoken outbound prefixes in voice parser
- `bccda9a` Improve voice quantity parsing and catalog mismatch review
- `62e56df` Lazy-load Clerk on public routes
- `6089a51` Harden public auth routes for missing Clerk config
- `7d52ce1` Add proposal-driven inventory flows, voice parsing, and product images

These commits already contain most of the hard work. The remaining work should be additive and careful.

## 7. Current Product Behavior That Must Be Preserved

Do not break any of these:

- Public landing at `/`
- Auth with Clerk Organizations
- Redirect to `/dashboard` when already logged in
- Multi-tenant behavior based on active Clerk organization
- Proposal-based safety for:
  - voice
  - document import
  - handwriting / photo ingestion
- Private Supabase storage + backend signed URLs
- Product images workflow
- Inventory movement ledger
- Voice lookup behavior without direct stock mutation

## 8. Current Gaps / Known Incompleteness

### A. Capacitor is not implemented

There is currently:

- no `@capacitor/core`
- no `@capacitor/cli`
- no `capacitor.config.*`
- no `android/` native shell
- no `ios/` native shell
- no download/install CTA logic on landing for native packages

### B. PWA is only partially prepared

There is:

- `public/manifest.json`
- mobile-first layout
- safe-area CSS
- app-like viewport

There is not clearly:

- an active install flow
- a full service worker strategy
- offline strategy worth shipping as a store app baseline

### C. Store distribution planning is not yet formalized

No evidence yet of:

- package identifiers finalized
- native icons/splash pipeline finalized
- privacy/compliance checklist
- store listing copy/assets
- signing configuration
- release pipeline for Play Store / App Store / AppGallery

## 9. What Claude Needs To Do Next

The user says the remaining work is essentially:

1. use Capacitor so the app can be made available for download from the landing page on Android devices
2. start planning distribution for:
  - iOS App Store
  - Google Play
  - Huawei AppGallery

This should be treated as the next main implementation phase.

## 10. Recommended Scope For Claude

### Phase 1 - Capacitor foundation

Claude should:

- add Capacitor dependencies
- initialize Capacitor in this existing Next.js project
- create a native Android shell first
- keep the web app as the source of truth
- preserve current Clerk + Supabase behavior
- preserve current routing and PWA metadata

Concrete deliverables:

- `capacitor.config.ts`
- npm scripts for sync/copy/open/build
- Android platform added
- documentation for local build and sync
- clear handling of runtime base URL strategy

### Phase 2 - Landing page Android download path

Claude should implement a landing CTA that is intelligent:

- if Android web user:
  - show `Scarica per Android`
  - support either direct APK download or Play Store link depending on release maturity
- if iOS:
  - show `Prossimamente su App Store` or TestFlight / waitlist path
- if Huawei:
  - show `Disponibile su AppGallery` when ready, otherwise planned CTA
- desktop:
  - keep current sign-up / marketing CTA

Important:

- do not fake native availability if no signed distributable exists yet
- do not conflate PWA install with native app download

### Phase 3 - Distribution planning artifacts

Claude should create concrete planning docs/checklists for:

- Android / Google Play
- iOS / App Store / TestFlight
- Huawei AppGallery

These docs should include:

- package id / bundle id recommendations
- required icons / splash assets
- app name consistency
- legal/privacy requirements
- auth considerations inside native webview/native shell
- Supabase / Clerk deep link or redirect considerations
- release checklist

## 11. Important Technical Constraints For Capacitor

Claude must respect these constraints:

- do not rebuild the app from scratch
- do not replace Next.js with a different stack
- do not break the deployed web flow
- do not remove PWA support
- do not expose private Supabase files publicly
- keep signed URL generation backend-only
- keep Clerk Organizations as official tenant model
- keep proposal layer intact
- avoid introducing paid mobile-only services as core dependency

## 12. Practical Capacitor Considerations

These are the likely pain points Claude should consider up front:

- Clerk auth inside Capacitor shell
  - web auth flow may need native-browser or allowed origins review
  - redirects, cookies, and session persistence need to be verified
- Supabase signed URLs and file previews
  - should continue working inside Capacitor WebView
- Camera/file upload
  - current web upload may work, but native plugins may later improve UX
- Voice input
  - current browser-based approach may behave differently inside WebView
  - first release can keep web-based approach if it works acceptably
- Barcode scanning
  - current browser implementation should be verified inside native container
- Android downloadable flow
  - “download from landing page” needs a real distribution target:
    - signed APK direct download
    - or Play Store listing
  - direct APK is faster for early private distribution
  - Play Store is better for public release

## 13. Suggested Implementation Strategy For Claude

Recommended order:

1. inspect current auth + mobile shell assumptions
2. add Capacitor base config
3. add Android platform
4. verify app boot inside Android shell
5. verify auth
6. verify dashboard loads
7. verify one critical internal flow:
   - login
   - proposal list
   - inventory page
   - product images preview
8. only then add landing download CTA logic
9. then create distribution docs/checklists

## 14. Suggested File Outputs Claude Should Produce

At minimum, Claude should leave behind:

- Capacitor config files
- updated `package.json` scripts
- optional platform folders (`android/`, maybe later `ios/`)
- landing CTA updates
- one or more docs such as:
  - `CAPACITOR_SETUP.md`
  - `ANDROID_DISTRIBUTION_PLAN.md`
  - `STORE_RELEASE_CHECKLIST.md`

## 15. Suggested Acceptance Criteria

### Capacitor foundation

- project builds with Capacitor added
- Android platform exists and sync works
- app opens in Android shell without breaking root landing or dashboard

### Landing page download behavior

- Android visitors see a clear mobile install/download CTA
- non-Android visitors do not see a misleading Android CTA
- current sign-up flow remains available

### Store planning

- documented plan exists for Google Play, iOS App Store, Huawei AppGallery
- no fake claims of store readiness
- package naming, assets, auth constraints, and release steps are written down

## 16. Current Assessment Of The Codebase

The recent work appears materially good.

Why:

- architecture is now more coherent than before
- proposal layer was introduced without discarding existing flows
- voice/document/product-image features are aligned under one system
- tenant safety and signed URL patterns were preserved
- landing and auth hardening were handled pragmatically
- the variant/taglia correction moved in the right direction for real retail usage

What still requires caution:

- the app has grown quickly, so native packaging should be done conservatively
- mobile shell behavior for auth, voice, barcode, uploads must be verified before promising marketplace readiness
- current PWA setup is not yet equivalent to a polished store-ready mobile app

## 17. Final Instruction To Claude

Work incrementally on the existing codebase.

Do not rewrite the architecture.

The remaining mission is:

- add Capacitor cleanly
- make Android availability visible from the landing page in a truthful way
- prepare the codebase and documentation for Google Play, App Store, and Huawei AppGallery distribution

Preserve:

- Clerk Organizations tenant model
- Supabase private storage with signed URLs
- proposal-based safety for stock mutations
- current web deployment
- current landing and dashboard flows

