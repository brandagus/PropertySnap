# PropertySnap - Mobile App Interface Design

## Overview

PropertySnap is a mobile-only rental inspection app for iOS and Android that allows landlords and tenants to document property conditions with photo evidence, generate comparison reports, and export legally-defensible PDFs. The app is designed for **mobile portrait orientation (9:16)** with **one-handed usage** in mind.

---

## Screen List

### Onboarding & Authentication
1. **Splash Screen** - App logo with tagline
2. **Welcome Carousel** - 3-slide value proposition
3. **User Type Selection** - Landlord / Tenant / Property Manager
4. **Sign Up Screen** - Email, password registration
5. **Login Screen** - Email, password authentication

### Landlord Screens
6. **Landlord Home** - Property list with status badges
7. **Create Property** - Property details form
8. **Property Detail** - Property overview with inspections
9. **Create Inspection Template** - Room-by-room checklist builder
10. **Take Inspection Photos** - Camera interface with overlays
11. **Invite Tenant** - Invitation form with preview

### Tenant Screens
12. **Tenant Home** - Active inspection or empty state
13. **Tenant Inspection View** - Side-by-side photo comparison

### Shared Screens
14. **Digital Signature** - Signature pad with confirmation
15. **Comparison Report** - Move-in vs Move-out view
16. **PDF Export** - Export options and preview

### Utility Screens
17. **Archive/History** - Filterable inspection list
18. **Settings** - Account, notifications, subscription
19. **Subscription/Payment** - Pricing and payment options
20. **Notifications** - Inspection updates and alerts

---

## Primary Content and Functionality

### Splash Screen
- PropertySnap logo centered
- Tagline: "Protect your bond, every time"
- Auto-transition to Welcome Carousel after 2 seconds

### Welcome Carousel
- **Slide 1**: House icon + "Document property condition with photos"
- **Slide 2**: Compare icon + "Side-by-side comparison reports"
- **Slide 3**: PDF icon + "Legally-defensible PDF exports"
- Pagination dots at bottom
- "Get Started" button on final slide

### User Type Selection
- Three large cards stacked vertically:
  - Landlord card with building icon
  - Tenant card with key icon
  - Property Manager card with briefcase icon
- Each card shows user type and brief description

### Sign Up / Login
- Email input field
- Password input field (with visibility toggle)
- Confirm password (sign up only)
- Primary action button
- Link to switch between sign up/login
- "Forgot password?" link on login

### Landlord Home Screen
- **Header**: "My Properties" title + "+" add button
- **Property Cards** (FlatList):
  - Property thumbnail (80x80)
  - Address (2 lines max)
  - Status badge (Pending/Completed/Vacant)
  - Chevron for navigation
- **Bottom Tab Bar**: Home, Inspections, Archive, Account

### Create Property Form
- Property address (autocomplete input)
- Property type dropdown (Apartment/House/Townhouse/Studio)
- Bedrooms picker (0-10)
- Bathrooms picker (1-5)
- Property photo upload area
- "Create Property" primary button

### Inspection Template Builder
- Room sections (expandable/collapsible):
  - Living Room, Kitchen, Bathroom, Bedroom 1, Bedroom 2, Laundry, Outdoor
- Each room contains:
  - "+ Add Photo Checkpoint" button
  - Checkpoint cards with:
    - Title input
    - Photo placeholder
    - Condition dropdown (Excellent/Good/Fair/Poor/Damaged)
    - Notes field
    - Delete button
- "Save Template" fixed button at bottom

### Camera Interface
- Full-screen camera preview
- Overlay showing current checkpoint name
- Grid lines (rule of thirds)
- Flash toggle (top right)
- Progress indicator: "3/12 photos"
- Bottom controls: Retake / Use Photo buttons

### Invite Tenant Form
- Tenant name input
- Tenant email input
- Tenant phone (optional)
- Pre-filled invitation message (editable)
- "Send Invite" primary button
- Preview card showing what tenant receives

### Tenant Home Screen
- **Active Inspection State**:
  - Property banner with photo and address
  - "Complete Inspection" prominent green button
  - Instructions text
- **Empty State**:
  - "No active inspections" message
  - Past inspections list (grayed, view-only)
  - Upgrade prompt card

### Tenant Inspection View
- Scrollable list of checkpoints
- Each checkpoint shows:
  - Landlord's photo (left)
  - Tenant's photo or "+ Add" button (right)
  - Landlord's condition rating
  - Tenant's condition dropdown
  - Notes input field
  - Disagreement flag (orange) if ratings differ
- Bottom: Confirmation checkbox + "Sign Inspection" button

### Digital Signature Screen
- White signature canvas (full width)
- "Sign here" placeholder text
- "Clear" button to reset
- Print name input field
- Date (auto-filled, read-only)
- "Submit Signature" primary button

### Comparison Report (Move-out)
- Three-column layout:
  - Move-in (landlord)
  - Move-in (tenant)
  - Move-out (new)
- Condition change indicators
- "Generate PDF Report" button

### PDF Export Screen
- PDF preview thumbnail
- Export options:
  - Email to both parties
  - Save to device
  - Share (native share sheet)
- File size indicator
- "Export PDF" primary button

### Archive Screen
- Search bar (address, tenant name)
- Filter chips (Date, Status, Property)
- Inspection cards:
  - Property address
  - Tenant name
  - Completion date
  - "View PDF" button
- Bulk select mode for batch export

### Settings Screen
- Sections:
  - **Account**: Email, password change, delete account
  - **Notifications**: Toggle switches
  - **Subscription**: Current plan, billing history
  - **Legal**: Terms, Privacy Policy
  - **Help**: FAQ, Contact Support
  - **About**: Version number

