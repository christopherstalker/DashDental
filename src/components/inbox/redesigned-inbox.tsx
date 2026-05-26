"use client";

import { useRouter } from "next/navigation";
import {
  Archive,
  CalendarClock,
  Check,
  Clock3,
  FileText,
  History,
  Lock,
  MoreHorizontal,
  Search,
  Send,
  UserPlus,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { MessageDirection, Provider, SenderType } from "@/domain/types";

export interface InboxTeamMember {
  id: string;
  initials: string;
  name: string;
}

export interface InboxTemplate {
  id: string;
  body: string;
  category: string;
  title: string;
}

export interface InboxMessage {
  id: string;
  direction: MessageDirection;
  senderType: SenderType;
  text: string;
  sentAt: string;
}

export interface InboxNote {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface InboxHistoryItem {
  id: string;
  channel: Provider;
  date: string;
  preview: string;
}

export interface InboxThread {
  id: string;
  assignedInitials?: string;
  assignedName?: string;
  assignedTo?: string;
  channel: Provider;
  estimatedValue: number;
  history: InboxHistoryItem[];
  lastAppointment?: string;
  lastMessageAt: string;
  leadId: string;
  messages: InboxMessage[];
  notes: InboxNote[];
  patientName: string;
  patientPhone?: string;
  preview: string;
  returningPatient: boolean;
  responseState: "alert" | "info" | "ok" | "warm";
  snoozed: boolean;
  statusLabel: string;
  unreadCount: number;
}

function providerLabel(provider: Provider): string {
  const labels: Record<Provider, string> = {
    clinic_database: "Clinic DB",
    instagram: "Instagram",
    telegram: "Telegram",
    web_form: "Web",
    whatsapp: "WhatsApp",
  };

  return labels[provider];
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  return new Intl.DateTimeFormat("en-US", sameDay ? { hour: "2-digit", minute: "2-digit" } : { month: "short", day: "numeric" }).format(date);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function tomorrowIso(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return date.toISOString();
}

function badgeClass(state: InboxThread["responseState"]): string {
  return state === "alert"
    ? "ddr-badge-alert"
    : state === "warm"
      ? "ddr-badge-warm"
      : state === "ok"
        ? "ddr-badge-ok"
        : "ddr-badge-info";
}

function renderChannel(provider: Provider) {
  return (
    <span className={`ddr-channel-dot ${provider}`} aria-label={providerLabel(provider)}>
      {providerLabel(provider).slice(0, 2).toUpperCase()}
    </span>
  );
}

export function RedesignedInbox({
  currentUserId,
  initialThreads,
  teamMembers,
  templates,
}: {
  currentUserId?: string;
  initialThreads: InboxThread[];
  teamMembers: InboxTeamMember[];
  templates: InboxTemplate[];
}) {
  const router = useRouter();
  const [threads, setThreads] = useState(initialThreads);
  const [activeId, setActiveId] = useState(initialThreads[0]?.id ?? "");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "mine" | "snoozed" | "unread">("all");
  const [query, setQuery] = useState("");
  const [templateQuery, setTemplateQuery] = useState("");
  const [composerText, setComposerText] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const activeThread = threads.find((thread) => thread.id === activeId) ?? threads[0];
  const filteredThreads = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return threads.filter((thread) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "unread" && thread.unreadCount > 0) ||
        (filter === "snoozed" && thread.snoozed) ||
        (filter === "mine" && Boolean(currentUserId) && thread.assignedTo === currentUserId);
      const matchesQuery =
        !normalizedQuery ||
        thread.patientName.toLowerCase().includes(normalizedQuery) ||
        thread.preview.toLowerCase().includes(normalizedQuery) ||
        providerLabel(thread.channel).toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [currentUserId, filter, query, threads]);
  const selectedCount = selectedIds.size;
  const lastOutbound = activeThread?.messages
    .filter((message) => message.direction === "outbound")
    .at(-1);
  const visibleTemplates = templates.filter((template) => {
    const needle = templateQuery.trim().toLowerCase();

    return (
      !needle ||
      template.title.toLowerCase().includes(needle) ||
      template.body.toLowerCase().includes(needle) ||
      template.category.toLowerCase().includes(needle)
    );
  });

  function updateThread(id: string, updater: (thread: InboxThread) => InboxThread) {
    setThreads((current) => current.map((thread) => (thread.id === id ? updater(thread) : thread)));
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function postJson(url: string, payload: Record<string, unknown>) {
    const response = await fetch(url, {
      body: JSON.stringify(payload),
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      throw new Error(result.error ?? "The inbox action failed.");
    }

    return result;
  }

  async function runAction(label: string, action: () => Promise<void>) {
    setIsLoading(true);
    setStatus(null);
    try {
      await action();
      setStatus({ kind: "success", text: label });
      router.refresh();
    } catch (error) {
      setStatus({
        kind: "error",
        text: error instanceof Error ? error.message : "The inbox action failed.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleBulkAction(action: "archive" | "mark_booked" | "snooze") {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      return;
    }

    await runAction("Bulk action saved.", async () => {
      await postJson("/api/v1/conversations/bulk", {
        action,
        conversationIds: ids,
        note: action === "snooze" ? "Call back tomorrow" : undefined,
        remindAt: action === "snooze" ? tomorrowIso() : undefined,
      });
      setThreads((current) =>
        current.map((thread) =>
          ids.includes(thread.id)
            ? {
                ...thread,
                snoozed: action === "snooze" ? true : thread.snoozed,
                statusLabel: action === "mark_booked" ? "Booked" : thread.statusLabel,
              }
            : thread,
        ),
      );
      setSelectedIds(new Set());
    });
  }

  async function handleBulkAssign() {
    const ids = Array.from(selectedIds);
    if (!currentUserId || ids.length === 0) {
      return;
    }

    const member = teamMembers.find((item) => item.id === currentUserId);
    await runAction("Selected threads assigned.", async () => {
      await Promise.all(
        ids.map((id) =>
          postJson(`/api/v1/conversations/${id}/actions`, {
            assignedTo: currentUserId,
            intent: "assign",
          }),
        ),
      );
      setThreads((current) =>
        current.map((thread) =>
          ids.includes(thread.id)
            ? {
                ...thread,
                assignedInitials: member?.initials,
                assignedName: member?.name,
                assignedTo: currentUserId,
              }
            : thread,
        ),
      );
      setSelectedIds(new Set());
    });
  }

  async function handleAssign(assignedTo: string) {
    if (!activeThread) {
      return;
    }

    const member = teamMembers.find((item) => item.id === assignedTo);
    await runAction("Thread assignment updated.", async () => {
      await postJson(`/api/v1/conversations/${activeThread.id}/actions`, {
        assignedTo: assignedTo || undefined,
        intent: "assign",
      });
      updateThread(activeThread.id, (thread) => ({
        ...thread,
        assignedInitials: member?.initials,
        assignedName: member?.name,
        assignedTo: assignedTo || undefined,
      }));
    });
  }

  async function handleSnooze() {
    if (!activeThread) {
      return;
    }

    await runAction("Reminder set for tomorrow.", async () => {
      await postJson(`/api/v1/conversations/${activeThread.id}/actions`, {
        intent: "snooze",
        note: "Call back tomorrow",
        remindAt: tomorrowIso(),
      });
      updateThread(activeThread.id, (thread) => ({ ...thread, snoozed: true }));
    });
  }

  async function handleSend() {
    const trimmed = composerText.trim();
    if (!activeThread || !trimmed) {
      setStatus({ kind: "error", text: "Write a reply before sending." });
      return;
    }

    await runAction("Reply queued.", async () => {
      await postJson(`/api/v1/conversations/${activeThread.id}/messages`, { text: trimmed });
      updateThread(activeThread.id, (thread) => ({
        ...thread,
        messages: [
          ...thread.messages,
          {
            id: `local-${Date.now()}`,
            direction: "outbound",
            senderType: "manager",
            sentAt: new Date().toISOString(),
            text: trimmed,
          },
        ],
        preview: trimmed,
        unreadCount: 0,
      }));
      setComposerText("");
    });
  }

  async function handleRecentMessage(action: "edit" | "undo") {
    if (!activeThread || !lastOutbound) {
      setStatus({ kind: "error", text: "No recent outgoing message to update." });
      return;
    }

    const nextText =
      action === "edit"
        ? window.prompt("Edit last sent message", lastOutbound.text)?.trim()
        : undefined;
    if (action === "edit" && !nextText) {
      return;
    }

    await runAction(action === "edit" ? "Message updated." : "Last send undone.", async () => {
      const response = await fetch(
        `/api/v1/conversations/${activeThread.id}/messages/${lastOutbound.id}`,
        {
          body: action === "edit" ? JSON.stringify({ text: nextText }) : undefined,
          credentials: "same-origin",
          headers: action === "edit" ? { "content-type": "application/json" } : undefined,
          method: action === "edit" ? "PATCH" : "DELETE",
        },
      );
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Could not update the recent message.");
      }
      updateThread(activeThread.id, (thread) => ({
        ...thread,
        messages:
          action === "undo"
            ? thread.messages.filter((message) => message.id !== lastOutbound.id)
            : thread.messages.map((message) =>
                message.id === lastOutbound.id ? { ...message, text: nextText ?? message.text } : message,
              ),
      }));
      setMenuOpen(false);
    });
  }

  function insertTemplate(template: InboxTemplate) {
    if (!activeThread) {
      return;
    }

    setComposerText(template.body.replaceAll("{patientName}", activeThread.patientName));
    setTemplatesOpen(false);
  }

  return (
    <>
      <section className="ddr-inbox" aria-label="Unified patient inbox">
        <aside className="ddr-conversation-list">
          <div className="ddr-list-header">
            <div>
              <h1>Inbox</h1>
              <span className="ddr-badge ddr-badge-info">{threads.length} active threads</span>
            </div>
            <label className="ddr-input-shell ddr-search" htmlFor="inbox-search">
              <Search size={15} aria-hidden="true" />
              <input
                id="inbox-search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search patient or message"
                value={query}
              />
            </label>
            <div className="ddr-tabs" role="tablist" aria-label="Inbox filters">
              {[
                ["all", "All"],
                ["unread", "Unread"],
                ["snoozed", "Snoozed"],
                ["mine", "Mine"],
              ].map(([value, label]) => (
                <button
                  aria-pressed={filter === value}
                  key={value}
                  onClick={() => setFilter(value as typeof filter)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {selectedCount > 0 ? (
            <div className="ddr-bulk-toolbar" role="toolbar" aria-label="Bulk conversation actions">
              <span>{selectedCount} selected</span>
              <button
                className="ddr-button ddr-button-ghost"
                disabled={isLoading}
                onClick={() => void handleBulkAction("mark_booked")}
                type="button"
              >
                <Check size={14} />
                Mark booked
              </button>
              <button
                className="ddr-button ddr-button-ghost"
                disabled={isLoading}
                onClick={() => void handleBulkAction("snooze")}
                type="button"
              >
                <Clock3 size={14} />
                Snooze
              </button>
              <button
                className="ddr-button ddr-button-ghost"
                disabled={isLoading}
                onClick={() => void handleBulkAction("archive")}
                type="button"
              >
                <Archive size={14} />
                Archive
              </button>
              <button
                className="ddr-button ddr-button-ghost"
                disabled={isLoading || !currentUserId}
                onClick={() => void handleBulkAssign()}
                type="button"
              >
                <UserPlus size={14} />
                Assign
              </button>
            </div>
          ) : null}

          <div className="ddr-thread-list">
            {filteredThreads.length > 0 ? (
              filteredThreads.map((thread) => (
                <div
                  className={`ddr-row ${thread.responseState} ${
                    activeThread?.id === thread.id ? "active" : ""
                  } ${selectedIds.has(thread.id) ? "is-selected" : ""}`}
                  key={thread.id}
                  onClick={() => setActiveId(thread.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveId(thread.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <label className="ddr-row-checkbox" onClick={(event) => event.stopPropagation()}>
                    <input
                      aria-label={`Select ${thread.patientName}`}
                      checked={selectedIds.has(thread.id)}
                      onChange={() => toggleSelected(thread.id)}
                      type="checkbox"
                    />
                  </label>
                  {renderChannel(thread.channel)}
                  <div className="ddr-row-title">
                    <strong>{thread.patientName}</strong>
                    <span>{thread.preview}</span>
                    <span>{thread.assignedName ? `Assigned to ${thread.assignedName}` : "Unassigned"}</span>
                  </div>
                  <div className="ddr-row-meta">
                    <span className="ddr-row-time">{formatTime(thread.lastMessageAt)}</span>
                    {thread.unreadCount > 0 ? <span className="ddr-unread">{thread.unreadCount}</span> : null}
                    <span className="ddr-mini-avatar">{thread.assignedInitials ?? "?"}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="ddr-empty-state">No patient threads match this filter.</div>
            )}
          </div>
        </aside>

        {activeThread ? (
          <section className="ddr-thread-panel" aria-label={`${activeThread.patientName} thread`}>
            <header className="ddr-thread-header">
              <div className="ddr-thread-title">
                <h2>{activeThread.patientName}</h2>
                <span>
                  {providerLabel(activeThread.channel)} · {activeThread.patientPhone ?? "No phone"} · $
                  {activeThread.estimatedValue.toLocaleString("en-US")}
                </span>
              </div>
              <div className="ddr-thread-actions">
                <span className={`ddr-badge ${badgeClass(activeThread.responseState)}`}>
                  {activeThread.statusLabel}
                </span>
                <select
                  aria-label="Assign conversation"
                  className="ddr-assign-select"
                  disabled={isLoading}
                  onChange={(event) => void handleAssign(event.target.value)}
                  value={activeThread.assignedTo ?? ""}
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <button className="ddr-button ddr-button-ghost" disabled={isLoading} onClick={handleSnooze} type="button">
                  <CalendarClock size={15} />
                  Snooze
                </button>
                <button className="ddr-icon-button" onClick={() => setHistoryOpen(true)} title="Patient history" type="button">
                  <History size={16} />
                </button>
                <div className="ddr-menu-wrap">
                  <button className="ddr-icon-button" onClick={() => setMenuOpen((open) => !open)} title="More actions" type="button">
                    <MoreHorizontal size={16} />
                  </button>
                  {menuOpen ? (
                    <div className="ddr-thread-menu">
                      <button onClick={() => void handleRecentMessage("edit")} type="button">
                        Edit last sent
                      </button>
                      <button onClick={() => void handleRecentMessage("undo")} type="button">
                        Undo send
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </header>

            <div className="ddr-message-stream">
              {activeThread.messages.map((message) => (
                <div className={`ddr-message-bubble ${message.direction === "outbound" ? "outbound" : "inbound"}`} key={message.id}>
                  <span>{message.senderType === "patient" ? activeThread.patientName : "Clinic team"}</span>
                  <div>{message.text}</div>
                  <time>{formatTime(message.sentAt)}</time>
                </div>
              ))}
              <div className="ddr-internal-note">
                <span className="ddr-note-label">
                  <Lock size={13} />
                  Team-only internal note
                </span>
                {activeThread.notes[0]?.body ?? "No internal note yet. Add one during handoff so the next receptionist has context."}
              </div>
            </div>

            <footer className="ddr-composer">
              {status ? <span className={`ddr-inline-status ${status.kind}`}>{status.text}</span> : null}
              <div className="ddr-composer-row">
                <button className="ddr-button ddr-button-ghost" onClick={() => setTemplatesOpen(true)} type="button">
                  <FileText size={15} />
                  Templates
                </button>
                <label className="ddr-field" htmlFor="reply-text">
                  <textarea
                    id="reply-text"
                    onChange={(event) => setComposerText(event.target.value)}
                    placeholder={`Reply to ${activeThread.patientName}`}
                    value={composerText}
                  />
                </label>
                <button className="ddr-button ddr-button-primary" disabled={isLoading} onClick={() => void handleSend()} type="button">
                  <Send size={15} />
                  Send
                </button>
              </div>
            </footer>
          </section>
        ) : (
          <section className="ddr-empty-state">Select a patient thread to start.</section>
        )}
      </section>

      {historyOpen && activeThread ? (
        <>
          <div className="ddr-drawer-backdrop" onClick={() => setHistoryOpen(false)} />
          <aside className="ddr-history-drawer" aria-label="Patient history">
            <div className="ddr-drawer-header">
              <h2>Patient history</h2>
              <button className="ddr-icon-button" onClick={() => setHistoryOpen(false)} type="button">
                <X size={16} />
              </button>
            </div>
            <div className="ddr-history-body">
              <article className="ddr-card ddr-profile-card">
                <strong>{activeThread.patientName}</strong>
                <span>{activeThread.patientPhone ?? "Phone not provided"}</span>
                <div className="ddr-channel-strip">{renderChannel(activeThread.channel)}</div>
                {activeThread.returningPatient ? (
                  <span className="ddr-badge ddr-badge-ok">Returning patient</span>
                ) : (
                  <span className="ddr-badge ddr-badge-info">First known inquiry</span>
                )}
                <span>Last appointment: {activeThread.lastAppointment ? formatDate(activeThread.lastAppointment) : "Unknown"}</span>
              </article>

              <div className="ddr-timeline">
                {activeThread.history.map((item) => (
                  <div className="ddr-timeline-item" key={item.id}>
                    <strong>{formatDate(item.date)}</strong>
                    <span>
                      {providerLabel(item.channel)} · {item.preview}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </>
      ) : null}

      {templatesOpen ? (
        <>
          <div className="ddr-modal-backdrop" onClick={() => setTemplatesOpen(false)} />
          <section className="ddr-card ddr-modal" aria-label="Saved reply templates">
            <div className="ddr-modal-header">
              <h2>Saved reply templates</h2>
              <button className="ddr-icon-button" onClick={() => setTemplatesOpen(false)} type="button">
                <X size={16} />
              </button>
            </div>
            <div className="ddr-modal-search">
              <label className="ddr-input-shell ddr-search" htmlFor="template-search">
                <Search size={15} aria-hidden="true" />
                <input
                  id="template-search"
                  onChange={(event) => setTemplateQuery(event.target.value)}
                  placeholder="Search by keyword"
                  value={templateQuery}
                />
              </label>
            </div>
            <div className="ddr-template-grid">
              {visibleTemplates.length > 0 ? (
                visibleTemplates.map((template) => (
                  <button className="ddr-template-card" key={template.id} onClick={() => insertTemplate(template)} type="button">
                    <strong>{template.title}</strong>
                    <span>{template.body}</span>
                    <span className="ddr-badge ddr-badge-info">{template.category}</span>
                  </button>
                ))
              ) : (
                <div className="ddr-empty-state">No templates match this search.</div>
              )}
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
