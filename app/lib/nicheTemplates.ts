// app/lib/nicheTemplates.ts
//
// Niche template configuration system.
// V1 loads the "realtor" template by default.
//
// To add a new niche: add a key to nicheTemplates — no engine logic changes required.

export type ImageStyleKey =
  | "lifestyle_photo"
  | "branding_photo"
  | "branding_text_photo"
  | "branding_text_only";

export type CaptionLength = "Short" | "Medium" | "Long";
export type HashtagPack = "light" | "standard" | "heavy";

export type ContentPillar = {
  id: string;
  label: string;           // Display name shown in the calendar (e.g., "Market Authority")
  detail: string;          // Short description shown to the user in the day drawer
  postTypeHint: string;    // Passed as goal/postType to the generate API
  imageStyleHint: ImageStyleKey | null; // null = let pickImageStyleForDay decide
  captionLength: CaptionLength;
  hashtagPack: HashtagPack;
  promptRules: string;     // Injected into AI text generation as niche-specific context
  ctaBank: string[];       // Pillar-specific CTA suggestions surfaced to the AI
  hashtagBank: string[];   // Pillar-specific hashtag pool (future: rotate from here)
};

export type NicheTemplate = {
  id: string;
  label: string;
  weeklyStructure: string[];          // 5 pillar IDs, Mon–Fri (fixed, no randomization)
  pillars: Record<string, ContentPillar>;
  tonePreset: string;
  defaultHashtagCount: number;
};

/* ------------------------------------------------------------------ */
/*  REALTOR TEMPLATE V1                                                  */
/* ------------------------------------------------------------------ */

