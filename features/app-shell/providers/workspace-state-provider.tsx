"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from "react";
import type { LeadStatus } from "@/domain/types";
import type { ClientSession } from "@/server/session";
import {
  applyThemeMode,
  getPreferredThemeMode,
  type ThemeMode,
} from "@/features/theme/theme-store";

type DashboardRange = "today" | "7d" | "all";
type InboxDensity = "comfortable" | "compact";

interface WorkspaceUiState {
  theme: ThemeMode;
  dashboardRange: DashboardRange;
  inboxDensity: InboxDensity;
  leadFilter: LeadStatus | "all";
  selectedConversationId: string | null;
  onboardingStepId: string | null;
  session: ClientSession | null;
}

type WorkspaceUiAction =
  | { type: "theme/set"; value: ThemeMode }
  | { type: "dashboard-range/set"; value: DashboardRange }
  | { type: "inbox-density/set"; value: InboxDensity }
  | { type: "lead-filter/set"; value: LeadStatus | "all" }
  | { type: "conversation/select"; value: string | null }
  | { type: "onboarding/select"; value: string | null };

interface WorkspaceStateContextValue {
  state: WorkspaceUiState;
  dispatch: React.Dispatch<WorkspaceUiAction>;
}

const WorkspaceStateContext = createContext<WorkspaceStateContextValue | null>(
  null,
);

function reducer(
  state: WorkspaceUiState,
  action: WorkspaceUiAction,
): WorkspaceUiState {
  switch (action.type) {
    case "theme/set":
      return { ...state, theme: action.value };
    case "dashboard-range/set":
      return { ...state, dashboardRange: action.value };
    case "inbox-density/set":
      return { ...state, inboxDensity: action.value };
    case "lead-filter/set":
      return { ...state, leadFilter: action.value };
    case "conversation/select":
      return { ...state, selectedConversationId: action.value };
    case "onboarding/select":
      return { ...state, onboardingStepId: action.value };
    default:
      return state;
  }
}

export function WorkspaceStateProvider({
  children,
  session,
}: {
  children: ReactNode;
  session: ClientSession | null;
}) {
  const [state, dispatch] = useReducer(
    reducer,
    session,
    (initialSession): WorkspaceUiState => ({
      theme: getPreferredThemeMode(),
      dashboardRange: "today",
      inboxDensity: "comfortable",
      leadFilter: "all",
      selectedConversationId: null,
      onboardingStepId: null,
      session: initialSession,
    }),
  );

  useEffect(() => {
    applyThemeMode(state.theme);
  }, [state.theme]);

  return (
    <WorkspaceStateContext.Provider value={{ state, dispatch }}>
      {children}
    </WorkspaceStateContext.Provider>
  );
}

export function useWorkspaceState() {
  const context = useContext(WorkspaceStateContext);
  if (!context) {
    throw new Error("useWorkspaceState must be used within WorkspaceStateProvider.");
  }

  return context;
}
