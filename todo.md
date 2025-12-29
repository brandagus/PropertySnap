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
- [x] PDF generation with cover page
- [x] PDF room-by-room breakdown
- [x] Export options (email, save, share)

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

## PDF Generation Feature
- [x] Install expo-print and expo-sharing packages
- [x] Create PDF service with HTML template generation
- [x] Build cover page with property info and inspection date
- [x] Add room-by-room breakdown with photos and conditions
- [x] Include signature section with landlord and tenant signatures
- [x] Add export options (share, save, email)
- [x] Integrate PDF generation button in inspection detail screen
- [x] Add loading state during PDF generation

## PDF Export Fixes
- [x] Increase PDF margins for professional spacious layout
- [x] Match PDF font to app interface (Crimson Pro serif for headings)
- [x] Fix photo rendering in PDF (blue question mark issue)
- [x] Show "No photo provided" for empty photo sections
- [x] Show "No information provided" for empty notes
- [x] Keep rooms in PDF even if empty (only remove if user deleted room)

## App Functionality Changes
- [x] Add "Delete Room" button within each room during inspection
- [x] Replace condition ratings: Pass / Pass - Needs Attention / Fail - Action Required
- [x] Collapse all rooms by default during inspection
- [x] Allow editing room name when expanded
- [x] Clean checklist feel - expand one room at a time

## Enterprise Team Management
- [x] Create Team data model with roles (Admin, Manager, Inspector, Viewer)
- [x] Add team member invitation system via email
- [x] Property access control: "All Properties" or "Specific Properties" selection
- [x] Team management screen for admins
- [x] Team member list with role badges
- [x] Edit team member permissions
- [x] Remove team member functionality
- [x] Filter properties based on user access permissions
- [ ] Agency/company profile settings

## App Icon Update
- [x] Generate new app icon with burgundy (#8B2635) and gold (#C59849) color scheme
- [x] Update icon in all required locations (icon.png, splash-icon.png, favicon.png, android-icon-foreground.png)
- [x] Update app.config.ts with new logo URL

## Condition Display Fix
- [x] Remove "Not Inspected" from individual photo checkpoints without assessment (leave blank)
- [x] Only show "Not Inspected" at room level when room has no photo AND no assessment
- [x] Update PDF service to follow same logic

## PDF Complete Redesign - Luxury/Legal Aesthetic
- [x] Fix color palette usage: Burgundy 30%, Gold 10%, Navy 40%, Cream 20%
- [x] Add property photo centered on cover page with gold/burgundy frame
- [x] Create strong visual hierarchy with PS logo prominent in burgundy
- [x] Large serif "Property Inspection Report" title in burgundy/navy
- [x] Emphasize property address larger than other details
- [x] Add burgundy header bar/border on cover
- [x] Add gold divider lines between sections
- [x] Increase margins throughout entire document
- [x] Use serif font (Crimson Pro) consistently
- [x] Burgundy section headers throughout
- [x] Gold accent lines between rooms
- [x] Professional spacing and layout

## Photo EXIF Timestamp - Critical Security Fix
- [x] Install EXIF metadata extraction library (exifreader)
- [x] Create EXIF service to extract DateTimeOriginal from photos
- [x] Update Checkpoint data model to store originalCaptureDate and isExifAvailable
- [x] Extract EXIF timestamp when photo is captured/selected
- [x] Display actual capture date in app inspection screen
- [x] Update PDF to show capture date with clear fallback warning if EXIF unavailable
- [x] Flag photos without EXIF as "Upload date - original timestamp unavailable"

## Critical PDF Fixes
- [x] Replace "New Checkpoint" and "Room - General" with "Photo 1", "Photo 2", "Photo 3" labels
- [x] Remove room numbering (01, 02, 03...) - just use room names
- [x] Flatten "Pass" styling - make it text-based, not a button/pill
- [x] More generous margins and spacing throughout PDF
- [x] Consistent photo sizing - don't let one photo dominate

## Property Profile Photo
- [x] Add profilePhoto field to Property interface
- [x] Add "Property Photo" capture section in property creation screen
- [x] Use profilePhoto as PDF cover image (not first inspection photo)
- [x] If no profile photo, don't show photo on cover

## Photo Watermarking
- [x] Create watermarking service to overlay text on photos
- [x] Add verified timestamp watermark on photos
- [x] Add property address watermark on photos
- [x] Apply watermarking when photos are captured/selected
- [x] Show watermarked photos in app and PDF
