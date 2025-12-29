import React, { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Types
export type UserType = "landlord" | "tenant" | "manager" | null;
export type ConditionRating = "excellent" | "good" | "fair" | "poor" | "damaged";
export type PropertyType = "apartment" | "house" | "townhouse" | "studio";
export type InspectionStatus = "pending" | "completed" | "archived";
export type InspectionType = "move-in" | "move-out";

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
  timestamp: string | null;
}

export interface Inspection {
  id: string;
  propertyId: string;
  type: InspectionType;
  status: InspectionStatus;
  createdAt: string;
  completedAt: string | null;
  landlordSignature: string | null;
  tenantSignature: string | null;
  checkpoints: Checkpoint[];
}

export interface Property {
  id: string;
  address: string;
  propertyType: PropertyType;
  bedrooms: number;
  bathrooms: number;
  photo: string | null;
  tenantId: string | null;
  tenantName: string | null;
  tenantEmail: string | null;
  inspections: Inspection[];
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  userType: UserType;
  subscriptionTier: "free" | "per-inspection" | "unlimited" | "manager";
  inspectionsUsed: number;
}

interface AppState {
  isOnboarded: boolean;
  isAuthenticated: boolean;
  user: User | null;
  properties: Property[];
  activeInspection: Inspection | null;
  isLoading: boolean;
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
  | { type: "HYDRATE"; payload: Partial<AppState> };

const initialState: AppState = {
  isOnboarded: false,
  isAuthenticated: false,
  user: null,
  properties: [],
  activeInspection: null,
  isLoading: true,
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
      return { ...state, user: null, isAuthenticated: false, properties: [], activeInspection: null };
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
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch (error) {
        console.error("Failed to save state:", error);
      }
    };

    const timeout = setTimeout(saveState, 500);
    return () => clearTimeout(timeout);
  }, [state.isOnboarded, state.isAuthenticated, state.user, state.properties, state.isLoading]);

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
  }));
}
