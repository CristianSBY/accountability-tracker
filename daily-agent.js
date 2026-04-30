// daily-agent.js
// Corporate Accountability Tracker — Full Spectrum Edition
// Perplexity Agent API — POST https://api.perplexity.ai/v1/agent
// Covers: corporate corruption, political enrichment, child exploitation,
// fossil fuel beneficiaries, FDA rollbacks, AIPAC money, Trump family deals

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

const SEARCH_TOPICS = [

  // ── TRUMP FAMILY PERSONAL ENRICHMENT ─────────────────────────────────────────
  {
    label: "Trump Family — Kushner Saudi $2B Deal",
    query: "Jared Kushner Affinity Partners $2 billion Saudi Arabia sovereign wealth fund investment conflict of interest",
    issue_tags: ["trump-financial", "sanctions", "wealth-extraction"]
  },
  {
    label: "Trump Family — $TRUMP Crypto Coin Enrichment",
    query: "Trump crypto coin TRUMP memecoin personal enrichment conflict of interest foreign buyers",
    issue_tags: ["trump-financial", "market-manipulation", "wealth-extraction"]
  },
  {
    label: "Trump Family — Mar-a-Lago Foreign Government Payments",
    query: "foreign governments Saudi UAE Qatar paying Trump hotels Mar-a-Lago emoluments arms deals",
    issue_tags: ["trump-financial", "sanctions", "lobbying"]
  },
  {
    label: "Trump Family — Truth Social Stock Manipulation",
    query: "Truth Social DJT stock Trump Media manipulation insider trading inflated valuation",
    issue_tags: ["trump-financial", "market-manipulation", "wealth-extraction"]
  },
  {
    label: "Trump Jr — 1789 Capital Pentagon Contracts",
    query: "Donald Trump Jr 1789 Capital venture fund portfolio companies Pentagon DOE federal contracts awarded",
    issue_tags: ["trump-financial", "federal-contracts", "wealth-extraction"]
  },
  {
    label: "Kushner — Middle East Real Estate Deals",
    query: "Jared Kushner real estate deals Qatar UAE Saudi Arabia Abraham Accords benefit",
    issue_tags: ["trump-financial", "wealth-extraction", "sanctions"]
  },
  {
    label: "Ivanka Trump — China Trademarks",
    query: "Ivanka Trump China trademark approvals while father negotiating trade deals conflict interest",
    issue_tags: ["trump-financial", "lobbying", "wealth-extraction"]
  },

  // ── ELON MUSK / DOGE CONFLICTS ───────────────────────────────────────────────
  {
    label: "Elon Musk — DOGE Conflicts Tesla SpaceX Federal Contracts",
    query: "Elon Musk DOGE Department of Government Efficiency conflict of interest Tesla SpaceX federal contracts regulators fired",
    issue_tags: ["trump-financial", "federal-contracts", "surveillance-tech", "wealth-extraction"]
  },
  {
    label: "Elon Musk — X Twitter Political Influence Disinformation",
    query: "Elon Musk X Twitter algorithm amplification Trump MAGA disinformation political ads content moderation removed",
    issue_tags: ["trump-financial", "media", "disinformation"]
  },
  {
    label: "Elon Musk — SpaceX NASA FAA Regulatory Favoritism",
    query: "SpaceX NASA contracts FAA regulatory favoritism Elon Musk DOGE cutting SpaceX competitors regulators",
    issue_tags: ["trump-financial", "federal-contracts", "financial-deregulation"]
  },
  {
    label: "Tesla — Trump Tax Credits Tariff Exemptions",
    query: "Tesla Trump tariff exemptions EV tax credits deregulation NHTSA safety standard rollbacks benefit",
    issue_tags: ["trump-financial", "tariffs", "environment", "financial-deregulation"]
  },

  // ── SUPREME COURT CORRUPTION ─────────────────────────────────────────────────
  {
    label: "Clarence Thomas — Harlan Crow Corporate Gifts",
    query: "Clarence Thomas Harlan Crow gifts real estate luxury travel undisclosed corporate connections",
    issue_tags: ["trump-financial", "lobbying", "wealth-extraction"]
  },
  {
    label: "Samuel Alito — Koch Network Gifts",
    query: "Samuel Alito Koch network undisclosed gifts trips fishing Alaska luxury travel",
    issue_tags: ["trump-financial", "lobbying", "wealth-extraction"]
  },
  {
    label: "Supreme Court — Corporate Gift Givers",
    query: "companies executives who gave gifts to Supreme Court justices Harlan Crow Robin Arkley",
    issue_tags: ["trump-financial", "lobbying", "wealth-extraction"]
  },

  // ── FOSSIL FUEL & POLLUTION BENEFICIARIES (PRD) ──────────────────────────────
  {
    label: "Fossil Fuels — EPA Rollback Tax Breaks $18B",
    query: "oil gas companies benefiting $18 billion tax incentives Trump 2025 climate energy legislation EPA rollback methane rules",
    issue_tags: ["environment", "fossil-fuels", "tax-cuts", "trump-financial"]
  },
  {
    label: "Coal — $625M Investment Federal Subsidy",
    query: "coal companies $625 million federal investment Trump subsidy bailout public lands drilling permit approval",
    issue_tags: ["environment", "fossil-fuels", "federal-contracts", "trump-financial"]
  },
  {
    label: "Fossil Fuels — Methane Penalty Savings",
    query: "oil gas companies saving methane penalty fees Trump EPA methane rule rollback quantified savings",
    issue_tags: ["environment", "fossil-fuels", "financial-deregulation"]
  },
  {
    label: "LNG — Export Terminal Permits Approved",
    query: "LNG liquefied natural gas export terminal permits approved Trump DOE companies benefiting",
    issue_tags: ["environment", "fossil-fuels", "federal-contracts"]
  },
  {
    label: "Fossil Fuels — Vehicle Emission Standard Rollbacks",
    query: "automakers oil companies benefiting Trump vehicle emission standard rollback fuel economy CAFE standards",
    issue_tags: ["environment", "fossil-fuels", "financial-deregulation", "lobbying"]
  },

  // ── FDA & HEALTH REGULATION ROLLBACKS (PRD) ──────────────────────────────────
  {
    label: "FDA — One Pivotal Trial Approval Fast Track Beneficiaries",
    query: "pharma biotech companies benefiting FDA one pivotal trial approval standard reduction faster drug approval",
    issue_tags: ["healthcare", "financial-deregulation", "lobbying", "wealth-extraction"]
  },
  {
    label: "FDA — Orphan Drug Incentive Changes Beneficiaries",
    query: "pharmaceutical companies benefiting orphan drug incentive changes HHS FDA 2025 2026",
    issue_tags: ["healthcare", "financial-deregulation", "price-gouging"]
  },
  {
    label: "FDA — Safety Rule Rollback Beneficiaries",
    query: "food pharma companies benefiting FDA HHS safety testing reporting rule rollback DOGE cuts 2025 2026",
    issue_tags: ["healthcare", "food-system", "financial-deregulation"]
  },
  {
    label: "FDA — Generic Drug Fast Approval Winners",
    query: "generic drug manufacturers benefiting faster FDA approval process deregulation market cap jumps",
    issue_tags: ["healthcare", "financial-deregulation", "wealth-extraction"]
  },
  {
    label: "Pharma — Investor Windfall from CRL Real-Time Disclosure",
    query: "biopharma investors benefiting real-time complete response letter CRL disclosure FDA deregulation insider trading",
    issue_tags: ["healthcare", "market-manipulation", "financial-deregulation"]
  },

  // ── PRO-ISRAEL AIPAC MONEY & CORPORATE FUNDERS (PRD) ────────────────────────
  {
    label: "AIPAC — Top Corporate Donors Funding Pro-Israel PAC",
    query: "companies executives funding AIPAC United Democracy Project pro-Israel PAC donations corporate donors",
    issue_tags: ["gaza", "lobbying", "trump-financial"]
  },
  {
    label: "AIPAC — Top Congressional Recipients Voting for Israel Arms",
    query: "Congress members receiving most AIPAC pro-Israel PAC money who voted for Israel weapons aid",
    issue_tags: ["gaza", "weapons", "lobbying"]
  },
  {
    label: "AIPAC — Defense Contractor Beneficiaries of Pro-Israel Votes",
    query: "defense contractors benefiting weapons contracts after pro-Israel congressional votes AIPAC donations Boeing Raytheon",
    issue_tags: ["gaza", "weapons", "lobbying", "federal-contracts"]
  },
  {
    label: "Pro-Israel Lobby — Casino Adelson Dynasty Funding",
    query: "Miriam Adelson Las Vegas Sands pro-Israel lobbying AIPAC Republican donations political influence",
    issue_tags: ["gaza", "lobbying", "trump-financial"]
  },

  // ── TRUMP-LINKED GOVERNMENT CONTRACTS (PRD) ───────────────────────────────────
  {
    label: "Trump Donor Contracts — Pentagon DOD Awards",
    query: "Pentagon DoD contracts awarded companies owned by Trump donors after 2025 inauguration no-bid",
    issue_tags: ["trump-financial", "federal-contracts", "wealth-extraction"]
  },
  {
    label: "Trump Donor Contracts — DOE Energy Bailouts",
    query: "Department of Energy loans grants contracts companies tied to Trump donors family members 2025 2026",
    issue_tags: ["trump-financial", "federal-contracts", "fossil-fuels"]
  },
  {
    label: "1789 Capital — Trump Jr VC Portfolio Federal Awards",
    query: "1789 Capital Donald Trump Jr venture capital portfolio startups receiving federal contracts grants",
    issue_tags: ["trump-financial", "federal-contracts", "wealth-extraction"]
  },
  {
    label: "Trump Hotels — Foreign Government Emoluments",
    query: "foreign governments paying Trump hotels properties emoluments clause violation arms deals",
    issue_tags: ["trump-financial", "sanctions", "lobbying"]
  },

  // ── EPSTEIN CORPORATE NETWORK ─────────────────────────────────────────────────
  {
    label: "Epstein — JPMorgan Deutsche Bank Enabling",
    query: "JPMorgan Deutsche Bank Jeffrey Epstein accounts banking relationship knowingly facilitating trafficking",
    issue_tags: ["child-exploitation", "wealth-extraction", "lobbying"]
  },
  {
    label: "Epstein — Corporate Network Airlines Private Aviation",
    query: "companies airlines private jet operators that facilitated transported Jeffrey Epstein trafficking network",
    issue_tags: ["child-exploitation", "wealth-extraction"]
  },
  {
    label: "Epstein — Corporate Executives Named in Documents",
    query: "corporate executives CEOs named Jeffrey Epstein court documents flight logs companies they run",
    issue_tags: ["child-exploitation", "wealth-extraction"]
  },
  {
    label: "Epstein — Harvard MIT Corporate Donors Covering Up",
    query: "Harvard MIT corporations that donated after knowing Epstein relationship covered up ties",
    issue_tags: ["child-exploitation", "disinformation", "lobbying"]
  },

  // ── CHILD EXPLOITATION & TRAFFICKING ACCOUNTABILITY ──────────────────────────
  {
    label: "Child Detention — Private Companies Holding Migrant Children",
    query: "private companies profiting detaining migrant children CBP ICE facilities abuse reports",
    issue_tags: ["child-exploitation", "ice", "detention", "wealth-extraction"]
  },
  {
    label: "Private Equity — Group Homes Juvenile Detention Abuse",
    query: "private equity owned group homes youth detention facilities abuse records profit extraction",
    issue_tags: ["child-exploitation", "private-equity", "detention", "wealth-extraction"]
  },
  {
    label: "Social Media — CSAM Child Safety Failures",
    query: "social media platforms Instagram Facebook TikTok child sexual abuse material CSAM failures documented NCMEC reports",
    issue_tags: ["child-exploitation", "surveillance-tech", "media"]
  },
  {
    label: "Child Labor — Meat Packing Agriculture Manufacturing Violations",
    query: "companies cited child labor violations meat packing agriculture manufacturing OSHA DOL 2025 2026",
    issue_tags: ["child-exploitation", "labor", "food-system"]
  },
  {
    label: "Youth Prison — Private Companies Abuse Records",
    query: "private companies operating juvenile detention youth prisons with documented abuse sexual assault records",
    issue_tags: ["child-exploitation", "detention", "private-equity"]
  },
  {
    label: "Trafficking — Hotels Knowingly Enabling Sex Trafficking",
    query: "hotel chains Marriott Hilton Wyndham sued knowingly enabling sex trafficking on properties FOSTA SESTA",
    issue_tags: ["child-exploitation", "wealth-extraction"]
  },

  // ── OPIOID CRISIS — CORPORATE ACCOUNTABILITY ─────────────────────────────────
  {
    label: "Opioid — Purdue Pharma Successors Sackler Family",
    query: "Purdue Pharma Sackler family successor companies opioid crisis accountability settlements 2025 2026",
    issue_tags: ["healthcare", "price-gouging", "wealth-extraction", "child-exploitation"]
  },
  {
    label: "Opioid — McKesson AmerisourceBergen Distributors",
    query: "McKesson AmerisourceBergen Cardinal Health opioid distribution profits accountability settlements",
    issue_tags: ["healthcare", "price-gouging", "wealth-extraction"]
  },
  {
    label: "Opioid — Johnson & Johnson Manufacturer Accountability",
    query: "Johnson and Johnson opioid manufacturing marketing deceptive practices settlements accountability",
    issue_tags: ["healthcare", "price-gouging", "wealth-extraction"]
  },

  // ── PROJECT 2025 CORPORATE FUNDERS ───────────────────────────────────────────
  {
    label: "Project 2025 — Heritage Foundation Corporate Funders",
    query: "companies corporations funding Heritage Foundation Project 2025 government takeover blueprint",
    issue_tags: ["trump-financial", "lobbying", "disinformation", "legislation-support"]
  },
  {
    label: "Project 2025 — Corporate Beneficiaries of Implementation",
    query: "companies directly benefiting from Project 2025 policy implementation deregulation contracts",
    issue_tags: ["trump-financial", "lobbying", "federal-contracts", "financial-deregulation"]
  },

  // ── REVOLVING DOOR — TRUMP ADMIN TO INDUSTRY ─────────────────────────────────
  {
    label: "Revolving Door — Trump Officials Joining Companies They Regulated",
    query: "Trump administration officials joining companies they previously regulated lobbying revolving door 2025 2026",
    issue_tags: ["trump-financial", "lobbying", "financial-deregulation", "wealth-extraction"]
  },
  {
    label: "Revolving Door — Industry Executives Running Regulators",
    query: "industry executives appointed to run agencies regulating their former employers EPA FDA FTC 2025 2026",
    issue_tags: ["trump-financial", "lobbying", "financial-deregulation", "environment"]
  },

  // ── CONGRESSIONAL INSIDER TRADING ────────────────────────────────────────────
  {
    label: "Congressional Insider Trading — STOCK Act Violations",
    query: "Congress members trading stocks bills they voted on STOCK Act violations 2025 2026 companies involved",
    issue_tags: ["trump-financial", "market-manipulation", "lobbying", "wealth-extraction"]
  },

  // ── HOSPITAL & HEALTHCARE MONOPOLIZATION ─────────────────────────────────────
  {
    label: "Hospital Monopolization — Rural Hospital Closures PE",
    query: "private equity hospital chains closing rural hospitals while extracting profits executives bonuses",
    issue_tags: ["healthcare", "private-equity", "wealth-extraction"]
  },
  {
    label: "Insulin Price Fixing — Pharma Collusion",
    query: "insulin price fixing collusion Eli Lilly Novo Nordisk Sanofi pharmacy benefit managers",
    issue_tags: ["healthcare", "price-gouging", "wealth-extraction", "lobbying"]
  },

  // ── TRUMP SUPPORTER BILLIONAIRES & THEIR COMPANIES ──────────────────────────
  {
    label: "Elon Musk — Tesla SpaceX X xAI Full Portfolio",
    query: "Elon Musk Tesla SpaceX X Twitter xAI DOGE Trump support donations government contracts political activity",
    issue_tags: ["trump-financial", "surveillance-tech", "federal-contracts", "wealth-extraction"]
  },
  {
    label: "Jeff Bezos — Amazon Blue Origin Washington Post",
    query: "Jeff Bezos Amazon Blue Origin Washington Post Trump inauguration donation editorial softening ICE contracts",
    issue_tags: ["trump-financial", "media", "surveillance-tech", "gaza"]
  },
  {
    label: "Rupert Murdoch — Fox Corporation News Corp",
    query: "Rupert Murdoch Fox Corporation Fox News News Corp Wall Street Journal Trump disinformation political influence",
    issue_tags: ["trump-financial", "media", "disinformation"]
  },
  {
    label: "Steve Mnuchin — Liberty Strategic Capital Lionsgate",
    query: "Steve Mnuchin Liberty Strategic Capital Lionsgate investment Trump Treasury Secretary political ties",
    issue_tags: ["trump-financial", "investment", "wealth-extraction"]
  },
  {
    label: "Tim Cook — Apple Inc Trump Inauguration",
    query: "Tim Cook Apple $1 million Trump inauguration donation lobbying tax benefits China trade deals",
    issue_tags: ["trump-financial", "lobbying", "tax-cuts"]
  },
  {
    label: "Larry Ellison — Oracle ICE Contracts",
    query: "Larry Ellison Oracle Trump fundraiser donation ICE immigration enforcement contracts federal awards",
    issue_tags: ["trump-financial", "surveillance-tech", "ice", "federal-contracts"]
  },
  {
    label: "Peter Thiel — Palantir Founders Fund",
    query: "Peter Thiel Palantir Founders Fund Trump support ICE surveillance government contracts",
    issue_tags: ["trump-financial", "surveillance-tech", "ice", "federal-contracts"]
  },
  {
    label: "Steve Schwarzman — Blackstone Private Equity",
    query: "Steve Schwarzman Blackstone Trump inauguration donation private equity housing healthcare extraction",
    issue_tags: ["trump-financial", "private-equity", "wealth-extraction", "healthcare"]
  },
  {
    label: "Ken Griffin — Citadel Republican Dark Money",
    query: "Ken Griffin Citadel hedge fund Republican donations Trump political support financial deregulation",
    issue_tags: ["trump-financial", "financial-deregulation", "lobbying"]
  },
  {
    label: "Roger Penske — Penske Automotive IndyCar",
    query: "Roger Penske Penske Automotive Group IndyCar Indianapolis Motor Speedway Trump support endorsement",
    issue_tags: ["trump-financial"]
  },
  {
    label: "Tucker Carlson — Tucker Carlson Network",
    query: "Tucker Carlson Network Trump support disinformation media right-wing political influence advertisers",
    issue_tags: ["trump-financial", "media", "disinformation"]
  },
  {
    label: "Sean Hannity — Fox News Political Coordination",
    query: "Sean Hannity Fox News Trump political coordination disinformation campaign influence advertisers",
    issue_tags: ["trump-financial", "media", "disinformation"]
  },
  {
    label: "Joe Rogan — Spotify Trump Endorsement",
    query: "Joe Rogan Spotify podcast Trump endorsement political influence audience advertising revenue",
    issue_tags: ["trump-financial", "media", "disinformation"]
  },
  {
    label: "Palmer Luckey — Anduril Industries",
    query: "Palmer Luckey Anduril Industries Trump donor border surveillance ICE weapons autonomous systems",
    issue_tags: ["trump-financial", "surveillance-tech", "ice", "weapons"]
  },
  {
    label: "David Sacks — Craft Ventures AI Czar Conflicts",
    query: "David Sacks Craft Ventures Trump AI Czar crypto deregulation portfolio conflicts of interest",
    issue_tags: ["trump-financial", "financial-deregulation", "lobbying"]
  },

  // ── EXISTING CORE TOPICS ─────────────────────────────────────────────────────
  {
    label: "Trump Donations — Inauguration & PACs",
    query: "Which U.S. corporations donated to Trump's 2025 inauguration fund, PACs, or super PACs?",
    issue_tags: ["trump-financial"]
  },
  {
    label: "Dark Money — Republican Campaigns & ALEC",
    query: "Which corporations gave dark money to Republican senate or house campaigns or ALEC model legislation?",
    issue_tags: ["trump-financial", "lobbying"]
  },
  {
    label: "Federal Contracts — Post-Inauguration No-Bid Awards",
    query: "Which companies received no-bid or inflated federal contracts from Trump administration after making donations?",
    issue_tags: ["trump-financial", "federal-contracts"]
  },
  {
    label: "Tax Cuts — Billionaire & Corporate Beneficiaries",
    query: "Which corporations benefited most from Republican tax cuts, carried interest loopholes, or capital gains reductions?",
    issue_tags: ["tax-cuts", "wealth-extraction", "trump-financial"]
  },
  {
    label: "Deregulation — Financial Industry CFPB",
    query: "Which banks or financial companies lobbied for Dodd-Frank, CFPB, or Basel rollbacks and benefited?",
    issue_tags: ["financial-deregulation", "lobbying"]
  },
  {
    label: "Anti-Labor — NLRB Union Busting",
    query: "Which companies benefited from NLRB gutting, fired union organizers, or engaged in union busting under Trump?",
    issue_tags: ["labor", "union-busting", "lobbying"]
  },
  {
    label: "Voting Suppression — Corporate Funders",
    query: "Which corporations funded voter suppression legislation, gerrymandering, or restrictive voting ID laws?",
    issue_tags: ["voting-rights", "civil-rights", "lobbying"]
  },
  {
    label: "Anti-DEI — Corporate Rollbacks",
    query: "Which companies ended DEI programs or funded anti-DEI legislation under Trump administration pressure?",
    issue_tags: ["civil-rights", "trump-financial"]
  },
  {
    label: "Anti-Trans Legislation — Corporate Funders",
    query: "Which companies donated to or funded anti-transgender legislation covering healthcare, sports, or bathrooms?",
    issue_tags: ["civil-rights", "lgbtq", "lobbying"]
  },
  {
    label: "Private Equity — Healthcare Housing Food Extraction",
    query: "Which private equity firms acquired hospitals, nursing homes, housing, or food companies extracting profit while raising prices?",
    issue_tags: ["healthcare", "private-equity", "wealth-extraction", "food-system"]
  },
  {
    label: "CEO Pay vs Worker Cuts Stock Buybacks",
    query: "Which companies gave CEOs record pay while cutting workers or doing stock buybacks instead of raising wages?",
    issue_tags: ["labor", "wealth-extraction"]
  },
  {
    label: "Offshore Tax Havens — Corporate Avoidance",
    query: "Which U.S. companies use Cayman Islands or Ireland offshore tax havens to avoid U.S. taxes?",
    issue_tags: ["tax-cuts", "wealth-extraction"]
  },
  {
    label: "Gaza — Weapons Tech Logistics Suppliers",
    query: "Which U.S. companies supply weapons, AI, surveillance, or logistics to Israeli military in Gaza?",
    issue_tags: ["gaza", "weapons", "surveillance-tech"]
  },
  {
    label: "BDS — Israel Occupation Profiteers",
    query: "Which companies are BDS boycott targets for profiting from Israeli West Bank settlements or occupation?",
    issue_tags: ["gaza", "bds"]
  },
  {
    label: "ICE — Detention Surveillance Data Contractors",
    query: "Which companies have ICE detention contracts, enforcement technology, or sell data for immigration enforcement?",
    issue_tags: ["ice", "detention", "surveillance-tech"]
  },
  {
    label: "Congo Sudan — Conflict Minerals",
    query: "Which companies source conflict minerals coltan cobalt lithium from Congo or Sudan conflict zones?",
    issue_tags: ["congo", "sudan", "conflict-minerals"]
  },
  {
    label: "Russia Iran Yemen — Sanctions & Arms",
    query: "Which companies resumed Russia business, profit from Iran escalation, or supply arms to Yemen Somalia?",
    issue_tags: ["russia", "iran", "weapons", "sanctions", "conflict"]
  },
  {
    label: "Climate Denial — Corporate Dark Money Funders",
    query: "Which companies fund Heartland Institute, Heritage Foundation, or climate denial lobbying groups?",
    issue_tags: ["environment", "disinformation", "lobbying"]
  },
  {
    label: "Media Capture — Editorial Suppression Disinformation",
    query: "Which media companies softened Trump coverage, removed moderation, or funded disinformation?",
    issue_tags: ["media", "disinformation"]
  },
  {
    label: "Wage Theft Child Labor Safety Violations",
    query: "Which companies committed wage theft, child labor violations, or safety violations after enforcement was gutted?",
    issue_tags: ["labor", "child-exploitation", "wealth-extraction"]
  },
  {
    label: "Tariff Profiteers — Price Gouging Exemptions",
    query: "Which companies raised prices using Trump tariffs as cover or received tariff exemptions through lobbying?",
    issue_tags: ["tariffs", "price-gouging", "lobbying"]
  },
  {
    label: "Pharma — Price Gouging Opioids Insulin",
    query: "Which pharmaceutical companies raised drug prices, fixed insulin prices, or profited from opioid crisis?",
    issue_tags: ["healthcare", "price-gouging", "wealth-extraction"]
  }
];

