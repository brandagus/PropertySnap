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

## Bug Fix - EXIF Reader Module Error
- [x] Remove exifreader package (incompatible with React Native/Expo)
- [x] Use expo-media-library getAssetInfoAsync for EXIF data extraction
- [x] Update exif-service.ts to use Expo-compatible approach
- [x] Test on Expo Go to verify fix

## Enterprise White-Label Logo
- [x] Add companyLogo field to Team data model
- [x] Add companyName field to Team data model
- [x] Create Agency Settings screen with logo upload functionality
- [x] Allow image picker for logo selection
- [x] Store logo URI in team settings
- [x] Update PDF service to use custom logo when available
- [x] Fall back to default PS logo when no custom logo set
- [x] Display company name in PDF header when set

## Property Photo Editing
- [x] Add edit/change property photo button in property details screen
- [x] Allow user to update the property profile photo after creation

## PDF Fixes Round 2
- [x] Remove blank second page from PDF
- [x] Fix margins throughout PDF (wider margins)
- [x] Remove slogan "Protect your bond, every time" from header
- [x] Change footer to minimal "Captured using PropertySnap"
- [x] Allow custom company name text (not just logo) in agency settings
- [x] Use custom company name in PDF header when set

## Inspection Type Update
- [x] Add "Routine" inspection type for mid-tenancy inspections
- [x] Update inspection type selector to show Move-In, Move-Out, Routine options

## UI Label Fixes
- [x] Change "Add Checkpoint" button to "Add Photo"
- [x] Update all references to checkpoint to use "Photo" terminology

## PDF Photo Size Fix
- [x] Make photos larger in PDF for better visibility
- [x] Ensure photos are clear enough to verify condition assessments

## EXIF Timestamp Fix
- [x] Fix EXIF extraction to get actual capture date from gallery photos
- [x] Photos from gallery should show when they were taken, not upload time

## Manage Tenants Feature
- [x] Add "Manage Tenants" option in Account section
- [x] Create tenant data model with name, email, phone, assigned property
- [x] View list of properties with assigned tenants
- [x] Add tenant to property functionality
- [x] Request Inspection button (in-app notification)
- [x] Send SMS Reminder button with editable template
- [x] Default SMS template with tenant name and property address
- [x] Allow landlord to customize SMS message before sending

## Photo Verification - Forensic Reliability
- [x] Remove gallery picker option - camera-only for legal-grade photos
- [x] Embed timestamp directly into photo at capture time (not relying on EXIF)
- [x] Add photo hash (SHA-256) verification to detect tampering
- [x] Store original hash when photo is captured
- [ ] Verify hash hasn't changed when generating PDF
- [x] Show prominent "Verified" or "Unverified" badge on photos

## Camera Composition Guides
- [x] Create visual overlay showing room composition guide
- [x] Wall-to-wall guide sketch for consistent framing
- [x] Corner guide for capturing full room perspective
- [x] Tips text overlay explaining how to take the photo
- [x] Different guides for different checkpoint types (walls, floor, ceiling, fixtures)
- [x] Toggle to show/hide guides during capture

## Photo Integrity Features
- [x] Disable screenshots as valid photos (camera-only mode)
- [x] Detect if photo was taken within the app vs imported
- [x] Add GPS coordinates to photo metadata when available
- [x] Cross-reference GPS with property address for location verification
- [x] Flag photos taken far from property location


## Push Notifications Feature
- [x] Set up expo-notifications with proper permissions
- [x] Create notification service for scheduling local notifications
- [x] Add notification types: inspection_reminder, inspection_due, inspection_completed
- [x] Schedule automatic reminders before inspection deadlines
- [x] Notify landlords when tenants complete their inspection portion
- [x] Add notification preferences screen in account settings
- [x] Allow users to enable/disable different notification types
- [x] Set custom reminder timing (1 day before, 3 days before, etc.)
- [ ] Show notification history/log in app
- [ ] Handle notification tap to navigate to relevant inspection


## Request Inspection Enhancement
- [x] Request Inspection button creates a new pending inspection for the property
- [x] Send push notification to tenant when inspection is requested
- [x] After creating inspection, ask "Do you want to send an SMS?"
- [x] If yes, open native SMS app (iMessage/Android Messages) with pre-populated phone number and message
- [x] SMS message template: "Hey [Tenant Name], your landlord has requested you to complete a property inspection for [Address]. Please open the PropertySnap app to get started."

## Edit Tenant Feature
- [x] Replace Send SMS button with Edit Tenant button in Manage Tenants screen
- [x] Create Edit Tenant screen with fields for name, phone, email
- [x] Add ability to unassign tenant from property (removes their access)
- [x] Show confirmation dialog before unassigning tenant
- [x] Update property state when tenant details are edited

## Tenant Invitation Feature
- [x] After assigning tenant, ask if user wants to send invitation
- [x] Offer choice between SMS or Email invitation
- [x] Open native SMS app with pre-written welcome message including property address
- [x] Open native Email app with pre-written welcome message including property address
- [x] Include instructions to download PropertySnap app in invitation message

## Inspection Type Selection Feature
- [x] Add inspection type selection when requesting inspection (Move-In, Move-Out, Routine)
- [x] Show type selection dialog before creating inspection
- [x] Pass selected type to inspection creation
- [x] Update SMS message to include inspection type

## Inspection History PDF Export
- [x] Create combined PDF export function for all property inspections
- [x] Include cover page with property details and inspection summary
- [x] Include each inspection report in chronological order
- [x] Add "Export All Inspections" button to property detail screen
- [x] Show loading state during PDF generation

## Inspection Due Date Picker
- [x] Add dueDate field to Inspection interface
- [x] Create date picker modal for selecting due date
- [x] Update Request Inspection flow to show date picker after type selection
- [x] Default to 7 days from now but allow customization
- [x] Update notification scheduling to use selected due date
- [x] Display due date on inspection cards and detail screens


## Backend Cloud Integration
- [x] Set up Neon PostgreSQL database (Sydney region)
- [x] Configure Cloudflare R2 for photo storage
- [x] Create GitHub repository and push code
- [x] Deploy backend to Render
- [x] Convert database schema from MySQL to PostgreSQL
- [x] Run database migrations to create tables
- [x] Create API routes for properties, tenants, inspections, checkpoints
- [x] Create R2 storage service for photo uploads
- [ ] Connect mobile app to backend API
- [ ] Implement user authentication flow
- [ ] Add offline sync logic
- [ ] Test end-to-end cloud sync

## Photo Cloud Upload Integration
- [x] Create photo upload service to call backend API
- [x] Update camera capture to upload photos to R2
- [x] Store R2 URLs instead of local file paths
- [x] Test photo upload and retrieval


## User Authentication Implementation
- [x] Create login screen with OAuth integration
- [x] Create signup flow for new users
- [x] Link photos to authenticated user accounts
- [x] Protect API routes with authentication
- [x] Store auth token securely on device
- [x] Add logout functionality


## Bugs
- [x] Photo capture takes forever (1+ minute) - cloud upload blocking UI (fixed: upload now runs in background)

- [x] Add 0.5x zoom (ultra-wide) support for wider angle photos

- [x] Add "require tenant signature" toggle (yes/no) to landlord signature section
- [x] Hide tenant signature section in PDF when not required

- [x] BUG: Photos not uploading to Cloudflare R2 - configured direct upload with user's R2 credentials

- [ ] BUG: R2 upload fails with SignatureDoesNotMatch error - fix AWS signature calculation
