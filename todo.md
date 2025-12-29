# PropertySnap TODO

## Onboarding & Authentication
- [x] Splash screen with logo and tagline
- [x] Welcome carousel (3 slides)
- [x] User type selection screen (Landlord/Tenant/Property Manager)
- [x] Sign up screen with email/password
- [x] Login screen with forgot password
- [ ] Email verification flow

## Navigation & Layout
- [x] Bottom tab bar (Home, Inspections, Archive, Account)
- [ ] Hamburger menu with settings, subscription, help, logout
- [ ] Notifications icon in header
- [x] Theme configuration with PropertySnap colors

## Landlord Features
- [x] Landlord home screen with property list
- [x] Create property form with address, type, bedrooms, bathrooms
- [x] Property detail screen with inspection status
- [x] Create inspection template with room-by-room checkpoints
- [x] Photo capture interface with grid overlay
- [x] Invite tenant form with email/SMS
- [x] Move-out inspection creation

## Tenant Features
- [ ] Tenant home screen with active inspection banner
- [ ] Empty state for no active inspections
- [ ] Tenant inspection view with side-by-side photos
- [x] Add photos to checkpoints
- [x] Condition rating dropdowns
- [x] Notes/comments on checkpoints
- [ ] Disagreement flag display

## Inspection Features
- [x] Photo checkpoints with title, photo, condition, notes
- [x] Progress indicator during photo capture
- [x] Timestamp embedded in photos
- [x] Condition ratings (Excellent/Good/Fair/Poor/Damaged)
- [ ] Comparison report (move-in vs move-out)

## Signature & PDF
- [x] Digital signature pad
- [x] Signature canvas with stylus/finger drawing
- [x] Clear signature button
- [x] Print name field
- [x] Auto-filled date
- [ ] PDF generation with cover page
- [ ] PDF room-by-room breakdown
- [ ] Export options (email, save, share)

## Archive & History
- [x] Archive screen with search and filters
- [x] Inspection cards with property, tenant, date
- [x] View PDF button
- [ ] Duplicate template functionality
- [ ] Bulk PDF export

## Settings & Account
- [x] Account settings (email, password, delete)
- [x] Notification preferences
- [x] Subscription management
- [x] Terms of service
- [x] Privacy policy
- [x] Help/FAQ section
- [x] About screen with version

## Subscription & Payment
- [ ] Paywall for landlords (after 1 free inspection)
- [ ] Pricing options ($4.99/inspection, $49/month)
- [ ] Payment integration placeholder
- [ ] Restore purchases

## Data & Storage
- [x] Local storage with AsyncStorage
- [x] Property data model
- [x] Inspection data model
- [x] Checkpoint data model
- [x] Photo storage and management

## Offline Support
- [ ] Offline mode indicator
- [ ] Local data caching
- [ ] Photo upload queue
- [ ] Sync when connection restored

## Accessibility
- [x] 44x44px minimum touch targets
- [x] Proper color contrast
- [ ] Screen reader labels
- [ ] Dynamic type support

## Design System Update - Sophisticated & Timeless
- [x] Update color palette to burgundy (#8B2635), navy (#1C2839), ochre gold (#C59849)
- [x] Update neutral colors (charcoal, warm gray, cream, soft gray)
- [x] Update status colors (forest green, amber, deep red)
- [x] Update typography to Crimson Pro (headings) + Inter (body)
- [x] Update button styles with 52px height, 6px border radius
- [x] Update card styles with refined shadows and borders
- [x] Update input field styles with soft gray backgrounds
- [x] Update badge styles for scores and status
- [x] Remove dark mode support (light only for professional look)
- [x] Update all screens with new design system