const realtorPillars: Record<string, ContentPillar> = {
  market_authority: {
    id: "market_authority",
    label: "Market Authority",
    detail: "Position yourself as the local market expert.",
    postTypeHint: "Authority",
    imageStyleHint: "branding_text_photo",
    captionLength: "Medium",
    hashtagPack: "standard",
    promptRules: `
This is a Market Authority post for a real estate agent.
Goal: Position the agent as a knowledgeable local market expert.
- If market stats or data are provided by the user, incorporate them accurately and confidently.
- If no stats are provided, write about general market dynamics, buyer/seller trends, or timing insights.
- NEVER fabricate specific numbers, percentages, or dollar figures.
- Tone: confident, data-informed, authoritative.
- Avoid overused real estate clichés ("hot market", "location location location").
`,
    ctaBank: [
      "DM me for a free market analysis",
      "Follow for weekly market updates",
      "Questions about the market? Drop them below",
      "Thinking of buying or selling? Let's connect",
    ],
    hashtagBank: [
      "#realestate", "#realestatemarket", "#housingmarket", "#realtorlife",
      "#realtor", "#homesales", "#propertynews", "#marketupdate",
      "#realestateinvesting", "#homebuying", "#sellinghomes", "#localrealestate",
    ],
  },

  active_listing: {
    id: "active_listing",
    label: "Active Listing",
    detail: "Showcase a property and drive showing requests.",
    postTypeHint: "Promotion",
    imageStyleHint: "lifestyle_photo",
    captionLength: "Medium",
    hashtagPack: "heavy",
    promptRules: `
This is an Active Listing post for a real estate agent.
Goal: Showcase a property and drive showing requests.
- If specific property details are provided (beds, baths, location, price, features), use them exactly as given — they are verified by the agent.
- If no details are provided, write compelling general listing copy without inventing specific addresses, prices, or square footage.
- Highlight the most compelling features: space, location, upgrades, lifestyle benefits.
- End with a strong CTA encouraging showings or inquiries.
- Tone: excited, professional, benefit-focused.
`,
    ctaBank: [
      "DM me to schedule a private showing",
      "Link in bio for full listing details",
      "Call or text me today to see this home",
      "Don't wait — homes like this move fast",
    ],
    hashtagBank: [
      "#forsale", "#justlisted", "#newhome", "#homeforsale",
      "#realestate", "#realtorlife", "#dreamhome", "#househunting",
      "#openhouse", "#homesearch", "#propertyoftheday", "#buythishome",
    ],
  },

  educational: {
    id: "educational",
    label: "Educational",
    detail: "Teach buyers or sellers something genuinely useful.",
    postTypeHint: "Educational",
    imageStyleHint: null, // let pickImageStyleForDay decide
    captionLength: "Medium",
    hashtagPack: "heavy",
    promptRules: `
This is an Educational post for a real estate agent.
Goal: Build trust by teaching buyers or sellers something genuinely useful.
- Topics: buying process, seller prep, financing basics, negotiation tips, closing costs, home inspection, market timing, agent value, mortgage types.
- Keep all facts universal (true for any market). Do NOT fabricate local statistics or market-specific claims.
- If the user provides a specific tip or fact, build the post around it — it is verified by the agent.
- Write in a clear, accessible tone. Explain jargon if you use it.
- End with a CTA that invites questions or further engagement.
`,
    ctaBank: [
      "Save this for later",
      "Share with someone buying or selling soon",
      "Questions? Drop them in the comments",
      "Follow for more tips like this",
    ],
    hashtagBank: [
      "#realestatetips", "#homebuyertips", "#selleradvice", "#firsttimehomebuyer",
      "#realestateeducation", "#mortgagetips", "#homebuying101", "#realtoradvice",
      "#realestate", "#realtor", "#homeselling", "#propertyadvice",
    ],
  },

  social_proof: {
    id: "social_proof",
    label: "Social Proof",
    detail: "Build credibility through client results and testimonials.",
    postTypeHint: "Testimonial",
    imageStyleHint: "branding_text_photo",
    captionLength: "Short",
    hashtagPack: "standard",
    promptRules: `
This is a Social Proof post for a real estate agent.
Goal: Build credibility through client results, testimonials, or closed transaction milestones.
- If a testimonial or specific result is provided by the user, use it directly — it is real and verified.
- If nothing is provided, write compelling general social proof copy (milestone, process win, happy client moment) without fabricating names, prices, or addresses.
- Tone: warm, credible, results-focused.
- Let the success speak — do not over-explain.
`,
    ctaBank: [
      "Ready for your success story? DM me",
      "Your turn next — let's connect",
      "Want results like this? Reach out today",
      "Share your home goals below",
    ],
    hashtagBank: [
      "#justsold", "#happyclients", "#closedescrow", "#realtorlife",
      "#realestate", "#clientlove", "#testimonial", "#soldwithlove",
      "#successstory", "#happyhomeowners", "#realestatewins", "#realtor",
    ],
  },

  community: {
    id: "community",
    label: "Community",
    detail: "Show local personality, neighborhood pride, and human connection.",
    postTypeHint: "Engagement",
    imageStyleHint: "lifestyle_photo",
    captionLength: "Short",
    hashtagPack: "light",
    promptRules: `
This is a Community post for a real estate agent.
Goal: Show local personality, neighborhood pride, and human connection.
- Topics: local businesses, neighborhood features, seasonal events, personal values, agent lifestyle, local pride.
- If a specific local topic is provided by the user, use it as the anchor.
- If nothing is provided, write about the value of community and local connection in a relatable way.
- Tone: warm, personal, approachable — not salesy.
- End with a question or invitation to engage.
`,
    ctaBank: [
      "What do you love most about our neighborhood?",
      "Drop your favorite local spot below",
      "Tag a neighbor who needs to see this",
      "Share if you love where you live",
    ],
    hashtagBank: [
      "#localrealestate", "#communitymatters", "#lovewhereyoulive",
      "#neighborhoodvibes", "#realtorlife", "#localbusiness",
      "#realestate", "#smalltown", "#citylife", "#homecommunity",
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  TEMPLATE REGISTRY                                                    */
/* ------------------------------------------------------------------ */

export const nicheTemplates: Record<string, NicheTemplate> = {
  realtor: {
    id: "realtor",
    label: "Real Estate Agent",
    weeklyStructure: [
      "market_authority",  // Monday
      "active_listing",    // Tuesday
      "educational",       // Wednesday
      "social_proof",      // Thursday
      "community",         // Friday
    ],
    pillars: realtorPillars,
    tonePreset: "Confident",
    defaultHashtagCount: 12,
  },

  // Future niches — add a config object here, no engine changes needed:
  // hvac: { ... },
  // mortgage: { ... },
  // fitness: { ... },
};

/* ------------------------------------------------------------------ */
/*  Engine functions                                                     */
/* ------------------------------------------------------------------ */

// V1: always returns the realtor template.
// Future: accept the user's niche key from their brand profile.
export function getTemplate(nicheKey?: string): NicheTemplate {
  const key = nicheKey && nicheTemplates[nicheKey] ? nicheKey : "realtor";
  return nicheTemplates[key];
}

// Returns the content pillar for a given workday index (0=Mon … 4=Fri).
// Rotates if weeklyStructure has fewer than 5 entries.
export function getPillarForWorkdayIndex(
  template: NicheTemplate,
  workdayIndex: number
): ContentPillar {
  const pillarId =
    template.weeklyStructure[workdayIndex % template.weeklyStructure.length];
  return template.pillars[pillarId];
}

// Maps a JavaScript Date weekday (0=Sun … 6=Sat) to a workday index (0=Mon … 4=Fri).
// Returns null for weekends.
export function weekdayToWorkdayIndex(jsWeekday: number): number | null {
  if (jsWeekday === 0 || jsWeekday === 6) return null;
  return jsWeekday - 1; // Mon=0, Tue=1, Wed=2, Thu=3, Fri=4
}

// Returns the pillar-specific prompt enrichment string injected into the generate API.
export function buildPillarPromptEnrichment(pillar: ContentPillar): string {
  return [
    `CONTENT PILLAR: ${pillar.label}`,
    pillar.promptRules.trim(),
    `Suggested CTAs for this pillar (pick the most natural one):`,
    pillar.ctaBank.map((c) => `- ${c}`).join("\n"),
  ].join("\n");
}
