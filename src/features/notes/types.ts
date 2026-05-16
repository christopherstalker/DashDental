import type { Role, TeamNote } from "@/domain/types";

export interface TeamNoteView extends TeamNote {
  author: {
    userId: string;
    membershipId: string;
    name: string;
    email: string;
    avatar: string;
    role: Role;
  };
  context: {
    label: string;
    href?: string;
  };
}

export interface TeamNotesApiResponse {
  notes: TeamNoteView[];
  serverTime: string;
}
