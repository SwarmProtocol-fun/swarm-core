/**
 * ClawFlows Workflow Catalog
 *
 * Static catalog of community workflows from https://github.com/nikilster/clawflows
 * Displayed in the Swarm dashboard as a browsable workflow library.
 */

export interface ClawFlow {
  slug: string;
  label: string;
  description: string;
  schedule?: string;
  sourceUrl: string;
}

export interface ClawFlowCategory {
  id: string;
  emoji: string;
  label: string;
  flows: ClawFlow[];
}

const BASE = "https://github.com/nikilster/clawflows/blob/main/workflows/available/community";

export const CLAWFLOW_CATEGORIES: ClawFlowCategory[] = [
  {
    id: "smart-home", emoji: "🏠", label: "Smart Home",
    flows: [
      { slug: "activate-sleep-mode",    label: "Sleep Mode",    description: "Every light off, music stopped, thermostat down, fan on.",       schedule: "10pm",        sourceUrl: `${BASE}/activate-sleep-mode/WORKFLOW.md` },
      { slug: "activate-night-mode",    label: "Night Mode",    description: "Dim lights, lock doors, enable security cameras.",                schedule: "9pm",         sourceUrl: `${BASE}/activate-night-mode/WORKFLOW.md` },
      { slug: "activate-morning-mode",  label: "Morning Mode",  description: "Lights on, coffee started, blinds open, music playing.",         schedule: "7am",         sourceUrl: `${BASE}/activate-morning-mode/WORKFLOW.md` },
      { slug: "activate-focus-mode",    label: "Focus Mode",    description: "Silence notifications, close distractions, set DND.",             schedule: "on-demand",   sourceUrl: `${BASE}/activate-focus-mode/WORKFLOW.md` },
      { slug: "activate-away-mode",     label: "Away Mode",     description: "Lock everything, set thermostat, enable cameras.",                schedule: "on-demand",   sourceUrl: `${BASE}/activate-away-mode/WORKFLOW.md` },
    ],
  },
  {
    id: "daily-routines", emoji: "☀️", label: "Daily Routines",
    flows: [
      { slug: "send-morning-inspiration", label: "Morning Inspiration", description: "Start your day with a motivational quote and intention.", schedule: "7am",    sourceUrl: `${BASE}/send-morning-inspiration/WORKFLOW.md` },
      { slug: "send-morning-briefing",    label: "Morning Briefing",    description: "Weather, calendar, priorities, and fires — before you wake.", schedule: "7am", sourceUrl: `${BASE}/send-morning-briefing/WORKFLOW.md` },
      { slug: "check-calendar",           label: "Check Calendar",      description: "Review today's schedule, flag conflicts, suggest prep.",    schedule: "8am",    sourceUrl: `${BASE}/check-calendar/WORKFLOW.md` },
      { slug: "send-bedtime-reminder",    label: "Bedtime Reminder",    description: "Wind-down nudge with tomorrow's first commitment.",         schedule: "9:30pm", sourceUrl: `${BASE}/send-bedtime-reminder/WORKFLOW.md` },
      { slug: "prep-tomorrow",            label: "Prep Tomorrow",       description: "Review tomorrow's calendar and pre-stage everything.",      schedule: "9pm",    sourceUrl: `${BASE}/prep-tomorrow/WORKFLOW.md` },
      { slug: "morning-journal",          label: "Morning Journal",     description: "Guided journaling prompt to start your day mindfully.",     schedule: "6:30am", sourceUrl: `${BASE}/morning-journal/WORKFLOW.md` },
    ],
  },
  {
    id: "health", emoji: "💪", label: "Health & Wellness",
    flows: [
      { slug: "track-habits",           label: "Track Habits",         description: "Daily habit tracker check-in and streak maintenance.",    schedule: "8pm",             sourceUrl: `${BASE}/track-habits/WORKFLOW.md` },
      { slug: "track-water",            label: "Track Water",          description: "Hydration reminders throughout the day.",                schedule: "every 2 hours",   sourceUrl: `${BASE}/track-water/WORKFLOW.md` },
      { slug: "plan-workouts",          label: "Plan Workouts",        description: "Generate and schedule workout routines for the week.",   schedule: "Sunday 7pm",      sourceUrl: `${BASE}/plan-workouts/WORKFLOW.md` },
      { slug: "check-medications",      label: "Check Medications",    description: "Medication reminders with refill tracking.",             schedule: "8am, 8pm",        sourceUrl: `${BASE}/check-medications/WORKFLOW.md` },
      { slug: "stretch-reminder",       label: "Stretch Reminder",     description: "Posture and stretch break nudges during work.",          schedule: "every 90 min",    sourceUrl: `${BASE}/stretch-reminder/WORKFLOW.md` },
      { slug: "track-sleep",            label: "Track Sleep",          description: "Log sleep quality and identify patterns.",               schedule: "7am",             sourceUrl: `${BASE}/track-sleep/WORKFLOW.md` },
      { slug: "mental-health-checkin",  label: "Mental Health Check",  description: "Mood tracking and mindfulness check-in.",               schedule: "2pm",             sourceUrl: `${BASE}/mental-health-checkin/WORKFLOW.md` },
      { slug: "write-gratitude-journal",label: "Gratitude Journal",    description: "End-of-day gratitude logging to build perspective.",     schedule: "9pm",             sourceUrl: `${BASE}/write-gratitude-journal/WORKFLOW.md` },
    ],
  },
  {
    id: "home-family", emoji: "🏡", label: "Home & Family",
    flows: [
      { slug: "plan-meals",              label: "Plan Meals",            description: "Weekly meal planning with grocery list generation.",   schedule: "Sunday 10am",  sourceUrl: `${BASE}/plan-meals/WORKFLOW.md` },
      { slug: "check-weather-alerts",    label: "Weather Alerts",        description: "Severe weather monitoring and preparation tips.",      schedule: "6am, 6pm",     sourceUrl: `${BASE}/check-weather-alerts/WORKFLOW.md` },
      { slug: "send-birthday-reminders", label: "Birthday Reminders",    description: "Never miss a birthday — reminders with gift ideas.",   schedule: "8am",          sourceUrl: `${BASE}/send-birthday-reminders/WORKFLOW.md` },
      { slug: "schedule-chores",         label: "Schedule Chores",       description: "Rotating chore assignments for the household.",        schedule: "Monday 8am",   sourceUrl: `${BASE}/schedule-chores/WORKFLOW.md` },
      { slug: "remind-pet-care",         label: "Pet Care",              description: "Feeding, walking, and vet appointment reminders.",     schedule: "7am, 5pm",     sourceUrl: `${BASE}/remind-pet-care/WORKFLOW.md` },
      { slug: "remind-plants",           label: "Plant Care",            description: "Watering schedule based on plant types and seasons.",  schedule: "9am",          sourceUrl: `${BASE}/remind-plants/WORKFLOW.md` },
      { slug: "check-home-maintenance",  label: "Home Maintenance",      description: "Seasonal home maintenance checklist and reminders.",   schedule: "1st of month", sourceUrl: `${BASE}/check-home-maintenance/WORKFLOW.md` },
      { slug: "check-school-events",     label: "School Events",         description: "Track school calendar, deadlines, and events.",        schedule: "7am",          sourceUrl: `${BASE}/check-school-events/WORKFLOW.md` },
      { slug: "plan-date-night",         label: "Date Night",            description: "Weekly date night planning with restaurant picks.",    schedule: "Wednesday",    sourceUrl: `${BASE}/plan-date-night/WORKFLOW.md` },
      { slug: "check-car-maintenance",   label: "Car Maintenance",       description: "Oil changes, tire rotation, inspection reminders.",    schedule: "1st of month", sourceUrl: `${BASE}/check-car-maintenance/WORKFLOW.md` },
    ],
  },
  {
    id: "finance", emoji: "💰", label: "Finance & Shopping",
    flows: [
      { slug: "check-bills",         label: "Check Bills",       description: "Bill due dates, autopay verification, balance checks.",    schedule: "Monday 9am",   sourceUrl: `${BASE}/check-bills/WORKFLOW.md` },
      { slug: "check-subscriptions",  label: "Subscriptions",     description: "Audit active subscriptions, flag unused ones.",            schedule: "1st of month", sourceUrl: `${BASE}/check-subscriptions/WORKFLOW.md` },
      { slug: "track-packages",       label: "Track Packages",    description: "Monitor all incoming deliveries and shipping status.",     schedule: "10am, 4pm",    sourceUrl: `${BASE}/track-packages/WORKFLOW.md` },
      { slug: "find-deals",          label: "Find Deals",        description: "Search for deals on items in your wishlist.",              schedule: "9am",          sourceUrl: `${BASE}/find-deals/WORKFLOW.md` },
      { slug: "send-expense-report", label: "Expense Report",    description: "Compile and categorize recent expenses.",                  schedule: "Friday 5pm",   sourceUrl: `${BASE}/send-expense-report/WORKFLOW.md` },
      { slug: "track-budget",         label: "Track Budget",      description: "Daily spending summary against monthly budget.",           schedule: "8pm",          sourceUrl: `${BASE}/track-budget/WORKFLOW.md` },
      { slug: "track-savings-goals",  label: "Savings Goals",     description: "Progress tracking toward financial savings targets.",      schedule: "Sunday 10am",  sourceUrl: `${BASE}/track-savings-goals/WORKFLOW.md` },
      { slug: "check-warranties",     label: "Warranties",        description: "Track warranty expiration dates for major purchases.",     schedule: "1st of month", sourceUrl: `${BASE}/check-warranties/WORKFLOW.md` },
      { slug: "prep-taxes",          label: "Prep Taxes",        description: "Organize documents and receipts for tax season.",          schedule: "January 15",   sourceUrl: `${BASE}/prep-taxes/WORKFLOW.md` },
      { slug: "check-price-drops",   label: "Price Drops",       description: "Monitor price drops on saved/wishlisted items.",           schedule: "9am",          sourceUrl: `${BASE}/check-price-drops/WORKFLOW.md` },
    ],
  },
  {
    id: "communication", emoji: "💬", label: "Communication",
    flows: [
      { slug: "check-email",       label: "Check Email",       description: "Quick email scan — important items surfaced first.",      schedule: "9am, 1pm, 5pm", sourceUrl: `${BASE}/check-email/WORKFLOW.md` },
      { slug: "process-email",     label: "Process Email",     description: "Junk unsubscribed, noise archived, important summarized.", schedule: "9am, 1pm, 5pm", sourceUrl: `${BASE}/process-email/WORKFLOW.md` },
      { slug: "check-follow-ups",  label: "Follow-ups",        description: "Track unanswered messages and pending responses.",         schedule: "3pm",           sourceUrl: `${BASE}/check-follow-ups/WORKFLOW.md` },
      { slug: "check-messages",    label: "Check Messages",    description: "Scan messaging apps for urgent or missed messages.",       schedule: "every 2 hours", sourceUrl: `${BASE}/check-messages/WORKFLOW.md` },
      { slug: "check-x",           label: "Check X/Twitter",   description: "Scan X timeline for mentions, DMs, and trends.",          schedule: "12pm",          sourceUrl: `${BASE}/check-x/WORKFLOW.md` },
      { slug: "process-contacts",  label: "Process Contacts",  description: "Clean up and organize contact list, merge duplicates.",   schedule: "Sunday 2pm",    sourceUrl: `${BASE}/process-contacts/WORKFLOW.md` },
    ],
  },
  {
    id: "social", emoji: "👋", label: "Social & Relationships",
    flows: [
      { slug: "reconnect-friends",        label: "Reconnect Friends",    description: "Suggest friends to reach out to you haven't talked to.",  schedule: "Sunday 10am", sourceUrl: `${BASE}/reconnect-friends/WORKFLOW.md` },
      { slug: "send-thank-you-notes",     label: "Thank You Notes",      description: "Draft gratitude notes for recent kindnesses.",            schedule: "Friday 4pm",  sourceUrl: `${BASE}/send-thank-you-notes/WORKFLOW.md` },
      { slug: "check-rsvps",              label: "Check RSVPs",          description: "Track pending event RSVPs and send reminders.",            schedule: "Monday 9am",  sourceUrl: `${BASE}/check-rsvps/WORKFLOW.md` },
      { slug: "remember-conversations",   label: "Remember Convos",      description: "Log key takeaways from important conversations.",         schedule: "on-demand",   sourceUrl: `${BASE}/remember-conversations/WORKFLOW.md` },
    ],
  },
  {
    id: "productivity", emoji: "📊", label: "Productivity & Planning",
    flows: [
      { slug: "triage-tasks",        label: "Triage Tasks",     description: "Prioritize, defer, or delegate your task backlog.",       schedule: "8am",          sourceUrl: `${BASE}/triage-tasks/WORKFLOW.md` },
      { slug: "plan-week",           label: "Plan Week",        description: "Set weekly goals, block time, assign priorities.",         schedule: "Sunday 7pm",   sourceUrl: `${BASE}/plan-week/WORKFLOW.md` },
      { slug: "review-week",         label: "Review Week",      description: "Weekly retrospective — wins, blockers, next actions.",    schedule: "Friday 5pm",   sourceUrl: `${BASE}/review-week/WORKFLOW.md` },
      { slug: "review-month",        label: "Review Month",     description: "Monthly review of goals, habits, and progress.",          schedule: "last day 6pm", sourceUrl: `${BASE}/review-month/WORKFLOW.md` },
      { slug: "set-quarterly-goals", label: "Quarterly Goals",  description: "Plan and set objectives for the next quarter.",           schedule: "quarterly",    sourceUrl: `${BASE}/set-quarterly-goals/WORKFLOW.md` },
      { slug: "track-time",          label: "Track Time",       description: "Log time spent on categories throughout the day.",        schedule: "every 2 hours",sourceUrl: `${BASE}/track-time/WORKFLOW.md` },
      { slug: "block-deep-work",     label: "Deep Work",        description: "Protect focus blocks on your calendar automatically.",    schedule: "8am",          sourceUrl: `${BASE}/block-deep-work/WORKFLOW.md` },
      { slug: "clear-open-tabs",     label: "Clear Tabs",       description: "Review and close or bookmark stale browser tabs.",        schedule: "6pm",          sourceUrl: `${BASE}/clear-open-tabs/WORKFLOW.md` },
      { slug: "plan-errands",        label: "Plan Errands",     description: "Batch and route errands for efficient trips.",            schedule: "Saturday 9am", sourceUrl: `${BASE}/plan-errands/WORKFLOW.md` },
    ],
  },
  {
    id: "work", emoji: "💼", label: "Work & Meetings",
    flows: [
      { slug: "prep-next-meeting",   label: "Prep Meeting",     description: "Attendees researched, history pulled, talking points ready.", schedule: "every 30 min", sourceUrl: `${BASE}/prep-next-meeting/WORKFLOW.md` },
      { slug: "build-standup",       label: "Build Standup",    description: "Compile yesterday's work and today's plan for standup.",      schedule: "8:30am",       sourceUrl: `${BASE}/build-standup/WORKFLOW.md` },
      { slug: "send-daily-wrap",     label: "Daily Wrap",       description: "End-of-day summary of completed tasks and blockers.",         schedule: "5pm",          sourceUrl: `${BASE}/send-daily-wrap/WORKFLOW.md` },
      { slug: "sync-calendar-tasks", label: "Sync Calendar",    description: "Keep tasks and calendar events in sync.",                    schedule: "every hour",   sourceUrl: `${BASE}/sync-calendar-tasks/WORKFLOW.md` },
      { slug: "prep-interview",      label: "Prep Interview",   description: "Research company, prepare questions, review job posting.",    schedule: "on-demand",    sourceUrl: `${BASE}/prep-interview/WORKFLOW.md` },
    ],
  },
  {
    id: "travel", emoji: "✈️", label: "Travel & Events",
    flows: [
      { slug: "plan-trip",              label: "Plan Trip",         description: "Full trip planning — flights, hotels, itinerary.",       schedule: "on-demand",    sourceUrl: `${BASE}/plan-trip/WORKFLOW.md` },
      { slug: "build-packing-list",     label: "Packing List",      description: "Generate packing list based on destination and weather.", schedule: "on-demand",   sourceUrl: `${BASE}/build-packing-list/WORKFLOW.md` },
      { slug: "check-commute",          label: "Check Commute",     description: "Traffic, transit, and weather for your commute.",        schedule: "7am, 4pm",     sourceUrl: `${BASE}/check-commute/WORKFLOW.md` },
      { slug: "track-loyalty-programs", label: "Loyalty Programs",   description: "Track points balances and expiring rewards.",           schedule: "1st of month", sourceUrl: `${BASE}/track-loyalty-programs/WORKFLOW.md` },
      { slug: "prep-event",             label: "Prep Event",        description: "Event prep checklist — directions, dress code, notes.",   schedule: "on-demand",   sourceUrl: `${BASE}/prep-event/WORKFLOW.md` },
    ],
  },
  {
    id: "content", emoji: "📚", label: "Content & Learning",
    flows: [
      { slug: "curate-reading-list",  label: "Reading List",      description: "Curate articles and books based on your interests.",    schedule: "Monday 8am",  sourceUrl: `${BASE}/curate-reading-list/WORKFLOW.md` },
      { slug: "send-news-digest",     label: "News Digest",       description: "Personalized news summary from your preferred sources.", schedule: "7am",         sourceUrl: `${BASE}/send-news-digest/WORKFLOW.md` },
      { slug: "draft-social-posts",   label: "Draft Posts",       description: "Generate social media post drafts from recent notes.",   schedule: "10am",        sourceUrl: `${BASE}/draft-social-posts/WORKFLOW.md` },
      { slug: "summarize-podcasts",   label: "Podcast Summary",   description: "Summarize recent podcast episodes for quick review.",    schedule: "on-demand",   sourceUrl: `${BASE}/summarize-podcasts/WORKFLOW.md` },
      { slug: "daily-writing-prompt", label: "Writing Prompt",    description: "Creative writing prompts for daily practice.",           schedule: "8am",         sourceUrl: `${BASE}/daily-writing-prompt/WORKFLOW.md` },
      { slug: "log-dreams",           label: "Dream Log",         description: "Morning dream journaling with pattern analysis.",        schedule: "6:30am",      sourceUrl: `${BASE}/log-dreams/WORKFLOW.md` },
      { slug: "learn-something-new",  label: "Learn Something",   description: "Daily micro-learning — random interesting topic.",       schedule: "12pm",        sourceUrl: `${BASE}/learn-something-new/WORKFLOW.md` },
    ],
  },
  {
    id: "photos-files", emoji: "📷", label: "Photos & Files",
    flows: [
      { slug: "backup-photos",        label: "Backup Photos",      description: "Automatically backup new photos to cloud storage.",     schedule: "midnight",  sourceUrl: `${BASE}/backup-photos/WORKFLOW.md` },
      { slug: "process-downloads",    label: "Process Downloads",   description: "Sort and organize your Downloads folder.",             schedule: "6pm",       sourceUrl: `${BASE}/process-downloads/WORKFLOW.md` },
      { slug: "process-screenshots",  label: "Process Screenshots", description: "OCR, organize, and clean up screenshots.",             schedule: "6pm",       sourceUrl: `${BASE}/process-screenshots/WORKFLOW.md` },
      { slug: "review-photos-today",  label: "Review Photos",       description: "Review and organize photos taken today.",              schedule: "9pm",       sourceUrl: `${BASE}/review-photos-today/WORKFLOW.md` },
    ],
  },
  {
    id: "digital-hygiene", emoji: "🔒", label: "Digital Hygiene",
    flows: [
      { slug: "check-disk",              label: "Check Disk",         description: "Monitor disk usage, flag large files, clean caches.",  schedule: "Sunday 2am", sourceUrl: `${BASE}/check-disk/WORKFLOW.md` },
      { slug: "check-network",           label: "Check Network",      description: "Network security scan and device audit.",             schedule: "weekly",     sourceUrl: `${BASE}/check-network/WORKFLOW.md` },
      { slug: "check-security",          label: "Security Check",     description: "Scan for compromised accounts and unusual activity.", schedule: "weekly",     sourceUrl: `${BASE}/check-security/WORKFLOW.md` },
      { slug: "process-notifications",   label: "Notifications",      description: "Audit and cull noisy notification sources.",          schedule: "6pm",        sourceUrl: `${BASE}/process-notifications/WORKFLOW.md` },
      { slug: "sync-bookmarks",          label: "Sync Bookmarks",     description: "Organize, dedupe, and sync browser bookmarks.",       schedule: "Sunday 3pm", sourceUrl: `${BASE}/sync-bookmarks/WORKFLOW.md` },
      { slug: "review-passwords",        label: "Review Passwords",   description: "Audit weak or reused passwords.",                    schedule: "monthly",    sourceUrl: `${BASE}/review-passwords/WORKFLOW.md` },
      { slug: "clean-email",             label: "Clean Email",        description: "Mass unsubscribe from newsletters, purge old mail.",  schedule: "Sunday 10am",sourceUrl: `${BASE}/clean-email/WORKFLOW.md` },
      { slug: "check-privacy",           label: "Privacy Audit",      description: "Review app permissions and privacy settings.",         schedule: "monthly",    sourceUrl: `${BASE}/check-privacy/WORKFLOW.md` },
      { slug: "backup-important-files",  label: "Backup Files",       description: "Backup critical documents and configurations.",        schedule: "weekly",     sourceUrl: `${BASE}/backup-important-files/WORKFLOW.md` },
    ],
  },
  {
    id: "seasonal", emoji: "🎄", label: "Seasonal",
    flows: [
      { slug: "spring-clean",         label: "Spring Clean",       description: "Annual deep-clean checklist for home and digital life.", schedule: "March",   sourceUrl: `${BASE}/spring-clean/WORKFLOW.md` },
      { slug: "plan-holiday-gifts",   label: "Holiday Gifts",      description: "Gift list management with budget tracking.",            schedule: "November", sourceUrl: `${BASE}/plan-holiday-gifts/WORKFLOW.md` },
      { slug: "set-new-year-goals",   label: "New Year Goals",     description: "Annual goal-setting with actionable quarterly plans.",  schedule: "January",  sourceUrl: `${BASE}/set-new-year-goals/WORKFLOW.md` },
      { slug: "prep-back-to-school",  label: "Back to School",     description: "School supply lists, schedule planning, prep tasks.",   schedule: "August",   sourceUrl: `${BASE}/prep-back-to-school/WORKFLOW.md` },
    ],
  },
  {
    id: "dev-tools", emoji: "🔧", label: "Dev Tools",
    flows: [
      { slug: "check-repos",           label: "Check Repos",        description: "Scan GitHub repos for open issues and stale PRs.",     schedule: "9am",       sourceUrl: `${BASE}/check-repos/WORKFLOW.md` },
      { slug: "review-prs",            label: "Review PRs",         description: "Summarize and prioritize open pull requests.",         schedule: "9am, 2pm",  sourceUrl: `${BASE}/review-prs/WORKFLOW.md` },
      { slug: "check-dependencies",    label: "Dependencies",       description: "Check for outdated or vulnerable dependencies.",       schedule: "Monday 9am",sourceUrl: `${BASE}/check-dependencies/WORKFLOW.md` },
      { slug: "clean-docker",          label: "Clean Docker",       description: "Prune unused Docker images, containers, and volumes.", schedule: "Sunday 3am",sourceUrl: `${BASE}/clean-docker/WORKFLOW.md` },
      { slug: "rotate-logs",           label: "Rotate Logs",        description: "Compress and archive old log files.",                  schedule: "weekly",    sourceUrl: `${BASE}/rotate-logs/WORKFLOW.md` },
      { slug: "sync-dotfiles",         label: "Sync Dotfiles",      description: "Keep dotfiles synced across machines.",                schedule: "daily 11pm",sourceUrl: `${BASE}/sync-dotfiles/WORKFLOW.md` },
      { slug: "build-changelog",       label: "Build Changelog",    description: "Generate changelog from recent commits.",              schedule: "Friday 4pm",sourceUrl: `${BASE}/build-changelog/WORKFLOW.md` },
      { slug: "build-nightly-project", label: "Nightly Build",      description: "Pick an idea, build it overnight, deliver in morning.", schedule: "midnight", sourceUrl: `${BASE}/build-nightly-project/WORKFLOW.md` },
      { slug: "review-week-git",       label: "Week in Git",        description: "Summary of all git activity across repos this week.",  schedule: "Friday 5pm",sourceUrl: `${BASE}/review-week-git/WORKFLOW.md` },
    ],
  },
];

/** Total number of workflows in the catalog */
export const TOTAL_FLOWS = CLAWFLOW_CATEGORIES.reduce((n, c) => n + c.flows.length, 0);
