export const supportEmail = "support@dashdental.space";
export const securityEmail = "security@dashdental.space";
export const privacyEmail = "privacy@dashdental.space";

export const primaryCta = "Book 15-min demo";
export const secondaryCta = "View sample dashboard";
export const pilotCta = "Create account";

export const trustRow =
  "Lead intake only | Human-reviewed AI drafts | No medical records required | Guided launch available";

export const ownerDashboardMetrics = [
  {
    label: "Money at risk today",
    value: "$7.8k",
    detail: "Estimated treatment opportunity, not a booking promise",
  },
  {
    label: "Unanswered patients",
    value: "12",
    detail: "Waiting across patient channels",
  },
  {
    label: "Avg first response time",
    value: "38m",
    detail: "Above the clinic target",
  },
  {
    label: "Recovered conversations",
    value: "21",
    detail: "Marked as booked or protected this month",
  },
] as const;

export const sampleConversations = [
  {
    initials: "EP",
    name: "Eva P.",
    channel: "WhatsApp",
    intent: "Emergency tooth pain",
    urgency: "Critical",
    waiting: "22 min waiting",
    value: "$420",
    action: "Offer the nearest emergency slot and ask for callback number.",
    draft:
      "Hi Eva, we can help. We have an emergency slot today. Can you confirm your phone number so our front desk can call you now?",
  },
  {
    initials: "MK",
    name: "Mila K.",
    channel: "Instagram",
    intent: "Veneers pricing",
    urgency: "High intent",
    waiting: "1 h 14 min waiting",
    value: "$1,200",
    action: "Move from DM to consult booking with two available times.",
    draft:
      "Hi Mila, veneer pricing depends on the smile plan. We can book a short consult and give you options. Would today 16:30 or tomorrow 10:00 work?",
  },
  {
    initials: "ON",
    name: "Oleh N.",
    channel: "Website form",
    intent: "Implant consult",
    urgency: "High value",
    waiting: "2 h waiting",
    value: "$1,500",
    action: "Call back before lunch and confirm implant consultation interest.",
    draft:
      "Hi Oleh, thanks for asking about implants. Our coordinator can call you today to understand your case and offer consultation times.",
  },
  {
    initials: "SL",
    name: "Sara L.",
    channel: "Telegram",
    intent: "Whitening inquiry",
    urgency: "Follow-up",
    waiting: "46 min waiting",
    value: "$180",
    action: "Share safe whitening booking path and ask preferred day.",
    draft:
      "Hi Sara, we can help with whitening options. Which day is better for a quick visit this week?",
  },
] as const;

export const workflowSteps = [
  {
    title: "Capture",
    text:
      "Patient messages arrive from WhatsApp, Instagram, Telegram, and website forms.",
  },
  {
    title: "Prioritize",
    text:
      "Dash Dental highlights unanswered, high-intent, and time-sensitive conversations.",
  },
  {
    title: "Recover",
    text:
      "Your receptionist reviews the suggested next action, replies, and moves the patient toward a booking.",
  },
] as const;

export const integrationRows = [
  {
    channel: "WhatsApp",
    captures: "High-intent direct inquiries, callbacks, emergency and treatment questions",
    setup: "Guided setup",
    status: "Requires approval",
    notes: "Best for direct patient inquiries. Setup may require WhatsApp Business and Meta access.",
  },
  {
    channel: "Instagram",
    captures: "Cosmetic DMs for veneers, whitening, smile design, pricing, and booking",
    setup: "Guided setup",
    status: "Requires approval",
    notes: "Useful for cosmetic demand. Meta app review and page permissions may be required.",
  },
  {
    channel: "Telegram",
    captures: "Telegram patient messages and follow-up threads",
    setup: "Guided setup",
    status: "Guided setup",
    notes: "Useful in markets where patients prefer Telegram messaging. Start with a guided test before live patient routing.",
  },
  {
    channel: "Website forms",
    captures: "Booking requests, treatment questions, callbacks, and campaign landing pages",
    setup: "Guided setup",
    status: "Guided setup",
    notes: "Capture existing website demand through a signed form endpoint after setup and test submissions are confirmed.",
  },
  {
    channel: "Clinic database",
    captures: "Read-only lead context after clinic approval",
    setup: "Approval flow",
    status: "Guided setup",
    notes: "Designed as read-only sync with a data-access approval step before use.",
  },
  {
    channel: "Phone/call notes",
    captures: "Manual notes from calls and front-desk handoffs",
    setup: "Manual workflow",
    status: "Planned",
    notes: "Use team notes to keep recovery context without storing unnecessary clinical history.",
  },
] as const;

export const pricingFaqs = [
  {
    question: "Do we need to replace our CRM?",
    answer:
      "No. Dash Dental sits on top of existing patient channels and recovery workflows. It is focused on missed-message recovery, not CRM migration.",
  },
  {
    question: "Can we start with only WhatsApp or Instagram?",
    answer:
      "Yes. Most clinics should start with one channel, prove the recovery workflow, then add the next channel once the team is comfortable.",
  },
  {
    question: "Does AI send messages automatically?",
    answer:
      "No. AI drafts and summaries are assistive. Your team reviews and sends patient communications.",
  },
  {
    question: "How is money at risk calculated?",
    answer:
      "It uses configured treatment-value assumptions and conversation context. It is a planning estimate, not a booking or treatment-value promise.",
  },
  {
    question: "Is this a full EHR?",
    answer:
      "No. Dash Dental is for lead intake and recovery workflows. Do not use it to store unnecessary clinical history.",
  },
  {
    question: "What happens after launch?",
    answer:
      "You can continue on the current plan, request help choosing the right plan, or disconnect channels.",
  },
  {
    question: "Can we export or delete data?",
    answer:
      "Where supported, export and deletion paths are available. For data requests, contact privacy@dashdental.space.",
  },
  {
    question: "How long does setup take?",
    answer:
      "Launch should start with one channel and a guided setup checklist. Exact timing depends on channel access, approvals, and clinic availability.",
  },
] as const;

export const pilotTimeline = [
  {
    period: "Day 1",
    title: "Connect one channel",
    text: "Choose WhatsApp, Instagram, Telegram, or website forms and confirm treatment-value assumptions.",
  },
  {
    period: "Days 2-3",
    title: "Clear the recovery queue",
    text: "Front desk starts reviewing unanswered conversations, suggested next actions, and reply drafts.",
  },
  {
    period: "Week 1",
    title: "Owner reviews risk",
    text: "Owner checks response time, money at risk, and which channels create late replies.",
  },
  {
    period: "Week 2",
    title: "Compare recovered consults",
    text: "Team reviews conversations marked booked, protected, lost, or needing follow-up.",
  },
] as const;