const VALID_CATEGORIES = ['trump', 'israel', 'both', 'global'];
const VALID_INCIDENT_TYPES = [
  'donation', 'contract', 'investment', 'lobbying', 'bds',
  'surveillance', 'detention', 'labor-violation', 'price-gouging',
  'environmental', 'market-manipulation', 'media', 'legislation-support',
  'tax-avoidance', 'wealth-extraction', 'child-exploitation', 'other'
];
const VALID_ISSUE_TAGS = [
  'trump-financial', 'gaza', 'weapons', 'ice', 'detention',
  'surveillance-tech', 'congo', 'sudan', 'conflict-minerals',
  'venezuela', 'iran', 'food-system', 'private-equity', 'healthcare',
  'federal-contracts', 'tariffs', 'labor', 'union-busting', 'environment',
  'fossil-fuels', 'market-manipulation', 'financial-deregulation',
  'sanctions', 'russia', 'conflict', 'civil-rights', 'lgbtq', 'media',
  'disinformation', 'lobbying', 'bds', 'price-gouging', 'wealth-extraction',
  'tax-cuts', 'voting-rights', 'education', 'legislation-support',
  'child-exploitation'
];

// ─── PERPLEXITY AGENT API ─────────────────────────────────────────────────────
async function searchTopic(topic, fromDate, toDate) {
  console.log(`  🔍 [${fromDate}→${toDate}] ${topic.label}`);

  const inputText = `You are a corporate accountability and corruption researcher. Search for real, documented incidents between ${fromDate} and ${toDate}.

Topic: ${topic.label}
Search question: ${topic.query}

Track ALL of the following:
- Companies owned by or affiliated with Trump family members (Kushner, Trump Jr., Ivanka) — all their business dealings, investments, government contracts
- Companies owned by or affiliated with MAGA billionaires: Elon Musk (Tesla/SpaceX/X/xAI), Jeff Bezos (Amazon/Blue Origin/Washington Post), Rupert Murdoch (Fox/News Corp), Tim Cook (Apple), Larry Ellison (Oracle), Peter Thiel (Palantir), Steve Schwarzman (Blackstone), Ken Griffin (Citadel), Palmer Luckey (Anduril)
- Corporate donations to Trump, Republican campaigns, PACs, inauguration funds, dark money, AIPAC
- Federal contracts awarded to donor-connected companies (no-bid, inflated, post-donation)
- Companies benefiting from fossil fuel deregulation — EPA rollbacks, methane rule removal, drilling permits on federal land — with specific dollar values ($18B oil/gas tax breaks, methane penalty savings, $625M coal investments)
- Pharma/biotech companies benefiting from FDA rollbacks — faster approvals, fewer trials, orphan drug changes
- Companies funding or benefiting from AIPAC pro-Israel lobbying — defense contractors getting weapons contracts from Israel-friendly votes
- Companies tied to Jeffrey Epstein network — banks (JPMorgan, Deutsche Bank), aviation, executives named in court documents
- Private companies detaining or profiting from migrant children (ICE, CBP facilities, private equity group homes)
- Social media platforms with documented child safety failures (CSAM, predator access)
- Companies violating child labor laws or lobbying against protections
- Hotel chains sued for enabling sex trafficking
- Opioid manufacturers, distributors, and pharmacies — Purdue successors, McKesson, AmerisourceBergen
- Project 2025 / Heritage Foundation corporate funders and beneficiaries
- Supreme Court gift givers — Harlan Crow companies, Koch network executives
- Congressional insider trading — members who traded stocks in companies before voting on bills affecting them
- Revolving door — Trump officials who joined companies they regulated; industry execs running their own regulators
- Trump family personal enrichment: $TRUMP crypto, Truth Social, Mar-a-Lago foreign payments, Kushner's $2B Saudi deal

Return ONLY a raw JSON array. No markdown, no backticks, no preamble, no explanation after.
Each object MUST have ALL these fields:
{
  "company": "Full legal company name",
  "sector": "Industry sector",
  "date": "YYYY-MM-DD",
  "category": "trump" | "israel" | "both" | "global",
  "incident_type": "donation" | "contract" | "investment" | "lobbying" | "bds" | "surveillance" | "detention" | "labor-violation" | "price-gouging" | "environmental" | "market-manipulation" | "media" | "legislation-support" | "tax-avoidance" | "wealth-extraction" | "child-exploitation" | "other",
  "issue_tags": ["tag1", "tag2"],
  "reason": "3-5 factual sentences. Name specific dollar amounts, policy names, contract values, owner/founder connections, bill names, court case names, dates. Be precise.",
  "impact": 1-5,
  "source": "https://full-url-to-primary-source.com",
  "source_label": "Source Name"
}

Valid issue_tags ONLY from this list: ${JSON.stringify(VALID_ISSUE_TAGS)}

category "trump" = supports/benefits from Trump/Republican agenda
category "israel" = supports Israeli military/occupation
category "both" = both Trump and Israel
category "global" = ICE, private equity, child exploitation, opioids, Epstein, labor — systemic harm

Impact scoring:
5 = Direct mass harm: weapons to active conflict, child exploitation, $2M+ donation, mass detention, genocide enablement
4 = Significant: $1-2M donation, major contract, key legislation passed, opioid distribution, top BDS target
3 = Moderate: <$1M donation, lobbying win, deregulation benefit, price gouging, Epstein banking
2 = Indirect: PAC, minor lobbying, peripheral investment, DEI rollback
1 = Peripheral or emerging

If nothing credible and verifiable found: []`;

  try {
    const response = await fetch('https://api.perplexity.ai/v1/agent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        preset: 'pro-search',
        input: inputText
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.log(`    ⚠️  API ${response.status}: ${err.slice(0, 200)}`);
      return [];
    }

    const data = await response.json();

    let text = '';
    if (data.output_text) {
      text = data.output_text;
    } else if (data.output && Array.isArray(data.output)) {
      for (const block of data.output) {
        if (block.type === 'message' && Array.isArray(block.content)) {
          for (const c of block.content) {
            if (c.type === 'output_text' && c.text) text += c.text;
          }
        }
      }
    }

    if (!text || text.trim() === '[]') return [];

    const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const start = clean.indexOf('[');
    const end = clean.lastIndexOf(']');
    if (start === -1 || end === -1) return [];

    const parsed = JSON.parse(clean.slice(start, end + 1));
    const count = Array.isArray(parsed) ? parsed.length : 0;
    if (count > 0) console.log(`    ✅ ${count} incidents found`);
    return Array.isArray(parsed) ? parsed : [];

  } catch (err) {
    console.log(`    ⚠️  Error: ${err.message}`);
    return [];
  }
}

