import React, { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Types
export type UserType = "landlord" | "tenant" | "manager" | null;
// New objective condition ratings - actionable and clear
export type ConditionRating = "pass" | "pass-attention" | "fail";
// Legacy support for existing data
export type LegacyConditionRating = "excellent" | "good" | "fair" | "poor" | "damaged";
export type PropertyType = "apartment" | "house" | "townhouse" | "studio";
export type InspectionStatus = "pending" | "completed" | "archived";
export type InspectionType = "move-in" | "move-out" | "routine";

// Team Management Types
export type TeamRole = "admin" | "manager" | "inspector" | "viewer";
export type PropertyAccessType = "all" | "specific";

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: TeamRole;
  propertyAccess: PropertyAccessType;
  assignedPropertyIds: string[]; // Only used when propertyAccess is "specific"
  invitedAt: string;
  acceptedAt: string | null;
  status: "pending" | "active" | "disabled";
}

export interface Team {
  id: string;
  name: string; // Company/Agency name
  ownerId: string; // The admin who created the team
  members: TeamMember[];
  createdAt: string;
  // White-label branding
  companyLogo: string | null; // URI to uploaded company logo
  companyName: string | null; // Display name for PDF reports
}

export interface PhotoTimestampData {
  captureDate: string | null; // Original EXIF capture date
  isExifAvailable: boolean; // Whether EXIF data was extracted
  uploadDate: string; // Fallback upload date
}

// Verified photo data for forensic reliability
export interface VerifiedPhotoData {
  uri: string;
  captureDate: string;
  isExifAvailable: boolean;
  uploadDate: string;
  verificationMethod: "camera-capture" | "gallery-import" | "unknown";
  photoHash: string; // SHA-256 hash for tamper detection
  gpsCoordinates: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
  } | null;
  locationVerified: boolean; // Whether GPS matches property location
  compositionGuide?: string; // Which guide was used when capturing
}

export interface Checkpoint {
  id: string;
  roomName: string;
  title: string;
  landlordPhoto: string | null;
  tenantPhoto: string | null;
  moveOutPhoto: string | null;
  landlordCondition: ConditionRating | null;
  tenantCondition: ConditionRating | null;
  moveOutCondition: ConditionRating | null;
  notes: string;
  timestamp: string | null; // Legacy field - upload timestamp
  // EXIF timestamp data for forensic reliability
  landlordPhotoTimestamp: PhotoTimestampData | null;
  tenantPhotoTimestamp: PhotoTimestampData | null;
  moveOutPhotoTimestamp: PhotoTimestampData | null;
  // Verified photo data with GPS and hash
  verifiedPhotoData?: VerifiedPhotoData | null;
}

export interface Inspection {
  id: string;
  propertyId: string;
  type: InspectionType;
  status: InspectionStatus;
  createdAt: string;
  completedAt: string | null;
  dueDate: string | null; // When the inspection should be completed by
  landlordSignature: string | null;
  landlordName: string | null;
  landlordSignedAt: string | null;
  tenantSignature: string | null;
  tenantName: string | null;
  tenantSignedAt: string | null;
  checkpoints: Checkpoint[];
  // Track who performed the inspection
  inspectorId?: string;
  inspectorName?: string;
}

// Tenant interface for managing tenants
export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  propertyId: string | null; // Currently assigned property
  createdAt: string;
  lastInspectionRequest: string | null; // Track when last request was sent
}

export interface Property {
  id: string;
  address: string;
  propertyType: PropertyType;
  bedrooms: number;
  bathrooms: number;
  photo: string | null; // Legacy field - use profilePhoto instead
  profilePhoto: string | null; // Front of house photo for PDF cover
  tenantId: string | null;
  tenantName: string | null;
  tenantEmail: string | null;
  tenantPhone: string | null; // Added for SMS
  inspections: Inspection[];
  createdAt: string;
  // Team assignment
  assignedTo?: string[]; // Team member IDs who can access this property
  // GPS coordinates for location verification
  latitude?: number;
  longitude?: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  userType: UserType;
  subscriptionTier: "free" | "per-inspection" | "unlimited" | "enterprise";
  inspectionsUsed: number;
  // Team membership
  teamId?: string;
  teamRole?: TeamRole;
}

interface AppState {
  isOnboarded: boolean;
  isAuthenticated: boolean;
  user: User | null;
  properties: Property[];
  activeInspection: Inspection | null;
  isLoading: boolean;
  // Team state
  team: Team | null;
}

type AppAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ONBOARDED"; payload: boolean }
  | { type: "SET_USER"; payload: User | null }
  | { type: "SET_USER_TYPE"; payload: UserType }
  | { type: "LOGIN"; payload: User }
  | { type: "LOGOUT" }
  | { type: "ADD_PROPERTY"; payload: Property }
  | { type: "UPDATE_PROPERTY"; payload: Property }
  | { type: "DELETE_PROPERTY"; payload: string }
  | { type: "SET_PROPERTIES"; payload: Property[] }
  | { type: "ADD_INSPECTION"; payload: { propertyId: string; inspection: Inspection } }
  | { type: "UPDATE_INSPECTION"; payload: Inspection }
  | { type: "SET_ACTIVE_INSPECTION"; payload: Inspection | null }
  | { type: "UPDATE_CHECKPOINT"; payload: { inspectionId: string; checkpoint: Checkpoint } }
  // Team actions
  | { type: "SET_TEAM"; payload: Team | null }
  | { type: "CREATE_TEAM"; payload: { name: string } }
  | { type: "ADD_TEAM_MEMBER"; payload: TeamMember }
  | { type: "UPDATE_TEAM_MEMBER"; payload: TeamMember }
  | { type: "REMOVE_TEAM_MEMBER"; payload: string }
  | { type: "UPDATE_TEAM_BRANDING"; payload: { companyLogo?: string | null; companyName?: string | null } }
  | { type: "HYDRATE"; payload: Partial<AppState> };

