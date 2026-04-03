import { useState } from "react";

const COLORS = {
  primary: "#9C27B0",
  indigo: "#3F51B5",
  background: "#F8F4FA",
  card: "#FFFFFF",
  foreground: "#030712",
  muted: "#EDE4F0",
  mutedFg: "#5C6370",
  border: "#E5E5E5",
  green: "#16a34a",
  amber: "#d97706",
  blue: "#2563eb",
  red: "#dc2626",
  purple: "#7c3aed",
};

const DOMAIN_COLORS = {
  who: { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", icon: "👤", gradient: "linear-gradient(135deg, #7c3aed, #9333ea)" },
  what: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", icon: "📚", gradient: "linear-gradient(135deg, #16a34a, #22c55e)" },
  when: { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", icon: "📅", gradient: "linear-gradient(135deg, #2563eb, #3b82f6)" },
  how: { color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: "💰", gradient: "linear-gradient(135deg, #d97706, #f59e0b)" },
  chat: { color: "#5C6370", bg: "#f3f4f6", border: "#d1d5db", icon: "💬", gradient: "linear-gradient(135deg, #6b7280, #9ca3af)" },
};

const DOMAINS = [
  {
    key: "who",
    question: "Who?",
    subtitle: "Who are the parties involved?",
    tSide: {
      label: "Learner Roster",
      location: "Learners (sidebar)",
      items: [
        { label: "Learner profiles (name, email, avatar)", collection: "students" },
        { label: "Enrollment status (active, trial, paused, completed, churned)", collection: "students" },
        { label: "Assigned teacher", collection: "students" },
        { label: "Private notes about learner", collection: "students" },
        { label: "Status filter & search", collection: "students" },
      ],
    },
    sSide: {
      label: "My Tutor",
      location: "Tutors (sidebar)",
      items: [
        { label: "Assigned teacher profile", collection: "teacherProfiles" },
        { label: "Teacher bio, qualifications, photo", collection: "teacherProfiles" },
        { label: "Browse other tutors", collection: "teacherProfiles" },
        { label: "Pinned reviews", collection: "reviews" },
      ],
    },
    function: "Identifies the parties connected to the user and their relationship. Teacher manages many learners; learner sees their one teacher.",
  },
  {
    key: "what",
    question: "What?",
    subtitle: "What is the product or service?",
    tSide: {
      label: "Course & Curriculum Management",
      location: "Courses (sidebar) + Learner Profile → Tab 1 & 2",
      items: [
        { label: "Create/edit courses, levels, units, sessions", collection: "courses / levels / units / sessions" },
        { label: "Assign units to learners", collection: "studentProgress" },
        { label: "View learner progress (hours, sessions, %)", collection: "studentProgress" },
        { label: "Post-session feedback", collection: "sessionInstances" },
        { label: "Homework assignment & tracking", collection: "homeworkSubmissions" },
        { label: "Evaluations & assessments", collection: "assessmentReports" },
        { label: "Petland rewards (XP/HP, manual adjustments)", collection: "studentRewards" },
      ],
    },
    sSide: {
      label: "My Learning",
      location: "Courses (sidebar) → My Units, Browse, Feedback, Evaluations",
      items: [
        { label: "Assigned units & session list", collection: "studentProgress" },
        { label: "Browse available curriculum", collection: "units / sessions" },
        { label: "View teacher feedback per session", collection: "sessionInstances" },
        { label: "View/submit homework", collection: "homeworkSubmissions" },
        { label: "View evaluations & reports", collection: "assessmentReports" },
        { label: "Petland rewards (XP/HP — read only)", collection: "studentRewards" },
        { label: "Progress overview (hours, units completed, %)", collection: "studentProgress" },
      ],
    },
    function: "Defines the product being delivered — the curriculum, its structure, and all pedagogical artifacts. Progress, feedback, homework, and rewards are all outcomes of engaging with the product.",
  },
  {
    key: "when",
    question: "When?",
    subtitle: "When does it happen?",
    tSide: {
      label: "Session Scheduling & Lifecycle",
      location: "Calendar (sidebar) + Learner Profile → Tab 2",
      items: [
        { label: "Set availability slots", collection: "availability" },
        { label: "Book sessions for learners", collection: "sessionInstances" },
        { label: "View calendar (upcoming, past)", collection: "sessionInstances" },
        { label: "Mark session complete", collection: "sessionInstances", note: "triggers What (progress) & How (credit)" },
        { label: "Handle reschedule/cancel requests", collection: "approvalRequests" },
        { label: "Approve new student bookings", collection: "approvalRequests" },
      ],
    },
    sSide: {
      label: "My Schedule",
      location: "Calendar (sidebar) → Schedule, Availability",
      items: [
        { label: "Browse available time slots", collection: "availability" },
        { label: "Book a session", collection: "sessionInstances" },
        { label: "View upcoming sessions", collection: "sessionInstances" },
        { label: "View past sessions", collection: "sessionInstances" },
        { label: "Reschedule a session", collection: "sessionInstances / approvalRequests" },
        { label: "Cancel a session", collection: "sessionInstances / approvalRequests" },
      ],
    },
    function: "Manages the scheduling lifecycle of booked sessions — from availability through booking, attendance, completion, and cancellation. Completion is the trigger point: it lives here but ripples into What (progress updates) and How (credit settlement).",
  },
  {
    key: "how",
    question: "How?",
    subtitle: "How is it paid for?",
    tSide: {
      label: "Financial Management",
      location: "Learner Profile → Tab 3 (Packages & Credits) + Tab 4 (Payments)",
      items: [
        { label: "Create/edit packages (hours, price, expiry)", collection: "studentPackages" },
        { label: "Pause / unpause packages", collection: "studentPackages" },
        { label: "Extend expiration dates", collection: "studentPackages" },
        { label: "View credit ledger (uncommitted / committed / completed)", collection: "studentCredit" },
        { label: "Record payments (pre-Stripe)", collection: "payments" },
        { label: "View payment history & invoices", collection: "payments" },
        { label: "Expiration warnings (dashboard alert)", collection: "studentPackages" },
      ],
    },
    sSide: {
      label: "My Package",
      location: "Courses (sidebar) → My Package + Dashboard (summary card)",
      items: [
        { label: "Package balance & hours remaining", collection: "studentPackages" },
        { label: "Expiration date & days remaining", collection: "studentPackages" },
        { label: "Usage history (hours spent per session)", collection: "studentCredit / sessionInstances" },
        { label: "Pause status & reason", collection: "studentPackages" },
        { label: "Expiration warning banner", collection: "studentPackages" },
        { label: "Purchase / renew package", collection: "studentPackages", note: "Stripe in Phase 4" },
      ],
    },
    function: "Tracks the financial lifecycle — packages purchased, credit consumed per session, payments recorded. The learner sees balance and usage; the teacher sees the full ledger. Packages live under Courses on the S-side because they are purchased per course.",
  },
];

const CROSS_CUTTING = {
  key: "chat",
  question: "—",
  subtitle: "Cross-cutting communication utility",
  tSide: {
    label: "Teacher Chat",
    location: "Chat (sidebar) → split view",
    items: [
      { label: "Direct messages with learners", collection: "messages" },
      { label: "System notifications (approvals, assignments)", collection: "messages" },
      { label: "Unread badges per channel", collection: "messages" },
    ],
  },
  sSide: {
    label: "Student Chat",
    location: "Chat (sidebar) → Notifications, Communications",
    items: [
      { label: "Direct messages with teacher", collection: "messages" },
      { label: "System notifications (assignments, approvals)", collection: "messages" },
      { label: "Unread badges per channel", collection: "messages" },
    ],
  },
  function: "Communication layer that spans all four domains. Not a domain itself — it's the channel through which domain events are communicated (unit assigned, session booked, payment needed, etc.).",
};

const CollectionTag = ({ name }) => (
  <span style={{ fontSize: 9, fontFamily: "monospace", color: COLORS.mutedFg, background: COLORS.muted, padding: "1px 5px", borderRadius: 3, whiteSpace: "nowrap" }}>
    {name}
  </span>
);

const DomainRow = ({ domain, isExpanded, onToggle, highlight }) => {
  const dc = DOMAIN_COLORS[domain.key];
  const dimmed = highlight && highlight !== domain.key;
  return (
    <div
      style={{
        background: COLORS.card,
        borderRadius: 14,
        border: `1px solid ${dimmed ? COLORS.border : dc.border}`,
        borderLeft: `5px solid ${dc.color}`,
        marginBottom: 10,
        overflow: "hidden",
        opacity: dimmed ? 0.25 : 1,
        transition: "all 0.25s ease",
      }}
    >
      {/* Header */}
      <div
        onClick={onToggle}
        style={{
          display: "grid",
          gridTemplateColumns: "140px 1fr 1fr 1.2fr",
          alignItems: "center",
          padding: "14px 18px",
          cursor: "pointer",
          gap: 16,
        }}
      >
        {/* Question */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: dc.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#fff", fontWeight: 800, flexShrink: 0 }}>
            {dc.icon}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: dc.color }}>{domain.question}</div>
            <div style={{ fontSize: 10, color: COLORS.mutedFg }}>{domain.subtitle}</div>
          </div>
        </div>

        {/* T-Side summary */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.foreground }}>{domain.tSide.label}</div>
          <div style={{ fontSize: 10, color: COLORS.mutedFg }}>{domain.tSide.location}</div>
        </div>

        {/* S-Side summary */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.foreground }}>{domain.sSide.label}</div>
          <div style={{ fontSize: 10, color: COLORS.mutedFg }}>{domain.sSide.location}</div>
        </div>

        {/* Function summary */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 11, color: COLORS.mutedFg, lineHeight: 1.4, paddingRight: 12 }}>
            {domain.function.split(".")[0]}.
          </div>
          <span style={{ fontSize: 12, color: dc.color, fontWeight: 600, flexShrink: 0 }}>{isExpanded ? "▼" : "▶"}</span>
        </div>
      </div>

      {/* Expanded Detail */}
      {isExpanded && (
        <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "16px 18px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr 1.2fr", gap: 16 }}>
            {/* Question column — empty */}
            <div />

            {/* T-Side detail */}
            <div style={{ background: dc.bg, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: dc.color, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Teacher Side</div>
              {domain.tSide.items.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "4px 0", borderTop: i > 0 ? `1px solid ${dc.border}` : "none" }}>
                  <span style={{ color: dc.color, fontSize: 8, marginTop: 4 }}>●</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, lineHeight: 1.4 }}>
                      {item.label}
                      {item.note && <span style={{ fontSize: 9, color: dc.color, fontStyle: "italic", marginLeft: 4 }}>({item.note})</span>}
                    </div>
                    <CollectionTag name={item.collection} />
                  </div>
                </div>
              ))}
            </div>

            {/* S-Side detail */}
            <div style={{ background: dc.bg, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: dc.color, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Student Side</div>
              {domain.sSide.items.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "4px 0", borderTop: i > 0 ? `1px solid ${dc.border}` : "none" }}>
                  <span style={{ color: dc.color, fontSize: 8, marginTop: 4 }}>●</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, lineHeight: 1.4 }}>
                      {item.label}
                      {item.note && <span style={{ fontSize: 9, color: dc.color, fontStyle: "italic", marginLeft: 4 }}>({item.note})</span>}
                    </div>
                    <CollectionTag name={item.collection} />
                  </div>
                </div>
              ))}
            </div>

            {/* Function detail */}
            <div style={{ padding: "0 4px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.mutedFg, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Function</div>
              <div style={{ fontSize: 12, lineHeight: 1.7, color: COLORS.foreground }}>{domain.function}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function FourDomainChart() {
  const [expanded, setExpanded] = useState(["who", "what", "when", "how"]);
  const [highlight, setHighlight] = useState(null);

  const toggle = (key) => {
    setExpanded((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  return (
    <div style={{ background: COLORS.background, minHeight: "100vh", padding: "24px 24px 48px", fontFamily: "'Segoe UI', -apple-system, sans-serif", color: COLORS.foreground }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, background: `linear-gradient(135deg, ${COLORS.indigo}, ${COLORS.primary})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          LessonLink · Four Domain Architecture
        </h1>
        <p style={{ color: COLORS.mutedFg, fontSize: 13, margin: "6px 0 0" }}>
          The organizing principles behind every UI decision
        </p>
      </div>

      {/* Domain Filter Pills */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, margin: "16px 0 24px" }}>
        <button
          onClick={() => setHighlight(null)}
          style={{ padding: "5px 14px", borderRadius: 8, border: `1px solid ${!highlight ? COLORS.primary : COLORS.border}`, background: !highlight ? COLORS.primary : "transparent", color: !highlight ? "#fff" : COLORS.mutedFg, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
        >
          Show All
        </button>
        {DOMAINS.map((d) => {
          const dc = DOMAIN_COLORS[d.key];
          const active = highlight === d.key;
          return (
            <button
              key={d.key}
              onClick={() => setHighlight(active ? null : d.key)}
              style={{ padding: "5px 14px", borderRadius: 8, border: `1px solid ${active ? dc.color : COLORS.border}`, background: active ? dc.bg : "transparent", color: active ? dc.color : COLORS.mutedFg, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
            >
              {dc.icon} {d.question} {d.subtitle.split("?")[0].split(" ").pop()}
            </button>
          );
        })}
      </div>

      {/* Column Headers */}
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr 1.2fr", gap: 16, padding: "0 18px 8px", borderBottom: `2px solid ${COLORS.border}`, marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.mutedFg, textTransform: "uppercase", letterSpacing: 0.8 }}>Domain</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.mutedFg, textTransform: "uppercase", letterSpacing: 0.8 }}>👨‍🏫 Teacher Side</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.mutedFg, textTransform: "uppercase", letterSpacing: 0.8 }}>👨‍🎓 Student Side</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.mutedFg, textTransform: "uppercase", letterSpacing: 0.8 }}>Function</div>
        </div>

        {/* Domain Rows */}
        {DOMAINS.map((d) => (
          <DomainRow
            key={d.key}
            domain={d}
            isExpanded={expanded.includes(d.key)}
            onToggle={() => toggle(d.key)}
            highlight={highlight}
          />
        ))}

        {/* Cross-cutting: Chat */}
        <div style={{ marginTop: 8, borderTop: `2px dashed ${COLORS.border}`, paddingTop: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.mutedFg, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, textAlign: "center" }}>
            Cross-Cutting Utility (not a domain)
          </div>
          <DomainRow
            domain={CROSS_CUTTING}
            isExpanded={expanded.includes("chat")}
            onToggle={() => toggle("chat")}
            highlight={highlight}
          />
        </div>
      </div>

      {/* Ripple Effects */}
      <div style={{ maxWidth: 1100, margin: "24px auto 0", background: COLORS.card, borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: "20px 24px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, background: `linear-gradient(135deg, ${COLORS.indigo}, ${COLORS.primary})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Domain Interactions — How They Ripple
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div style={{ padding: 14, background: DOMAIN_COLORS.when.bg, borderRadius: 10, border: `1px solid ${DOMAIN_COLORS.when.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: DOMAIN_COLORS.when.color, marginBottom: 6 }}>📅 Session Completed (When)</div>
            <div style={{ fontSize: 11, lineHeight: 1.7 }}>
              <div>→ <span style={{ color: DOMAIN_COLORS.what.color, fontWeight: 600 }}>What:</span> sessionsCompleted +1, totalHours updated</div>
              <div>→ <span style={{ color: DOMAIN_COLORS.how.color, fontWeight: 600 }}>How:</span> committedHours → completedHours</div>
              <div>→ <span style={{ color: DOMAIN_COLORS.chat.color, fontWeight: 600 }}>Chat:</span> notification sent to learner</div>
            </div>
          </div>
          <div style={{ padding: 14, background: DOMAIN_COLORS.how.bg, borderRadius: 10, border: `1px solid ${DOMAIN_COLORS.how.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: DOMAIN_COLORS.how.color, marginBottom: 6 }}>💰 Package Purchased (How)</div>
            <div style={{ fontSize: 11, lineHeight: 1.7 }}>
              <div>→ <span style={{ color: DOMAIN_COLORS.how.color, fontWeight: 600 }}>How:</span> studentCredit created (uncommittedHours)</div>
              <div>→ <span style={{ color: DOMAIN_COLORS.when.color, fontWeight: 600 }}>When:</span> learner can now book sessions</div>
              <div>→ <span style={{ color: DOMAIN_COLORS.chat.color, fontWeight: 600 }}>Chat:</span> confirmation notification</div>
            </div>
          </div>
          <div style={{ padding: 14, background: DOMAIN_COLORS.what.bg, borderRadius: 10, border: `1px solid ${DOMAIN_COLORS.what.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: DOMAIN_COLORS.what.color, marginBottom: 6 }}>📚 Unit Assigned (What)</div>
            <div style={{ fontSize: 11, lineHeight: 1.7 }}>
              <div>→ <span style={{ color: DOMAIN_COLORS.what.color, fontWeight: 600 }}>What:</span> studentProgress created</div>
              <div>→ <span style={{ color: DOMAIN_COLORS.how.color, fontWeight: 600 }}>How:</span> credit reserved (uncommitted → committed)</div>
              <div>→ <span style={{ color: DOMAIN_COLORS.chat.color, fontWeight: 600 }}>Chat:</span> "Unit assigned" notification to learner</div>
            </div>
          </div>
        </div>
      </div>

      {/* Principle */}
      <div style={{ maxWidth: 1100, margin: "16px auto 0", textAlign: "center", padding: "16px 24px" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.foreground, marginBottom: 4 }}>
          Actions live in one domain. Effects ripple to others.
        </div>
        <div style={{ fontSize: 12, color: COLORS.mutedFg }}>
          Chat is the nervous system — it carries signals between domains but owns no data of its own.
        </div>
      </div>
    </div>
  );
}
