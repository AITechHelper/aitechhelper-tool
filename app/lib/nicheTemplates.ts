// app/lib/nicheTemplates.ts
//
// Niche template configuration system.
// V2: Enhanced prompt rules, larger hashtag banks, post ideas, caption hooks, and image scene banks.

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
  hashtagBank: string[];   // Pillar-specific hashtag pool
  postIdeas: string[];     // Specific post angle ideas shown in the calendar drawer
  captionHooks: string[];  // Example opening lines shown as preview in the drawer
  imageSceneBank: string[]; // Visual scene descriptions for DALL-E image generation
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
/*  REALTOR TEMPLATE V2                                                  */
/* ------------------------------------------------------------------ */

const realtorPillars: Record<string, ContentPillar> = {
  market_authority: {
    id: "market_authority",
    label: "Market Authority",
    detail: "Position yourself as the trusted local market expert.",
    postTypeHint: "Authority",
    imageStyleHint: "branding_text_photo",
    captionLength: "Medium",
    hashtagPack: "standard",
    promptRules: `
This is a Market Authority post for a real estate agent.
Goal: Position the agent as a deeply knowledgeable, trusted local market expert.

CONTENT APPROACH — pick one of these angles:
- Seasonal buyer/seller trends and what they mean right now for your clients
- The interest rate environment: practical guidance for buyers considering waiting vs. acting
- Inventory dynamics: what low or high inventory means for negotiating leverage today
- Days-on-market patterns: what they signal about pricing, demand, and timing
- The gap between list price and final sale price — and what drives it
- Why spring/fall/winter/summer markets shift and how to prepare before they do
- First-time buyer guidance: navigating a competitive market without overpaying
- Seller prep reality check: what improvements actually move the needle vs. don't

TONE & VOICE:
- Confident, data-informed, authoritative — like the most knowledgeable agent in the room
- Practical: translate market knowledge into what buyers/sellers should actually DO
- Conversational but expert — sharing insight, not lecturing
- Avoid overused clichés: "hot market", "seller's market", "location location location", "dream home"

CAPTION STRUCTURE:
- Hook: Lead with a counterintuitive insight, a surprising observation, or a direct question that makes them stop scrolling
  Strong examples: "Most buyers are waiting for rates to drop. Here's why that could be a costly mistake."
                   "Inventory just hit a 5-year low in our market. Here's what that actually means for you."
                   "Your neighbor's home sold for $40K over ask. Here's the 3 things they did right."
- Body: 2-3 key market insights that genuinely educate — connect data to real decisions
- CTA: Invite them to connect for personalized, local market advice

WHAT NOT TO DO:
- Do NOT fabricate specific percentages, price data, or statistics (unless user provided them)
- Do NOT write generic statements any agent could post — be specific and insightful
- Do NOT overuse exclamation points or salesy language
- Do NOT make it sound like a pitch — sound like a trusted advisor
`,
    ctaBank: [
      "DM me for a free market analysis",
      "Follow for weekly market updates",
      "Curious what your home is worth right now? Let's talk",
      "Questions about the market? Drop them below",
      "Thinking of buying or selling? Let's connect",
      "Want the local numbers? Comment 'MARKET' below",
      "Follow to stay ahead of what's happening in real estate",
      "Save this post — you'll want it when you're ready to make a move",
    ],
    hashtagBank: [
      "#realestate", "#realtor", "#realtorlife", "#housingmarket",
      "#realestatemarket", "#marketupdate", "#homesales", "#propertynews",
      "#realestateinvesting", "#homebuying", "#sellinghomes", "#localrealestate",
      "#realestateinvestor", "#homebuyertips", "#selleradvice", "#propertymarket",
      "#realestateadvice", "#househunting", "#homevalue", "#mortgagerates",
      "#buyersmarket", "#sellersmarket", "#homeprices", "#realestateeducation",
      "#homesearch", "#realestatetips", "#realestateagent", "#realestateinvesting",
    ],
    postIdeas: [
      "The rates vs. timing debate — when does waiting to buy actually cost more?",
      "Inventory snapshot: what tight supply means for buyers trying to negotiate today",
      "Why the spring market doesn't always mean higher prices — what the data says",
      "What rising days-on-market numbers really signal about where prices are heading",
      "3 things sellers are doing right now that are getting them top dollar",
      "The biggest mistake buyers make in a competitive market (and how to avoid it)",
    ],
    captionHooks: [
      "Most buyers are waiting for rates to drop. Here's why that strategy could cost them.",
      "Inventory just hit its lowest point in years. Here's exactly what that means for you.",
      "The market shifted this month — and here's what buyers need to know before making an offer.",
      "Your neighbor just sold for $30K over asking. Here's the 3 things they did differently.",
      "Everyone says 'wait for rates to come down.' Here's what the math actually tells us.",
    ],
    imageSceneBank: [
      "Professional real estate agent at a sleek modern desk reviewing market charts, city skyline visible through floor-to-ceiling window behind them, confident professional expression, warm office lighting",
      "Aerial drone view of a beautiful well-established residential neighborhood, tree-lined streets, diverse homes, golden afternoon light, aspirational community feel",
      "Clean modern home exterior on a quiet street, professional real estate photography style, clear sky, perfectly maintained lawn, welcoming curb appeal",
      "Real estate agent in professional attire having a confident consultation with clients at a modern table, trusted advisor energy, bright clean office environment",
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
Goal: Showcase a property in a way that creates genuine desire and drives showing requests or DM inquiries.

CONTENT APPROACH:
- If specific property details are provided (beds, baths, features, location, price, sqft), use them exactly — they are verified by the agent
- If no details are provided, write compelling listing copy that:
  - Focuses on the LIFESTYLE the home enables (not just square footage)
  - Paints a picture with sensory language: "morning light pouring through the kitchen windows", "the backyard made for summer evenings"
  - Highlights what buyers actually care about: space, natural light, storage, outdoor living, neighborhood, community

CAPTION STRUCTURE:
- Hook: Paint a lifestyle scene or describe the feeling of the home in the first line
  Strong examples: "Imagine waking up to this every morning."
                   "This is not just a house — it's your next chapter."
                   "Everything you've been searching for, finally under one roof."
                   "The one you've been waiting for just hit the market."
- Body: 2-3 compelling property highlights focused on lifestyle benefits + key features
  Translate features into benefits:
  - Instead of "3 bedrooms" → "room for everyone, and then some"
  - Instead of "updated kitchen" → "a kitchen you'll actually want to cook in"
  - Instead of "large backyard" → "the backyard that was made for summer entertaining"
- CTA: Create real urgency to schedule a showing

TONE & VOICE:
- Excited, aspirational, benefit-focused
- Make the reader feel what it would be like to LIVE there
- Avoid dry feature checklists — connect every detail to a feeling or benefit

WHAT NOT TO DO:
- Do NOT fabricate specific addresses, prices, or square footage unless user provided them
- Do NOT write dry feature lists without emotional benefit
- Do NOT be generic — make this property feel special and distinctly desirable
- Do NOT say "stunning" or "gorgeous" without backing it up with something specific
`,
    ctaBank: [
      "DM me to schedule a private showing",
      "Link in bio for full listing details",
      "Call or text me today to see this home",
      "Don't wait — homes like this move fast",
      "Want to see it in person? Let's make it happen",
      "Serious buyers: DM me now — showings are filling up",
      "Comment 'TOUR' and I'll send you the details",
      "This one won't last. Reach out today.",
    ],
    hashtagBank: [
      "#forsale", "#justlisted", "#newhome", "#homeforsale",
      "#realestate", "#realtorlife", "#dreamhome", "#househunting",
      "#openhouse", "#homesearch", "#propertyoftheday", "#buythishome",
      "#homesforsale", "#newlisting", "#housegoals", "#moveready",
      "#realestateagent", "#listingday", "#showingready", "#propertylistings",
      "#realty", "#listingagent", "#homesweethome", "#dreamhome",
      "#newhomeowner", "#homeinspiration", "#luxuryhomes", "#homedesign",
    ],
    postIdeas: [
      "Showcase the morning light flooding through that open-concept living room",
      "The backyard that was literally made for summer entertaining — pool optional",
      "Newly renovated kitchen with everything buyers have been asking for",
      "Move-in ready in the neighborhood everyone's been asking about",
      "Natural light, open floor plan, and room to grow — all under one roof",
      "The home that checks every box on the wishlist (yes, including that one)",
    ],
    captionHooks: [
      "Imagine waking up to this every morning.",
      "This is not just a house. It's your next chapter.",
      "Everything you've been searching for — all under one roof.",
      "The one you've been waiting for just hit the market.",
      "Stop scrolling. This might be the one.",
    ],
    imageSceneBank: [
      "Bright airy living room with natural light streaming through large windows, tasteful modern furniture, clean and aspirational, professional real estate photography style",
      "Stunning home exterior with manicured landscaping, professional curb appeal, blue sky, inviting driveway, high-end real estate photography",
      "Luxury kitchen with clean countertops, stainless steel appliances, natural light, open to living area, aspirational lifestyle real estate photography",
      "Inviting backyard with patio and lush green grass, warm afternoon light, perfect for entertaining, professional lifestyle real estate photography",
      "Master bedroom with natural light, vaulted ceilings, elegant but approachable interior design, real estate photography style",
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
Goal: Build deep, lasting trust by teaching buyers or sellers something genuinely useful and actionable that they didn't already know.

CONTENT TOPICS — pick the most relevant or most surprising:
- The home buying process: from pre-approval to closing, what actually happens at each step
- Seller prep: which renovations truly ROI vs. which are a waste of money before listing
- Closing costs decoded: who pays what and why — most buyers are shocked by this
- Negotiation tactics: how to write a competitive offer, or how to counter as a seller
- Home inspection: what to look for, common red flags, what's actually negotiable
- Mortgage types explained: fixed vs. ARM, FHA, conventional, VA — when each makes sense
- Down payment myths: the truth is you don't always need 20%
- How agent commissions actually work — transparency builds trust
- Market timing: is there really a "best time" to buy or sell?
- Credit score impact on mortgage rates — what the range actually means in dollars
- The difference between pre-approval and pre-qualification (and why it matters)
- What "contingencies" are and why removing them can win (or lose) a deal

CAPTION STRUCTURE:
- Hook: Start with a surprising fact, a common misconception people hold, or a direct question
  Strong examples: "Most first-time buyers don't know this exists — and it costs them at closing."
                   "You don't need 20% down to buy a home. Here's what you actually need."
                   "Closing costs shocked me the first time I saw them. Here's the breakdown."
                   "One decision during the buying process affects your rate more than anything else."
- Body: 2-3 clear, actionable points (keep it scannable — numbered lists work well here)
- CTA: Invite questions or prompt them to save the post for when they need it

TONE & VOICE:
- Clear, accessible, and jargon-free (if you use a term, define it briefly)
- Position the agent as a helpful guide and trusted resource, not a salesperson
- Practical and actionable — leave them feeling smarter after reading
- Do NOT make it feel like a pitch — pure education wins more trust than promotion

WHAT NOT TO DO:
- Do NOT fabricate specific statistics or market-specific claims
- Do NOT use jargon without explanation
- Do NOT turn this into a sales pitch
- DO make the reader feel genuinely more informed and confident
`,
    ctaBank: [
      "Save this for later",
      "Share with someone buying or selling soon",
      "Questions? Drop them in the comments below",
      "Follow for more tips like this every week",
      "Comment if this helped you",
      "DM me if you want to walk through this for your specific situation",
      "Bookmark this — you'll want it when the time comes",
      "Tag someone who needs to see this",
    ],
    hashtagBank: [
      "#realestatetips", "#homebuyertips", "#selleradvice", "#firsttimehomebuyer",
      "#realestateeducation", "#mortgagetips", "#homebuying101", "#realtoradvice",
      "#realestate", "#realtor", "#homeselling", "#propertyadvice",
      "#buyingahome", "#sellingahome", "#homesearch", "#realestateinvesting",
      "#closingcosts", "#mortgageadvice", "#homeownertips", "#realestateknowledge",
      "#househuntingtips", "#firsthome", "#realestatefacts", "#buyersguide",
      "#sellersguide", "#homeownership", "#mortgageminds", "#realestatelife",
    ],
    postIdeas: [
      "Breaking down closing costs: who pays what and why buyers are always surprised",
      "Why pre-approval and pre-qualification are NOT the same thing (and why it matters)",
      "The 3 things that kill deals at the inspection stage — and how to avoid them",
      "Down payment myth-busting: you don't need 20% to buy a home",
      "What your credit score range actually means in dollars on your monthly payment",
      "5 things sellers should fix before listing (and 3 that waste money)",
    ],
    captionHooks: [
      "Most first-time buyers don't know this exists — and it costs them at closing.",
      "You don't need 20% down to buy a home. Here's what you actually need.",
      "The offer was accepted. Then the inspection report came back.",
      "One decision during the buying process affects your rate more than anything else.",
      "Closing costs shocked me the first time I saw them. Here's the honest breakdown.",
    ],
    imageSceneBank: [
      "Real estate agent consulting with a young couple at a clean modern table, warm professional lighting, educational trusted advisor conversation, lifestyle photography",
      "Person reviewing important documents at a well-organized desk, natural light, focused and confident, implies financial or property planning, clean and professional",
      "Clean modern graphic design background with geometric shapes, bold typography layout (no actual text rendered), professional blue and white color scheme, informational design aesthetic",
      "Warm home office setup with someone working at a laptop, reviewing paperwork, professional and organized, natural daylight, real estate context",
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
Goal: Build deep credibility through real client results, testimonials, or milestone wins that inspire trust and create connection.

CONTENT APPROACH:
- If a testimonial or specific result is provided by the user, use it directly (it is real and verified)
  - Quote format: Lead with the result, then add brief context about who and what happened
  - Results format: "Sold in 4 days. $22K over asking. That's what preparation + strategy gets you."
- If nothing is provided, write compelling general social proof copy:
  - Milestone moments: "Another set of keys handed over. Another family in their forever home."
  - Process wins: "The best closing calls are the ones where clients are in tears — happy tears."
  - Trust signals: "8 years. Hundreds of families. Every single one matters."
  - Emotional story: Capture the real human moment of a successful transaction

CAPTION STRUCTURE:
- Hook: Lead with the result or the emotional peak of the moment — NOT the process
  Strong examples: "From first call to keys in hand in 31 days."
                   "She said she'd never find a home in this market. We proved otherwise."
                   "Multiple offers. Bidding war. Still won. Here's how."
                   "This one meant everything. New chapter, new home, new beginning."
- Body: 1-2 sentences of brief context or the testimonial quote — keep it short
- CTA: Warm, inviting — encourage others to start their own journey

TONE & VOICE:
- Warm, credible, genuine — let the result or the client's experience do the talking
- Emotional but professional — real estate is one of the most emotional purchases of someone's life
- Do NOT over-hype with excessive superlatives ("AMAZING!", "INCREDIBLE!")
- DO capture the real human story and feeling of the win

WHAT NOT TO DO:
- Do NOT fabricate names, addresses, prices, or specific numbers unless user provided them
- Do NOT be boastful or arrogant — confidence is different from bragging
- Do NOT make it sound like a sales pitch
- Do NOT write something generic that could have been written by any agent
`,
    ctaBank: [
      "Ready for your success story? DM me",
      "Your turn next — let's connect",
      "Want results like this? Reach out today",
      "Share your home goals below — let's make them happen",
      "This could be you — message me to get started",
      "Let's get you to the closing table. Message me today.",
      "Follow to see more client wins",
      "DM me and let's write your story",
    ],
    hashtagBank: [
      "#justsold", "#happyclients", "#closedescrow", "#realtorlife",
      "#realestate", "#clientlove", "#testimonial", "#soldwithlove",
      "#successstory", "#happyhomeowners", "#realestatewins", "#realtor",
      "#soldoverask", "#clientresults", "#closingday", "#keysday",
      "#newchapter", "#happyfamily", "#homesold", "#realestateagent",
      "#realestateclosing", "#homessold", "#trustedrealtor", "#agentlife",
      "#soldtoday", "#dreamcometrue", "#newbeginnings",
    ],
    postIdeas: [
      "31 days from first call to keys in hand — here's the story",
      "She said she'd never find a home in this market — we found it in 11 days",
      "Multiple offers, bidding war, still won — here's what made the difference",
      "First-time buyers who almost gave up — until this moment",
      "Clients who sold $30K over asking — and what they did to get there",
      "The call that made everything worth it — another family in their forever home",
    ],
    captionHooks: [
      "From first call to keys in hand in 31 days.",
      "She was told she couldn't find a home in this market. She was wrong.",
      "Multiple offers. Bidding war. Still won. Congratulations to our clients.",
      "This one meant everything. New chapter, new home, new beginning.",
      "The best part of this job? This moment right here.",
    ],
    imageSceneBank: [
      "Happy couple receiving house keys in front of their new home, genuine joyful moment, warm lighting, professional real estate photography",
      "Family celebrating in front of a beautiful home, authentic and warm, genuine happiness, lifestyle real estate photography",
      "Professional real estate agent warmly congratulating clients, handshake or keys moment, trusted relationship, clean professional setting",
      "Clean branded graphic design layout with space for testimonial text, bold colors, professional real estate branding aesthetic, no text rendered",
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
Goal: Show authentic local personality, neighborhood pride, and genuine human connection — NOT real estate sales.
This post positions the agent as someone who truly loves and lives in this community, not just someone who sells homes there.

CONTENT TOPICS — pick the most authentic and specific:
- A favorite local restaurant, coffee shop, bakery, or hidden gem worth visiting
- Seasonal neighborhood happenings: farmers markets, festivals, outdoor concerts, holiday events
- Local parks, walking trails, dog parks, playgrounds, or family-friendly outdoor spots
- What makes this specific neighborhood or city special — the thing only locals know
- Personal agent story: why they chose to build their business AND their life here
- Celebrating a local business or community milestone
- Local schools, sports teams, or community organizations that make the area great
- Seasonal activities: summer evening walks, fall foliage drives, winter holiday events
- Neighborhood trivia or history that locals love sharing
- Something that makes new residents immediately feel at home

CAPTION STRUCTURE:
- Hook: Personal, warm, and specific — write it like texting a close friend about something you discovered
  Strong examples: "This coffee shop has been here since 1987 and it's still the best thing in the neighborhood."
                   "Spent my Saturday at the farmers market and now I can't imagine living anywhere else."
                   "This is why I chose to build my business here. Community like this is rare."
                   "If you haven't discovered this part of [city/neighborhood] yet, you're missing out."
- Body: 1-2 sentences of genuine personal take or local detail — specific and authentic
- CTA: Ask a question that invites locals to share their own favorites

TONE & VOICE:
- Warm, personal, approachable — this is the agent showing their personality, not their pitch
- Authentic and specific — avoid vague "great community!" statements
- Zero mentions of listings, showings, or market stats unless it connects 100% naturally
- Makes both locals feel seen and people new to the area feel excited

WHAT NOT TO DO:
- Do NOT turn this into a real estate pitch or mention listings
- Do NOT be generic ("what a great neighborhood!") — be specific and personal
- Do NOT mention showing requests, market stats, or listings
- DO make locals feel proud and anyone looking at the area feel attracted to it
`,
    ctaBank: [
      "What's your favorite spot in the neighborhood? Drop it below",
      "Tag a neighbor who needs to see this",
      "Share if you love where you live",
      "Drop your favorite local hidden gem below",
      "What's your go-to in this area?",
      "Tag someone who needs to experience this",
      "Save this for your next weekend plans",
      "What would you add to this list?",
    ],
    hashtagBank: [
      "#localrealestate", "#communitymatters", "#lovewhereyoulive",
      "#neighborhoodvibes", "#realtorlife", "#localbusiness",
      "#realestate", "#citylife", "#homecommunity",
      "#localfavorites", "#explorethecity", "#weekendvibes", "#supportlocal",
      "#neighborhoodlove", "#locallife", "#myneighborhood",
      "#hiddengems", "#locallove", "#communitylife", "#smallbusiness",
    ],
    postIdeas: [
      "The coffee shop that's been here since 1987 — and why it still wins",
      "Why I chose this neighborhood to build my career and my life",
      "The Saturday farmers market that turned my client into a believer",
      "The local park that new residents always discover and never leave",
      "A hidden gem restaurant that locals are still debating whether to share",
      "What makes this neighborhood feel different from everywhere else — and why it matters",
    ],
    captionHooks: [
      "This coffee shop is the reason my client stopped looking in other neighborhoods.",
      "I've worked in this area for years. Here's what I love most about it.",
      "The best part of this job? Getting to introduce people to places like this.",
      "This neighborhood has a secret. Let me show you.",
      "If you haven't been to this part of town yet, you're genuinely missing out.",
    ],
    imageSceneBank: [
      "Charming neighborhood coffee shop or cafe exterior, warm morning light, inviting atmosphere, people enjoying outdoor seating, authentic lifestyle photography",
      "Beautiful tree-lined residential street with golden afternoon light filtering through leaves, inviting and serene, authentic neighborhood life",
      "Colorful local farmers market scene, community members browsing fresh produce and local goods, warm natural light, vibrant and authentic",
      "Neighborhood park with families and individuals enjoying outdoor space in warm afternoon light, natural candid lifestyle photography",
      "Local community gathering or outdoor neighborhood event, warm social atmosphere, genuine authentic community moment",
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

// Returns a random image scene suggestion from the pillar's imageSceneBank.
export function getRandomPillarScene(pillar: ContentPillar): string {
  if (!pillar.imageSceneBank?.length) return "";
  return pillar.imageSceneBank[Math.floor(Math.random() * pillar.imageSceneBank.length)];
}