const initialState: AppState = {
  isOnboarded: false,
  isAuthenticated: false,
  user: null,
  properties: [],
  activeInspection: null,
  isLoading: true,
  team: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ONBOARDED":
      return { ...state, isOnboarded: action.payload };
    case "SET_USER":
      return { ...state, user: action.payload, isAuthenticated: !!action.payload };
    case "SET_USER_TYPE":
      if (!state.user) return state;
      return { ...state, user: { ...state.user, userType: action.payload } };
    case "LOGIN":
      return { ...state, user: action.payload, isAuthenticated: true };
    case "LOGOUT":
      return { ...state, user: null, isAuthenticated: false, properties: [], activeInspection: null, team: null };
    case "ADD_PROPERTY":
      return { ...state, properties: [...state.properties, action.payload] };
    case "UPDATE_PROPERTY":
      return {
        ...state,
        properties: state.properties.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case "DELETE_PROPERTY":
      return {
        ...state,
        properties: state.properties.filter((p) => p.id !== action.payload),
      };
    case "SET_PROPERTIES":
      return { ...state, properties: action.payload };
    case "ADD_INSPECTION":
      return {
        ...state,
        properties: state.properties.map((p) =>
          p.id === action.payload.propertyId
            ? { ...p, inspections: [...p.inspections, action.payload.inspection] }
            : p
        ),
      };
    case "UPDATE_INSPECTION":
      return {
        ...state,
        properties: state.properties.map((p) => ({
          ...p,
          inspections: p.inspections.map((i) =>
            i.id === action.payload.id ? action.payload : i
          ),
        })),
        activeInspection:
          state.activeInspection?.id === action.payload.id
            ? action.payload
            : state.activeInspection,
      };
    case "SET_ACTIVE_INSPECTION":
      return { ...state, activeInspection: action.payload };
    case "UPDATE_CHECKPOINT":
      return {
        ...state,
        properties: state.properties.map((p) => ({
          ...p,
          inspections: p.inspections.map((i) =>
            i.id === action.payload.inspectionId
              ? {
                  ...i,
                  checkpoints: i.checkpoints.map((c) =>
                    c.id === action.payload.checkpoint.id ? action.payload.checkpoint : c
                  ),
                }
              : i
          ),
        })),
      };
    // Team management reducers
    case "SET_TEAM":
      return { ...state, team: action.payload };
    case "CREATE_TEAM":
      if (!state.user) return state;
      const newTeam: Team = {
        id: generateId(),
        name: action.payload.name,
        ownerId: state.user.id,
        members: [],
        createdAt: new Date().toISOString(),
        companyLogo: null,
        companyName: null,
      };
      return {
        ...state,
        team: newTeam,
        user: {
          ...state.user,
          teamId: newTeam.id,
          teamRole: "admin",
          subscriptionTier: "enterprise",
        },
      };
    case "ADD_TEAM_MEMBER":
      if (!state.team) return state;
      return {
        ...state,
        team: {
          ...state.team,
          members: [...state.team.members, action.payload],
        },
      };
    case "UPDATE_TEAM_MEMBER":
      if (!state.team) return state;
      return {
        ...state,
        team: {
          ...state.team,
          members: state.team.members.map((m) =>
            m.id === action.payload.id ? action.payload : m
          ),
        },
      };
    case "REMOVE_TEAM_MEMBER":
      if (!state.team) return state;
      return {
        ...state,
        team: {
          ...state.team,
          members: state.team.members.filter((m) => m.id !== action.payload),
        },
      };
    case "UPDATE_TEAM_BRANDING":
      if (!state.team) return state;
      return {
        ...state,
        team: {
          ...state.team,
          companyLogo: action.payload.companyLogo !== undefined ? action.payload.companyLogo : state.team.companyLogo,
          companyName: action.payload.companyName !== undefined ? action.payload.companyName : state.team.companyName,
        },
      };
    case "HYDRATE":
      return { ...state, ...action.payload, isLoading: false };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = "@propertysnap_state";

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load persisted state on mount
  useEffect(() => {
    async function loadState() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          dispatch({ type: "HYDRATE", payload: parsed });
        } else {
          dispatch({ type: "SET_LOADING", payload: false });
        }
      } catch (error) {
        console.error("Failed to load state:", error);
        dispatch({ type: "SET_LOADING", payload: false });
      }
    }
    loadState();
  }, []);

  // Persist state on changes (debounced)
  useEffect(() => {
    if (state.isLoading) return;
    
    const saveState = async () => {
      try {
        const toSave = {
          isOnboarded: state.isOnboarded,
          isAuthenticated: state.isAuthenticated,
          user: state.user,
          properties: state.properties,
          team: state.team,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch (error) {
        console.error("Failed to save state:", error);
      }
    };

    const timeout = setTimeout(saveState, 500);
    return () => clearTimeout(timeout);
  }, [state.isOnboarded, state.isAuthenticated, state.user, state.properties, state.team, state.isLoading]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

// Helper functions
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function getDefaultRooms(): string[] {
  return [
    "Living Room",
    "Kitchen",
    "Bathroom",
    "Bedroom 1",
    "Bedroom 2",
    "Laundry",
    "Outdoor Areas",
  ];
}

export function createDefaultCheckpoints(rooms: string[]): Checkpoint[] {
  return rooms.map((room) => ({
    id: generateId(),
    roomName: room,
    title: `${room} - General`,
    landlordPhoto: null,
    tenantPhoto: null,
    moveOutPhoto: null,
    landlordCondition: null,
    tenantCondition: null,
    moveOutCondition: null,
    notes: "",
    timestamp: null,
    landlordPhotoTimestamp: null,
    tenantPhotoTimestamp: null,
    moveOutPhotoTimestamp: null,
  }));
}

// Team helper functions
export function getRoleLabel(role: TeamRole): string {
  switch (role) {
    case "admin":
      return "Administrator";
    case "manager":
      return "Property Manager";
    case "inspector":
      return "Inspector";
    case "viewer":
      return "View Only";
    default:
      return role;
  }
}

export function getRoleDescription(role: TeamRole): string {
  switch (role) {
    case "admin":
      return "Full access to all properties, team management, and billing";
    case "manager":
      return "Can manage assigned properties and conduct inspections";
    case "inspector":
      return "Can conduct inspections on assigned properties only";
    case "viewer":
      return "Can view inspection reports and archives only";
    default:
      return "";
  }
}

export function canManageTeam(role: TeamRole | undefined): boolean {
  return role === "admin";
}

export function canManageProperties(role: TeamRole | undefined): boolean {
  return role === "admin" || role === "manager";
}

export function canConductInspections(role: TeamRole | undefined): boolean {
  return role === "admin" || role === "manager" || role === "inspector";
}

export function canViewReports(role: TeamRole | undefined): boolean {
  return true; // All roles can view reports
}

// Filter properties based on user's access
export function getAccessibleProperties(
  properties: Property[],
  user: User | null,
  team: Team | null
): Property[] {
  if (!user) return [];
  
  // If no team or user is admin, return all properties
  if (!team || user.teamRole === "admin") {
    return properties;
  }
  
  // Find the team member
  const member = team.members.find((m) => m.id === user.id);
  if (!member) return [];
  
  // If member has access to all properties
  if (member.propertyAccess === "all") {
    return properties;
  }
  
  // Filter to only assigned properties
  return properties.filter((p) => member.assignedPropertyIds.includes(p.id));
}
