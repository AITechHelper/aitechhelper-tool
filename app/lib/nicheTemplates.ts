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
/*  FITNESS COACH TEMPLATE                                              */
/* ------------------------------------------------------------------ */

const fitnessPillars: Record<string, ContentPillar> = {
  workout_tip: {
    id: "workout_tip",
    label: "Workout Tip",
    detail: "Share an actionable fitness tip your audience can use today.",
    postTypeHint: "Authority",
    imageStyleHint: "branding_text_photo",
    captionLength: "Medium",
    hashtagPack: "standard",
    promptRules: `
This is a Workout Tip post for a fitness coach.
Goal: Share a genuinely useful, actionable workout tip that positions the coach as an expert and gets followers to save or share.

CONTENT APPROACH — pick one angle:
- A specific exercise technique tip most people do wrong (and how to fix it)
- A time-efficient workout strategy for busy people
- Common gym myths debunked with real explanation
- How to structure a workout for a specific goal (fat loss, strength, muscle growth)
- Recovery and rest: why it matters more than most people think
- Form cues for a foundational exercise (squat, deadlift, push-up, etc.)

TONE & VOICE:
- Expert but approachable — like the knowledgeable trainer at the gym everyone trusts
- Practical and actionable — give them something they can do today
- Encouraging, not preachy — never shame or guilt-trip

CAPTION STRUCTURE:
- Hook: A counterintuitive insight, a common mistake, or a bold statement
- Body: 2-3 specific, actionable points
- CTA: Invite saves, questions, or comments

WHAT NOT TO DO:
- Do NOT give generic "exercise more and eat less" advice
- Do NOT fabricate specific study citations
`,
    ctaBank: [
      "Save this for your next workout",
      "Try this today and let me know how it goes",
      "Questions? Drop them below",
      "Follow for weekly fitness tips",
      "DM me to build a plan around this",
      "Share with someone who needs to hear this",
    ],
    hashtagBank: [
      "#fitnesstips", "#workoutadvice", "#fitnesscoach", "#personaltrainer",
      "#gymtips", "#fitness", "#workout", "#fitlife", "#strengthtraining",
      "#exercisetips", "#fitnessmotivation", "#healthylifestyle", "#gymlife",
      "#trainhard", "#fitnessgoals", "#workoutmotivation", "#fitfam",
      "#fitnesstip", "#bodytransformation", "#getfit",
    ],
    postIdeas: [
      "The squat mistake 90% of people make (and the simple fix)",
      "Why you should train less to gain more — the science of recovery",
      "3 bodyweight exercises that beat the machines every time",
      "The 20-minute workout structure that actually works for busy people",
      "Why progressive overload is the only principle that matters for growth",
      "The warm-up routine that prevents injury and improves performance",
    ],
    captionHooks: [
      "You're working out wrong — and it's costing you results.",
      "The best workout is the one you'll actually do. Here's how to build it.",
      "Most people skip this step at the gym. Don't be most people.",
      "I've trained hundreds of clients. This one change moves the needle most.",
      "Your workout is only as good as your recovery. Here's what that actually means.",
    ],
    imageSceneBank: [
      "Fit person performing a clean exercise movement in a bright modern gym, athletic wear, focused expression, motivational fitness photography",
      "Personal trainer coaching a client with proper form, professional gym environment, supportive and expert energy, fitness lifestyle photography",
      "Clean flat lay of workout equipment — dumbbells, resistance bands, water bottle — on a gym floor, bright motivational fitness aesthetic",
      "Person mid-exercise with natural gym lighting, authentic effort and focus, real fitness photography style",
    ],
  },

  transformation: {
    id: "transformation",
    label: "Client Win",
    detail: "Showcase a client result or transformation to build trust.",
    postTypeHint: "Testimonial",
    imageStyleHint: "branding_text_photo",
    captionLength: "Short",
    hashtagPack: "standard",
    promptRules: `
This is a Client Win / Transformation post for a fitness coach.
Goal: Build credibility and inspire action through real client results, transformations, or success stories.

CONTENT APPROACH:
- If specific results are provided (lbs lost, weeks, specific achievement), use them exactly
- If nothing provided, write compelling general social proof:
  - The emotional milestone: "She came to me exhausted and frustrated. 90 days later, she ran her first 5K."
  - The unexpected win: "He didn't lose weight — he gained energy, confidence, and a routine he loves."
  - The consistency story: "12 weeks of showing up. That's the whole secret."

CAPTION STRUCTURE:
- Hook: Lead with the result or the emotional moment, not the process
- Body: 1-2 sentences of brief context or the client's own words
- CTA: Warm invitation to start their own journey

TONE & VOICE:
- Warm, genuine, celebratory — let the result speak
- Emotional but grounded — real transformation stories are powerful without exaggeration
`,
    ctaBank: [
      "Your transformation starts with one message — DM me",
      "Ready to write your own story? Let's talk",
      "This could be you — reach out today",
      "Follow to see more results like this",
      "DM me 'START' to begin your journey",
    ],
    hashtagBank: [
      "#transformation", "#clientresults", "#fitnesstransformation", "#weightloss",
      "#bodyrecomposition", "#fitnessjourney", "#progressnotperfection", "#realresults",
      "#fitcoach", "#personaltrainer", "#clientwin", "#fitnessgoals",
      "#transformationtuesday", "#healthjourney", "#fitnessmotivation", "#strongnotskinny",
    ],
    postIdeas: [
      "Client went from zero gym experience to 3x/week in 6 weeks",
      "She said she was 'too old' to get fit. Here's what happened next.",
      "Lost 20lbs — but the real win was something else entirely",
      "8 weeks of consistency, zero crash dieting, real results",
      "The client who hated the gym now can't miss a session",
    ],
    captionHooks: [
      "She came to me exhausted and frustrated. Here's where she is now.",
      "Results don't lie. This is what 12 weeks of consistency looks like.",
      "He didn't think he had time. We found it anyway.",
      "This is my favorite part of the job — this moment right here.",
      "12 weeks ago, she told me she'd never done a push-up in her life.",
    ],
    imageSceneBank: [
      "Happy fitness client celebrating a milestone in gym setting, genuine joy and pride, authentic fitness photography",
      "Before and after style split image layout (clean graphic design aesthetic), no actual faces required, motivational fitness branding",
      "Trainer and client high-five or celebrating a workout milestone, warm authentic moment, fitness lifestyle photography",
      "Person looking strong and confident after a workout, natural gym lighting, authentic achievement energy",
    ],
  },

  nutrition: {
    id: "nutrition",
    label: "Nutrition Advice",
    detail: "Educate your audience with practical, evidence-based nutrition guidance.",
    postTypeHint: "Educational",
    imageStyleHint: null,
    captionLength: "Medium",
    hashtagPack: "heavy",
    promptRules: `
This is a Nutrition Advice post for a fitness coach.
Goal: Build lasting trust by teaching practical, evidence-based nutrition guidance that followers can actually use.

CONTENT TOPICS — pick the most useful:
- Protein: why it matters, how much you actually need, easy ways to hit your target
- Meal timing myths: does it actually matter when you eat?
- How to build a simple, sustainable nutrition approach without obsessing
- Common diet mistakes: cutting too many calories, eliminating food groups unnecessarily
- Hydration: how it affects performance and recovery more than most realize
- How to eat well when you're busy: practical meal prep basics
- Understanding macros without making it complicated
- Why consistency beats perfection in nutrition every time

TONE & VOICE:
- Clear and practical — cut through the noise of nutrition misinformation
- Non-judgmental and encouraging — no guilt, no extreme restriction messaging
- Evidence-based but accessible — no need to cite papers, just be accurate

CAPTION STRUCTURE:
- Hook: A myth to debunk or a surprising practical insight
- Body: 2-3 concrete, actionable tips
- CTA: Save, share, or ask a question
`,
    ctaBank: [
      "Save this for your next grocery run",
      "Questions about your nutrition? DM me",
      "Follow for more nutrition tips that actually work",
      "Share with someone who needs to hear this",
      "Bookmark this — you'll use it",
    ],
    hashtagBank: [
      "#nutrition", "#nutritiontips", "#healthyeating", "#eatwell",
      "#mealprep", "#proteingoals", "#healthylifestyle", "#fitnessnutrition",
      "#macros", "#nutritionadvice", "#cleaneating", "#foodismedicine",
      "#healthyhabits", "#nutritioncoach", "#fitnessdiet", "#eatforperformance",
      "#weightlossjourney", "#intuitiveeating", "#sustainableeating", "#nofadfood",
    ],
    postIdeas: [
      "The protein rule that simplifies nutrition for 99% of people",
      "Meal prep in 45 minutes: the only system busy people actually stick to",
      "Why most people under-eat protein (and why that's slowing their progress)",
      "The biggest nutrition mistake I see clients make every week",
      "3 things to eat more of before worrying about what to cut",
      "Does meal timing actually matter? The honest answer.",
    ],
    captionHooks: [
      "You don't need a perfect diet. You need a sustainable one.",
      "The nutrition rule I give every new client on day one.",
      "Most people don't need to eat less. They need to eat smarter.",
      "Forget the diet. Here's what actually works long-term.",
      "If you only change one thing about how you eat, make it this.",
    ],
    imageSceneBank: [
      "Colorful healthy meal prep containers with fresh vegetables and protein, bright clean food photography, organized and appetizing",
      "Fresh whole foods flat lay — vegetables, lean proteins, healthy ingredients — clean bright food photography",
      "Person preparing a healthy meal in a clean modern kitchen, natural light, wholesome lifestyle photography",
      "Clean graphic design with bold typography layout representing nutrition data (no actual text rendered), health and wellness aesthetic",
    ],
  },

  mindset: {
    id: "mindset",
    label: "Mindset",
    detail: "Inspire and motivate your audience with mindset and consistency content.",
    postTypeHint: "Engagement",
    imageStyleHint: "branding_text_only",
    captionLength: "Short",
    hashtagPack: "light",
    promptRules: `
This is a Mindset / Motivation post for a fitness coach.
Goal: Inspire genuine action and consistency — not generic empty motivation, but real perspective shifts.

CONTENT APPROACH:
- The identity shift: "You don't find motivation — you build identity. Consistent people don't feel motivated every day. They show up anyway."
- Reframing obstacles: turning "I don't have time" or "I'll start Monday" into actionable perspective
- The long game: why results come from systems, not perfection
- Celebrating the unsexy: the value of showing up on hard days
- The comparison trap: focusing on personal progress over external validation
- Rest and recovery as part of the plan, not a sign of weakness

TONE & VOICE:
- Direct and honest — not hollow affirmations
- Empathetic and encouraging — understand the real struggle
- Short and punchy — mindset posts land harder when they're tight

CAPTION STRUCTURE:
- Strong hook that makes them feel seen
- 1-2 punchy lines of perspective
- Simple, warm CTA
`,
    ctaBank: [
      "Save this for a hard day",
      "Tag someone who needs to hear this",
      "Which one resonates with you? Tell me below",
      "This is for the person who almost didn't show up today",
      "Share if this hit home",
    ],
    hashtagBank: [
      "#mindset", "#fitnessmindset", "#consistency", "#motivation",
      "#fitnessmotivation", "#growthmindset", "#discipline", "#progress",
      "#fitnesslife", "#showedup", "#keepgoing", "#fitfam",
    ],
    postIdeas: [
      "Why motivation is unreliable — and what to build instead",
      "The permission slip to have a bad workout and keep going anyway",
      "You're not behind. You're exactly where you're supposed to be.",
      "What separates people who get results from those who don't",
      "The Monday reset isn't real — consistency starts right now",
    ],
    captionHooks: [
      "You're not going to feel like it. Show up anyway.",
      "Motivation gets you started. Identity keeps you going.",
      "The best workout is the one you almost skipped.",
      "Progress isn't loud. It's quiet and consistent.",
      "Stop waiting for the perfect day. It's not coming.",
    ],
    imageSceneBank: [
      "Person at the end of a tough workout, exhausted but proud, authentic achievement moment, dramatic natural gym lighting",
      "Bold motivational typography layout on a dark athletic background (no actual text rendered), high-contrast fitness branding aesthetic",
      "Early morning gym scene with one person training alone in soft light, quiet determination, inspiring fitness photography",
      "Close-up of athletic hands gripping weights or a pull-up bar, grit and determination, powerful fitness photography",
    ],
  },

  fitness_community: {
    id: "fitness_community",
    label: "Community",
    detail: "Show personality, connect with your audience, and build your community.",
    postTypeHint: "Engagement",
    imageStyleHint: "lifestyle_photo",
    captionLength: "Short",
    hashtagPack: "light",
    promptRules: `
This is a Community / Lifestyle post for a fitness coach.
Goal: Show authentic personality, spark genuine conversation, and build a loyal community — not selling anything.

CONTENT TOPICS:
- A personal fitness milestone, lesson learned, or moment behind the scenes
- An honest reflection about the fitness journey — the messy middle, not just the highlight reel
- Ask a question that gets followers talking (favorite workout, hardest part of staying consistent, etc.)
- Something fun, relatable, or self-aware about the fitness lifestyle
- A recommendation: favorite workout song, recovery tool, meal, gym bag item
- What a typical day looks like for this coach — authentic and real

TONE & VOICE:
- Warm, human, and real — people follow people, not brands
- Relatable and fun — not every post has to be educational
- Invite conversation — make followers feel like part of a community
`,
    ctaBank: [
      "Tell me yours in the comments",
      "What do you think? Drop it below",
      "Tag your workout partner",
      "Double tap if you relate",
      "Save if this is your life right now",
    ],
    hashtagBank: [
      "#fitlifestyle", "#fitfam", "#gymlife", "#fitnesslife", "#coachlife",
      "#personaltrainer", "#communityovercompetition", "#fitspo",
      "#realfitness", "#fitnesscommunity", "#healthyhabits", "#wellnesslife",
    ],
    postIdeas: [
      "What I eat in a day (real version, not the perfect Instagram version)",
      "The workout that humbled me this week — story time",
      "My most asked question: what's your gym playlist right now?",
      "Rate your gym pet peeve 1-10 — mine is people not re-racking weights",
      "What I wish I knew when I first started training",
    ],
    captionHooks: [
      "Real talk: this week's workout did not go as planned.",
      "Nobody talks about this part of being a fitness coach.",
      "Asking for a friend: does anyone else feel this?",
      "Behind the scenes of a workout that almost broke me (in the best way).",
      "My clients always ask me this. Here's my honest answer.",
    ],
    imageSceneBank: [
      "Candid behind-the-scenes moment of a fitness coach in a genuine moment — laughing, stretching, or prepping — authentic lifestyle photography",
      "Personal trainer with a small group of clients in a casual gym setting, warm community energy, genuine connection",
      "Person enjoying post-workout recovery: smoothie, stretching, relaxing — authentic and relatable lifestyle photography",
      "Flat lay of a gym bag, workout gear, and personal items that tell a story about the fitness lifestyle",
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  RESTAURANT OWNER TEMPLATE                                           */
/* ------------------------------------------------------------------ */

const restaurantPillars: Record<string, ContentPillar> = {
  menu_feature: {
    id: "menu_feature",
    label: "Menu Feature",
    detail: "Spotlight a dish or drink to create cravings and drive visits.",
    postTypeHint: "Promotion",
    imageStyleHint: "lifestyle_photo",
    captionLength: "Medium",
    hashtagPack: "standard",
    promptRules: `
This is a Menu Feature post for a restaurant owner.
Goal: Showcase a dish or drink in a way that creates genuine craving and drives people to visit or order.

CONTENT APPROACH:
- If specific dish details are provided (name, ingredients, flavors, specials), use them exactly
- If nothing provided, write compelling food content focused on:
  - The sensory experience: taste, texture, aroma, visual presentation
  - The story behind the dish: where the recipe came from, what makes it special
  - The occasion it's perfect for: date night, lunch catch-up, weekend treat
  - A limited-time or seasonal special that creates urgency

CAPTION STRUCTURE:
- Hook: Paint a sensory picture or create immediate craving in the first line
  Strong examples: "The dish that keeps people coming back every single week."
                   "Crispy on the outside, impossibly tender inside. We've been perfecting this for years."
                   "Friday nights were made for this."
- Body: 2-3 lines that describe the dish with sensory language and the feeling of eating it
- CTA: Drive action — visit, order, make a reservation

TONE & VOICE:
- Appetizing, warm, and inviting — make them hungry through the screen
- Personal and passionate — this is YOUR food and you love it
- Do NOT use a dry ingredient list — translate every detail into an experience

WHAT NOT TO DO:
- Do NOT fabricate specific prices unless provided
- Do NOT use generic "delicious food" language — be specific and sensory
`,
    ctaBank: [
      "Reserve your table — link in bio",
      "Order online tonight — link in bio",
      "Come in this week and try it",
      "Tag someone you'd share this with",
      "Available this weekend only — don't miss it",
      "DM us to book your table",
    ],
    hashtagBank: [
      "#foodie", "#restaurant", "#foodphotography", "#eats", "#foodlover",
      "#instafood", "#yummy", "#delicious", "#chef", "#foodstagram",
      "#localrestaurant", "#supportlocal", "#dinner", "#lunch", "#brunch",
      "#eatlocal", "#foodiegram", "#menufeature", "#chefspecial", "#todaysmenu",
    ],
    postIdeas: [
      "The dish our regulars won't let us take off the menu",
      "This weekend's special — and why we're obsessed with it",
      "The story behind our most popular dish",
      "Perfect for date night: our chef's current favorite on the menu",
      "The dish that started it all — our signature item",
      "Seasonal special: only available while it lasts",
    ],
    captionHooks: [
      "The dish that keeps people coming back every single week.",
      "Crispy, tender, and made entirely from scratch. Here it is.",
      "This is the one our regulars order every single time.",
      "Friday night deserves this. Full stop.",
      "We've been perfecting this recipe for years. It shows.",
    ],
    imageSceneBank: [
      "Close-up of a beautifully plated restaurant dish with professional food photography lighting, appetizing presentation, warm restaurant ambiance",
      "Restaurant dish on a rustic wooden table with soft candlelight, intimate dinner atmosphere, authentic food photography",
      "Chef's hands plating an artful dish in a restaurant kitchen, professional culinary moment, behind-the-scenes energy",
      "Overhead flat lay of a signature dish with complementary elements — bread, wine, sides — beautiful restaurant food photography",
    ],
  },

  behind_scenes: {
    id: "behind_scenes",
    label: "Behind the Scenes",
    detail: "Show the craftsmanship, passion, and people behind your restaurant.",
    postTypeHint: "Engagement",
    imageStyleHint: "lifestyle_photo",
    captionLength: "Medium",
    hashtagPack: "standard",
    promptRules: `
This is a Behind the Scenes post for a restaurant owner.
Goal: Show the passion, craft, and real people behind the restaurant — build deep connection and loyalty.

CONTENT APPROACH:
- A glimpse into kitchen prep: the early morning, the mise en place, the team before service
- The sourcing story: a local farm, specialty ingredient, or market run
- A recipe in progress: how a dish evolved, a technique being mastered
- Meet the team: a chef, server, or front-of-house person who makes the restaurant special
- The founder story: why this restaurant exists, what drives the passion
- The small details customers never see that make the experience special

TONE & VOICE:
- Authentic, warm, and passionate — show what makes this place different from every other restaurant
- Human and personal — people connect with people, not just food
- Proud but humble — share the craft without being boastful

CAPTION STRUCTURE:
- Hook: An inside look or unexpected detail that draws them in
- Body: 2-3 lines that share the story or the people behind it
- CTA: Invite them in to experience it
`,
    ctaBank: [
      "Come see for yourself — book a table this week",
      "This is what every plate is made with care from",
      "Tag someone who would love this",
      "We'd love to have you — reserve below",
      "Follow to see more of what goes into every dish",
    ],
    hashtagBank: [
      "#behindthescenes", "#kitchenlife", "#cheflife", "#restaurantlife",
      "#fromscratckcooking", "#localrestaurant", "#freshingredients", "#chef",
      "#foodcraft", "#cookwithpassion", "#hospitality", "#eatlocal",
      "#madewithlove", "#smallrestaurant", "#supportlocal", "#kitchenteam",
    ],
    postIdeas: [
      "4am prep: what happens before we open the doors",
      "Meet the chef behind the magic — their story in their own words",
      "The local farm where we source our produce every week",
      "The recipe that took us three months to get exactly right",
      "What mise en place looks like before a busy Saturday service",
      "The team that makes every night possible — a small tribute",
    ],
    captionHooks: [
      "By the time you sit down, this has already been happening for 6 hours.",
      "This is what every plate starts with.",
      "Meet the person behind your favorite dish.",
      "We source this ingredient from 15 miles away. Here's why it matters.",
      "The part of this job nobody sees. And the part we love most.",
    ],
    imageSceneBank: [
      "Restaurant kitchen in full prep mode, chef working with focus and skill, authentic behind-the-scenes culinary photography",
      "Chef's hands carefully preparing or plating a dish, skilled technique, warm kitchen lighting, genuine craft moment",
      "Restaurant team member smiling in their element — server, host, or chef — genuine warm hospitality photography",
      "Local produce or fresh ingredients being unboxed or inspected at a restaurant kitchen, farm-to-table authenticity",
    ],
  },

  customer_love: {
    id: "customer_love",
    label: "Customer Love",
    detail: "Share reviews, celebrations, and guest experiences to build trust.",
    postTypeHint: "Testimonial",
    imageStyleHint: "branding_text_photo",
    captionLength: "Short",
    hashtagPack: "standard",
    promptRules: `
This is a Customer Love / Social Proof post for a restaurant owner.
Goal: Build credibility and warm connection through real guest experiences, reviews, and special moments.

CONTENT APPROACH:
- If a real review or testimonial is provided, use it directly — quote it with context
- If nothing provided, write compelling general social proof:
  - The loyal regular: "Some guests have been coming every Friday for years. That's everything."
  - The celebration moment: "We've hosted over 300 anniversary dinners. Each one matters."
  - The emotional milestone: "When someone chooses us for their birthday dinner, we take that seriously."
  - The word-of-mouth moment: "The best compliment? When guests bring their family back."

CAPTION STRUCTURE:
- Hook: Lead with the guest's words, the occasion, or the feeling
- Body: Brief context that makes the story real
- CTA: Warm, inviting — encourage them to make a reservation or create their own memory

TONE & VOICE:
- Warm, grateful, and genuine — let the guest's experience do the talking
- Personal and heartfelt — restaurants are deeply emotional for guests
`,
    ctaBank: [
      "Reserve your table — we'd love to see you",
      "Ready to make your own memory? Book below",
      "Tag someone you'd bring here",
      "Follow along and let us earn your loyalty",
      "DM us to plan your next special occasion",
    ],
    hashtagBank: [
      "#happyguests", "#restaurantlove", "#guestexperience", "#dinnerout",
      "#localrestaurant", "#foodlover", "#restaurantreview", "#5stars",
      "#eatlocal", "#supportlocal", "#dinnernight", "#specialoccasion",
      "#restaurantlife", "#hospitality", "#customerappreciation", "#thankful",
    ],
    postIdeas: [
      "A review that made our whole team smile — sharing it here",
      "The couple that came back for their 10th anniversary dinner",
      "What a guest said that stopped us in our tracks",
      "We've hosted 200 birthday dinners this year. Here's why we love it.",
      "The family that's been coming since we opened — a love letter back to them",
    ],
    captionHooks: [
      "This review made our whole kitchen stop what they were doing.",
      "She came back for her 5th anniversary dinner. We're honored.",
      "The best thing someone has ever said about our food.",
      "This is why we do what we do.",
      "To the guests who keep coming back — this is for you.",
    ],
    imageSceneBank: [
      "Happy guests enjoying a meal at a restaurant table, warm candlelit atmosphere, genuine smiles and connection, lifestyle restaurant photography",
      "Clean branded quote layout on a warm restaurant-toned background (no actual text rendered), testimonial card design aesthetic",
      "Special occasion dinner celebration — birthday candles, champagne glasses — warm and joyful restaurant moment",
      "Restaurant host or manager warmly greeting guests at the entrance, genuine hospitality, inviting atmosphere",
    ],
  },

  food_knowledge: {
    id: "food_knowledge",
    label: "Food Education",
    detail: "Educate your audience about ingredients, techniques, or food culture.",
    postTypeHint: "Educational",
    imageStyleHint: null,
    captionLength: "Medium",
    hashtagPack: "heavy",
    promptRules: `
This is a Food Education post for a restaurant owner.
Goal: Build lasting credibility and genuine connection by teaching your audience something interesting and useful about food, cooking, or dining.

CONTENT TOPICS — pick the most engaging:
- The story behind a signature ingredient: why it's special, where it comes from, how to use it
- A cooking technique explained simply: what braising actually is, how to build a sauce, why resting meat matters
- Seasonal eating: why cooking with what's in season tastes better and supports local farms
- Flavor pairing basics: why certain ingredients work together
- The difference between common misconceptions: searing "seals in juices" (myth), MSG (misunderstood), etc.
- Wine or cocktail pairing explained in plain language
- A cultural food story: the origin of a dish or cuisine represented in the restaurant
- How to order at a restaurant like a regular: the insider knowledge

TONE & VOICE:
- Knowledgeable but approachable — like a passionate chef who loves sharing their craft
- Never condescending — make food knowledge feel accessible and fun
- Personal and specific — tie education back to your restaurant and your cooking

CAPTION STRUCTURE:
- Hook: A surprising fact, a common myth, or a question they've wondered about
- Body: 2-3 clear, interesting points
- CTA: Invite them to experience it at the restaurant
`,
    ctaBank: [
      "Come taste what this actually means on the plate",
      "Ask your server about this on your next visit",
      "Save this for your next dinner reservation",
      "Questions about our menu? We love talking food — ask us anything",
      "Follow for more food stories from our kitchen",
    ],
    hashtagBank: [
      "#foodknowledge", "#cookingtips", "#foodscience", "#chefsecrets",
      "#foodculture", "#ingredientspotlight", "#cookingtechniques", "#foodie",
      "#restaurantlife", "#cheflife", "#fromscratch", "#foodstory",
      "#eatlocal", "#localingredients", "#farmtotable", "#seasonaleating",
      "#winepairing", "#foodphotography", "#foodlover", "#culinaryarts",
    ],
    postIdeas: [
      "Why resting your steak actually matters (and what happens if you don't)",
      "The ingredient we source locally that changes everything about this dish",
      "What 'farm to table' actually means — and how we live it every day",
      "The cooking technique behind our most popular dish, explained simply",
      "Why our menu changes seasonally — and what's coming next",
      "3 things food myths get completely wrong (according to our kitchen)",
    ],
    captionHooks: [
      "Most people cut into their steak immediately. Here's why that's a mistake.",
      "This ingredient drives 40% of our flavor. Most people don't know what it is.",
      "We didn't put this on the menu by accident. Here's the story.",
      "The cooking technique that separates a good dish from a great one.",
      "Every season we change the menu. Here's the reason — and what's coming.",
    ],
    imageSceneBank: [
      "Close-up of a beautiful fresh ingredient — herbs, specialty produce, or artisan item — on a clean kitchen surface, artful food photography",
      "Chef demonstrating a technique in the kitchen, focused and skilled, educational culinary moment, warm professional kitchen lighting",
      "Flat lay of seasonal ingredients with a rustic, farm-fresh aesthetic, warm natural light, food storytelling photography",
      "Clean infographic-style layout with food imagery in background (no text rendered), educational food content aesthetic",
    ],
  },

  restaurant_community: {
    id: "restaurant_community",
    label: "Community",
    detail: "Show local love, neighborhood connection, and your restaurant's heart.",
    postTypeHint: "Engagement",
    imageStyleHint: "lifestyle_photo",
    captionLength: "Short",
    hashtagPack: "light",
    promptRules: `
This is a Community post for a restaurant owner.
Goal: Show authentic local connection, neighborhood pride, and the human heart of the restaurant — NOT a sales post.

CONTENT TOPICS:
- A shoutout to a local supplier, farm, or partner business
- A neighborhood event the restaurant is part of or supporting
- The community the restaurant serves and why it matters
- A personal story about what this neighborhood means to the owner
- A local cause, organization, or event worth highlighting
- The regulars who make the restaurant what it is (without naming them)
- A seasonal or community moment that captures the spirit of the area

TONE & VOICE:
- Warm, genuine, and local — this is a restaurant that belongs to its neighborhood
- Proud and connected — not promotional
- Zero mention of reservations or sales pitches — just community love
`,
    ctaBank: [
      "What's your favorite thing about this neighborhood? Tell us below",
      "Tag a neighbor who needs to know about this",
      "Come be part of this community — we'd love to feed you",
      "Support local this week — we all win",
      "Drop your favorite local spot below",
    ],
    hashtagBank: [
      "#localrestaurant", "#eatlocal", "#supportlocal", "#communitymatters",
      "#neighborhoodlove", "#localbusiness", "#smallbusiness", "#communityeats",
      "#eatyourneighborhood", "#farmtotable", "#locallove", "#restaurantcommunity",
    ],
    postIdeas: [
      "The local farm that's been supplying us since day one — thank you",
      "We're proud to support this neighborhood event this weekend",
      "What this block means to us — a love letter to our corner",
      "Meet the people who grow what we cook — our farmers market walk",
      "This neighborhood fed our dream. We're just trying to return the favor.",
    ],
    captionHooks: [
      "This neighborhood made us. We just try to give back every night.",
      "We source this ingredient from a farm 12 miles away. Here's why.",
      "The regular who's been at the same table every Sunday for three years.",
      "We're more than a restaurant. This is why.",
      "Local means something here. Here's what.",
    ],
    imageSceneBank: [
      "Charming street view of a local restaurant exterior on a neighborhood block, warm inviting light, authentic community feel",
      "Restaurant owner or staff at a local farmers market selecting produce, genuine community connection, warm natural lighting",
      "Neighborhood street scene near a restaurant, vibrant local life, community warmth, lifestyle photography",
      "Restaurant staff member interacting with a local supplier or community partner, genuine relationship, authentic moment",
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

  fitness: {
    id: "fitness",
    label: "Fitness Coach",
    weeklyStructure: [
      "workout_tip",          // Monday
      "transformation",       // Tuesday
      "nutrition",            // Wednesday
      "mindset",              // Thursday
      "fitness_community",    // Friday
    ],
    pillars: fitnessPillars,
    tonePreset: "Energetic",
    defaultHashtagCount: 12,
  },

  restaurant: {
    id: "restaurant",
    label: "Restaurant Owner",
    weeklyStructure: [
      "menu_feature",         // Monday
      "behind_scenes",        // Tuesday
      "customer_love",        // Wednesday
      "food_knowledge",       // Thursday
      "restaurant_community", // Friday
    ],
    pillars: restaurantPillars,
    tonePreset: "Warm",
    defaultHashtagCount: 10,
  },
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

/* ------------------------------------------------------------------ */
/*  Niche routing helpers                                               */
/* ------------------------------------------------------------------ */

// Maps a stored niche label (from the brand profile dropdown) to a template key.
export function nicheKeyFromLabel(label: string): string {
  const map: Record<string, string> = {
    "Real Estate Agent": "realtor",
    "Fitness Coach": "fitness",
    "Restaurant Owner": "restaurant",
  };
  return map[label] ?? "realtor";
}

// Maps a stored niche label to its niche-specific calendar URL path.
export function getNicheCalendarPath(label: string): string {
  const map: Record<string, string> = {
    "Real Estate Agent": "/realtor-calendar",
    "Fitness Coach": "/fitness-coach-calendar",
    "Restaurant Owner": "/restaurant-calendar",
  };
  return map[label] ?? "/calendar";
}