// ─── VALIDATE ─────────────────────────────────────────────────────────────────
function validateIncident(inc) {
  if (!inc.company || typeof inc.company !== 'string' || inc.company.trim().length < 2) return null;
  if (!inc.date || !/^\d{4}-\d{2}-\d{2}$/.test(inc.date)) return null;
  if (!inc.reason || typeof inc.reason !== 'string' || inc.reason.trim().length < 20) return null;
  if (!VALID_CATEGORIES.includes(inc.category)) inc.category = 'global';
  if (!VALID_INCIDENT_TYPES.includes(inc.incident_type)) inc.incident_type = 'other';
  if (!Array.isArray(inc.issue_tags)) inc.issue_tags = [];
  inc.issue_tags = inc.issue_tags.filter(t => VALID_ISSUE_TAGS.includes(t));
  inc.impact = Math.min(5, Math.max(1, parseInt(inc.impact) || 3));
  if (!inc.sector || inc.sector.trim().length < 2) inc.sector = 'Unknown';
  if (!inc.source) inc.source = '';
  if (!inc.source_label) inc.source_label = 'News Report';
  inc.company = inc.company.trim();
  inc.reason = inc.reason.trim();
  return inc;
}

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
async function getRowCount() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=id`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'count=exact',
        'Range': '0-0'
      }
    });
    const range = res.headers.get('content-range') || '0/0';
    return parseInt(range.split('/')[1]) || 0;
  } catch { return 0; }
}

async function getExistingKeys() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/companies?select=company,date,incident_type&limit=5000`,
    { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  if (!res.ok) throw new Error(`Supabase fetch error: ${res.status}`);
  const rows = await res.json();
  return new Set(rows.map(r =>
    `${(r.company || '').toLowerCase().trim()}|${r.date}|${r.incident_type}`
  ));
}