### Subscription Screen
- Current plan indicator
- Pricing cards:
  - $4.99/inspection (one-time)
  - $49/month unlimited (best value badge)
- Payment method selection
- "Subscribe" primary button
- "Restore Purchases" link

---

## Key User Flows

### Flow 1: Landlord Creates First Inspection
1. User opens app → Splash → Welcome Carousel
2. Selects "I'm a Landlord" → Sign Up
3. Lands on empty Landlord Home → Taps "+ Add Property"
4. Fills Create Property form → Submits
5. Property appears in list → Taps property card
6. Taps "Create Inspection" → Template Builder opens
7. Adds checkpoints to rooms → Saves template
8. Taps "Start Inspection" → Camera opens
9. Takes photos for each checkpoint
10. Taps "Invite Tenant" → Fills form → Sends invite
11. Waits for tenant response

### Flow 2: Tenant Completes Inspection
1. Tenant receives email invite → Downloads app
2. Opens app → Splash → Welcome Carousel
3. Selects "I'm a Tenant" → Sign Up with invite link
4. Lands on Tenant Home with active inspection banner
5. Taps "Complete Inspection" → Inspection View opens
6. Reviews landlord's photos → Adds own photos
7. Adjusts condition ratings → Adds notes
8. Checks confirmation box → Taps "Sign Inspection"
9. Signature screen → Signs → Submits
10. Confirmation message → PDF available

### Flow 3: Move-out Comparison
1. Landlord opens property → Taps "Move-out Inspection"
2. Takes new photos for each checkpoint
3. Comparison Report shows 3 columns
4. Reviews changes → Taps "Generate PDF"
5. PDF Export screen → Emails to both parties

---

## Color Choices

### Primary Palette
| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `primary` | #2563EB | #3B82F6 | Buttons, links, active states |
| `background` | #F8FAFC | #0F172A | Main app background |
| `surface` | #FFFFFF | #1E293B | Cards, forms, elevated surfaces |
| `foreground` | #1E293B | #F1F5F9 | Primary text, headers |
| `muted` | #64748B | #94A3B8 | Secondary text, labels |
| `border` | #E2E8F0 | #334155 | Dividers, card borders |

### Status Colors
| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `success` | #10B981 | #34D399 | Completed inspections, confirmations |
| `warning` | #F59E0B | #FBBF24 | Pending actions, disagreements |
| `error` | #EF4444 | #F87171 | Damage flags, critical alerts |

### Special Colors
- **Signature Blue**: #3B82F6 (signature pad strokes)
- **Photo Overlay**: rgba(0, 0, 0, 0.5) (camera interface)
- **Disabled**: #CBD5E1 (inactive buttons)

---

## Typography

**Font Family**: Inter (Google Fonts)

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| H1 (Screen titles) | 28px | Bold (700) | 1.2 |
| H2 (Section headers) | 20px | Semibold (600) | 1.2 |
| H3 (Card titles) | 16px | Semibold (600) | 1.2 |
| Body | 14px | Regular (400) | 1.5 |
| Small (Labels) | 12px | Regular (400) | 1.5 |
| Button text | 16px | Semibold (600) | 1.2 |

---

## Spacing & Layout

- **Base unit**: 16px
- **Padding**: 16px (mobile)
- **Card spacing**: 12px between cards
- **Section spacing**: 24px between sections

### Border Radius
- Buttons: 8px
- Cards: 12px
- Input fields: 8px
- Photo thumbnails: 4px

### Shadows
- Cards: `0px 2px 8px rgba(0, 0, 0, 0.08)`
- Modals: `0px 8px 24px rgba(0, 0, 0, 0.12)`

---

## Component Specifications

### Buttons
- **Primary**: #2563EB background, white text, 48px height, 8px radius
- **Secondary**: White background, #2563EB border and text, 48px height
- **Destructive**: #EF4444 background, white text

### Input Fields
- Height: 48px
- Border: 1px solid #E2E8F0
- Focus: 2px solid #2563EB
- Error: 2px solid #EF4444
- Border radius: 8px

### Property Cards
- Background: white (surface)
- Border radius: 12px
- Shadow: 0px 2px 8px rgba(0, 0, 0, 0.08)
- Padding: 16px
- Thumbnail: 80x80px, 4px radius

### Status Badges
- Pending: #F59E0B background, white text
- Completed: #10B981 background, white text
- Vacant: #64748B background, white text
- Padding: 4px 8px, 4px radius

---

## Iconography

**Icon Library**: Lucide Icons (24px stroke)

| Icon | SF Symbol | Material Icon | Usage |
|------|-----------|---------------|-------|
| Home | house.fill | home | Tab bar |
| Add | plus.circle | add-circle | Add property/checkpoint |
| Camera | camera.fill | camera-alt | Take photo |
| Document | doc.text | description | PDF export |
| Signature | pencil | edit | Sign inspection |
| Settings | gearshape | settings | Settings tab |
| Bell | bell | notifications | Notifications |
| Check | checkmark.circle | check-circle | Success states |
| Warning | exclamationmark.triangle | warning | Disagreements |
| Error | xmark.circle | cancel | Error states |
| Building | building.2 | apartment | Landlord icon |
| Key | key | vpn-key | Tenant icon |
| Briefcase | briefcase | work | Property Manager |
| Chevron | chevron.right | chevron-right | Navigation |
| Archive | archivebox | archive | Archive tab |
| User | person.circle | account-circle | Account tab |

---

## Accessibility

- Minimum touch targets: 44x44px
- Color contrast: 4.5:1 for text, 3:1 for large text
- All interactive elements have aria-labels
- Support for iOS Dynamic Type (up to 200% zoom)
- Color-blind friendly: Icons accompany color indicators