async function writeToSupabase(incidents) {
  if (!incidents.length) return 0;
  let written = 0;
  for (let i = 0; i < incidents.length; i += 20) {
    const batch = incidents.slice(i, i + 20);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/companies`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(batch)
    });
    if (!res.ok) console.error(`  ❌ Write error: ${res.status} — ${await res.text()}`);
    else written += batch.length;
  }
  return written;
}

async function searchPeriod(fromDate, toDate, existingKeys, skipDedup = false) {
  let newIncidents = [];
  for (const topic of SEARCH_TOPICS) {
    const found = await searchTopic(topic, fromDate, toDate);
    for (const inc of found) {
      const cleaned = validateIncident(inc);
      if (!cleaned) continue;
      const key = `${cleaned.company.toLowerCase().trim()}|${cleaned.date}|${cleaned.incident_type}`;
      if (!skipDedup && existingKeys.has(key)) continue;
      newIncidents.push(cleaned);
      existingKeys.add(key);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  if (newIncidents.length > 0) {
    const written = await writeToSupabase(newIncidents);
    console.log(`  📝 Wrote ${written} incidents for ${fromDate} → ${toDate}`);
  } else {
    console.log(`  — No new incidents for ${fromDate} → ${toDate}`);
  }
  return newIncidents.length;
}

function getMonthlyRanges(monthsBack) {
  const ranges = [];
  const now = new Date();
  for (let i = monthsBack; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    ranges.push({
      fromDate: start.toISOString().slice(0, 10),
      toDate: (end > now ? now : end).toISOString().slice(0, 10)
    });
  }
  return ranges;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🕐 Corporate Accountability Tracker — Full Spectrum Edition`);
  console.log(`📅 Run date: ${new Date().toISOString().slice(0, 10)}`);
  console.log(`📋 ${SEARCH_TOPICS.length} issue areas tracked\n`);

  const rowCount = await getRowCount();
  console.log(`📊 Database: ${rowCount} rows`);
  const existingKeys = await getExistingKeys();
  console.log(`🔑 ${existingKeys.size} existing keys\n`);

  if (rowCount === 0) {
    console.log('🔄 FIRST RUN — 16-month backfill (Dec 2024 → now)');
    console.log('📌 Dedup disabled — capturing everything fresh\n');
    const ranges = getMonthlyRanges(15);
    let total = 0;
    for (const { fromDate, toDate } of ranges) {
      console.log(`\n📅 ${fromDate} → ${toDate}`);
      total += await searchPeriod(fromDate, toDate, existingKeys, true);
      await new Promise(r => setTimeout(r, 2000));
    }
    console.log(`\n✅ Backfill complete. Total added: ${total}`);
    console.log(`📊 Database now: ${await getRowCount()} rows\n`);
  } else {
    const toDate = new Date().toISOString().slice(0, 10);
    const fromDate = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    console.log(`🔍 Daily search: ${fromDate} → ${toDate}\n`);
    const count = await searchPeriod(fromDate, toDate, existingKeys, false);
    console.log(`\n✅ Done. New: ${count} | Total: ${await getRowCount()}\n`);
  }
}

main().catch(err => { console.error('❌ Fatal:', err.message); process.exit(1); });
