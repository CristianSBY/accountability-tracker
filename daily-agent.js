// daily-agent.js
// Corporate Accountability Tracker — Daily Agent
// - On first run after seed: performs 16-month historical backfill
// - On subsequent runs: searches last 48 hours for new incidents
// - Searches 30 issue areas across all runs

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ─── SEARCH TOPICS ────────────────────────────────────────────────────────────
const SEARCH_TOPICS = [
  { label: "Trump Donations & Inauguration Fund", query: "corporate donation Trump inauguration PAC 2025 2026", issue_tags: ["trump-financial"] },
  { label: "Gaza — Weapons Suppliers & Contracts", query: "company weapons contract Israel military Gaza", issue_tags: ["gaza", "weapons"] },
  { label: "Gaza — Technology & AI Enablement", query: "tech company AI surveillance contract Israel IDF", issue_tags: ["gaza", "surveillance-tech"] },
  { label: "ICE — Technology & Data Contractors", query: "company ICE contract surveillance facial recognition immigration enforcement", issue_tags: ["ice", "surveillance-tech"] },
  { label: "ICE — Private Detention Contractors", query: "private prison detention center ICE contract deportation profit", issue_tags: ["ice", "detention"] },
  { label: "Congo & Sudan — Conflict Minerals", query: "company mining contract Congo Sudan conflict minerals arms", issue_tags: ["congo", "sudan", "conflict-minerals"] },
  { label: "Venezuela — Sanctions Profiteers", query: "company lobbying Venezuela sanctions oil profit exemption", issue_tags: ["venezuela", "sanctions"] },
  { label: "Iran — War Posturing Profiteers", query: "defense company Iran military escalation contract weapons profit", issue_tags: ["iran", "weapons"] },
  { label: "Private Equity — Food System Extraction", query: "private equity food company acquisition grocery farm monopoly price", issue_tags: ["food-system", "private-equity"] },
  { label: "Private Equity — Healthcare Extraction", query: "private equity hospital acquisition healthcare profit Medicaid nursing home", issue_tags: ["healthcare", "private-equity"] },
  { label: "Federal Contracts — Trump Administration Awards", query: "company federal government contract awarded Trump administration billions", issue_tags: ["trump-financial", "federal-contracts"] },
  { label: "Tariff Profiteers", query: "company profiting Trump tariffs price increase consumers windfall", issue_tags: ["tariffs", "trump-financial"] },
  { label: "Union Busting — NLRB Rollback", query: "company union busting NLRB labor violation firing workers Trump", issue_tags: ["labor", "union-busting"] },
  { label: "Environment — EPA Rollback Beneficiaries", query: "company EPA rollback pollution drilling permit federal land benefit", issue_tags: ["environment", "trump-financial"] },
  { label: "Surveillance — Border & Immigration Tech", query: "company autonomous surveillance border patrol CBP immigration AI", issue_tags: ["surveillance-tech", "ice"] },
  { label: "Data Brokers — Selling to Enforcement", query: "data broker selling location data ICE immigration enforcement police", issue_tags: ["surveillance-tech", "ice"] },
  { label: "Market Manipulation — Policy Trading", query: "company executive stock options trading tariff policy announcement Trump", issue_tags: ["trump-financial", "market-manipulation"] },
  { label: "Financial Deregulation — CFPB & Banking", query: "bank financial company benefiting CFPB abolished consumer protection rollback", issue_tags: ["trump-financial", "financial-deregulation"] },
  { label: "Pharma — Price Gouging Post-Deregulation", query: "pharmaceutical company price increase Medicaid Medicare cuts deregulation", issue_tags: ["healthcare", "price-gouging"] },
  { label: "Media Capture & Editorial Suppression", query: "media company editorial change soft coverage Trump lawsuit settlement advertiser", issue_tags: ["media", "disinformation"] },
  { label: "Russia — Sanctions Softening Beneficiaries", query: "company Russia business resumed sanctions lifted softened Trump", issue_tags: ["russia", "sanctions"] },
  { label: "Yemen & Somalia — Arms Suppliers", query: "defense company weapons contract Yemen Somalia conflict civilian", issue_tags: ["weapons", "conflict"] },
  { label: "Anti-DEI Corporate Capitulation", query: "company ending DEI diversity equity inclusion programs rollback Trump pressure", issue_tags: ["civil-rights", "trump-financial"] },
  { label: "Anti-Trans Legislation Funders", query: "company funding anti-transgender legislation bills donors", issue_tags: ["civil-rights", "lgbtq"] },
  { label: "Farmland & Housing Monopolization", query: "private equity hedge fund buying farmland single family homes rental monopoly", issue_tags: ["food-system", "private-equity"] },
  { label: "Fossil Fuels — Federal Land Drilling", query: "oil gas company drilling permit federal land national park Trump emergency", issue_tags: ["environment", "fossil-fuels"] },
  { label: "BDS — Israel Occupation Profiteers", query: "company West Bank settlement profit listed BDS boycott target", issue_tags: ["gaza", "bds"] },
  { label: "Social Media — Disinformation Amplification", query: "social media company moderation rollback hate speech profit disinformation spread", issue_tags: ["media", "disinformation"] },
  { label: "Think Tanks & PR — Paid Narratives", query: "PR firm think tank paid Trump administration narrative propaganda dark money", issue_tags: ["disinformation", "lobbying"] },
  { label: "ICE — Immigrant Labor Exploitation", query: "company using undocumented immigrant labor while supporting ICE deportation raids", issue_tags: ["ice", "labor"] }
];

const VALID_CATEGORIES = ['trump', 'israel', 'both', 'global'];
const VALID_INCIDENT_TYPES = ['donation', 'contract', 'investment', 'lobbying', 'bds', 'surveillance', 'detention', 'labor-violation', 'price-gouging', 'environmental', 'market-manipulation', 'media', 'other'];
const VALID_ISSUE_TAGS = ['trump-financial', 'gaza', 'weapons', 'ice', 'detention', 'surveillance-tech', 'congo', 'sudan', 'conflict-minerals', 'venezuela', 'iran', 'food-system', 'private-equity', 'healthcare', 'federal-contracts', 'tariffs', 'labor', 'union-busting', 'environment', 'fossil-fuels', 'market-manipulation', 'financial-deregulation', 'sanctions', 'russia', 'conflict', 'civil-rights', 'lgbtq', 'media', 'disinformation', 'lobbying', 'bds', 'price-gouging'];

// ─── SEARCH A TOPIC FOR A DATE RANGE ─────────────────────────────────────────
async function searchTopic(topic, fromDate, toDate) {
  console.log(`  🔍 [${fromDate} → ${toDate}] ${topic.label}`);

  const prompt = `You are a corporate accountability researcher. Search for real, documented incidents between ${fromDate} and ${toDate} related to: "${topic.label}"

Search focus: ${topic.query}

Find U.S. or multinational companies (with U.S. operations) involved in any of:
- Financial support: donations, PAC contributions, inauguration funds, bundling
- Government contracts: defense, tech, logistics, detention, surveillance
- Investments benefiting from harmful policies or conflicts
- Lobbying for deregulation, anti-labor, anti-environment, or pro-war legislation
- Direct enablement of: genocide, mass detention, civilian surveillance, price gouging, union busting, environmental crimes, disinformation campaigns
- Market manipulation around policy announcements
- Selling data or technology to enforcement agencies targeting civilians
- Privatizing and extracting profit from essential services (healthcare, food, housing)

For EACH company found, return a JSON object with ALL these fields:
{
  "company": "Full Company Name",
  "sector": "Industry Sector",
  "date": "YYYY-MM-DD",
  "category": "trump" | "israel" | "both" | "global",
  "incident_type": "donation" | "contract" | "investment" | "lobbying" | "bds" | "surveillance" | "detention" | "labor-violation" | "price-gouging" | "environmental" | "market-manipulation" | "media" | "other",
  "issue_tags": ["tag1", "tag2"],
  "reason": "2-4 factual sentences. Be specific: name dollar amounts, contract values, specific actions, dates. No editorializing.",
  "impact": 1-5,
  "source": "https://full-url-to-primary-source.com",
  "source_label": "Source Name"
}

Impact scoring:
5 = Direct mass harm (weapons to active conflict, detention infrastructure, $2M+ donation, major surveillance against civilians)
4 = Significant ($1-2M donation, major defense/ICE contract, top BDS target, PE destroying essential services)
3 = Moderate (<$1M donation, lobbying win, investment in harmful sector, settlement complicity)
2 = Indirect (PAC, minor lobbying, peripheral ties, DEI rollback)
1 = Peripheral/emerging

Valid issue_tags: ${JSON.stringify(VALID_ISSUE_TAGS)}

category "global" = ICE, Congo, Sudan, PE extraction, environment, labor — not Trump or Israel specific
category "trump" = supports Trump administration agenda specifically
category "israel" = supports Israeli military/occupation specifically  
category "both" = both Trump and Israel

CRITICAL: Return ONLY a raw JSON array. No markdown. No backticks. No explanation. No preamble.
If nothing credible found for this date range, return exactly: []
Only include entries backed by verifiable sources (FEC, OpenSecrets, AFSC, USCPR, Reuters, AP, Bloomberg, ProPublica, The Intercept, UN reports, Democracy Now).`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 4000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      console.log(`    ⚠️  API ${response.status}: ${await response.text()}`);
      return [];
    }

    const data = await response.json();

    // Extract all text blocks
    const text = data.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    if (!text || text.trim() === '[]') return [];

    // Strip any accidental markdown
    const clean = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    // Find JSON array in response
    const start = clean.indexOf('[');
    const end = clean.lastIndexOf(']');
    if (start === -1 || end === -1) return [];

    const jsonStr = clean.slice(start, end + 1);
    const incidents = JSON.parse(jsonStr);
    const count = Array.isArray(incidents) ? incidents.length : 0;
    if (count > 0) console.log(`    ✅ ${count} incidents found`);
    return Array.isArray(incidents) ? incidents : [];
  } catch (err) {
    console.log(`    ⚠️  Parse error: ${err.message}`);
    return [];
  }
}

// ─── VALIDATE & CLEAN ─────────────────────────────────────────────────────────
function validateIncident(inc) {
  if (!inc.company || typeof inc.company !== 'string') return null;
  if (!inc.date || typeof inc.date !== 'string') return null;
  if (!inc.reason || typeof inc.reason !== 'string') return null;
  if (!inc.category || !VALID_CATEGORIES.includes(inc.category)) inc.category = 'global';
  if (!inc.incident_type || !VALID_INCIDENT_TYPES.includes(inc.incident_type)) inc.incident_type = 'other';
  if (!Array.isArray(inc.issue_tags)) inc.issue_tags = [];
  inc.issue_tags = inc.issue_tags.filter(t => VALID_ISSUE_TAGS.includes(t));
  inc.impact = Math.min(5, Math.max(1, parseInt(inc.impact) || 3));
  if (!inc.sector) inc.sector = 'Unknown';
  if (!inc.source) inc.source = '';
  if (!inc.source_label) inc.source_label = 'News Report';
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inc.date)) return null;
  return inc;
}

// ─── SUPABASE HELPERS ─────────────────────────────────────────────────────────
async function getExistingKeys() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/companies?select=company,date,incident_type&limit=5000`,
    { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  if (!res.ok) throw new Error(`Supabase fetch error: ${res.status}`);
  const rows = await res.json();
  return new Set(rows.map(r => `${(r.company||'').toLowerCase().trim()}|${r.date}|${r.incident_type}`));
}

async function getRowCount() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/companies?select=id`,
    { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Prefer': 'count=exact', 'Range': '0-0' } }
  );
  const range = res.headers.get('content-range') || '0/0';
  return parseInt(range.split('/')[1]) || 0;
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
    if (!res.ok) {
      const err = await res.text();
      console.error(`  ❌ Write error (batch ${i}): ${res.status} — ${err}`);
    } else {
      written += batch.length;
    }
  }
  return written;
}

// ─── SEARCH ONE PERIOD ACROSS ALL TOPICS ─────────────────────────────────────
async function searchPeriod(fromDate, toDate, existingKeys) {
  let periodNew = [];

  for (const topic of SEARCH_TOPICS) {
    const found = await searchTopic(topic, fromDate, toDate);

    for (const inc of found) {
      const cleaned = validateIncident(inc);
      if (!cleaned) continue;
      const key = `${cleaned.company.toLowerCase().trim()}|${cleaned.date}|${cleaned.incident_type}`;
      if (!existingKeys.has(key)) {
        periodNew.push(cleaned);
        existingKeys.add(key);
      }
    }

    // Delay between calls to avoid rate limits
    await new Promise(r => setTimeout(r, 1500));
  }

  if (periodNew.length > 0) {
    const written = await writeToSupabase(periodNew);
    console.log(`  📝 Wrote ${written} new incidents for ${fromDate} → ${toDate}`);
  } else {
    console.log(`  — No new incidents for ${fromDate} → ${toDate}`);
  }

  return periodNew.length;
}

// ─── GENERATE DATE RANGES (monthly chunks) ───────────────────────────────────
function getMonthlyRanges(monthsBack) {
  const ranges = [];
  const now = new Date();

  for (let i = monthsBack; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    const fromDate = start.toISOString().slice(0, 10);
    const toDate = (end > now ? now : end).toISOString().slice(0, 10);
    ranges.push({ fromDate, toDate });
  }

  return ranges;
}

// ─── SEED INITIAL DATA ────────────────────────────────────────────────────────
async function seedInitialData() {
  console.log('🌱 Seeding core dataset...');

  const coreData = [
    { company: "Amazon", sector: "Technology / Retail", date: "2025-01-10", category: "both", incident_type: "donation", issue_tags: ["trump-financial", "gaza", "surveillance-tech", "ice"], reason: "Jeff Bezos donated $1M to Trump's 2025 inauguration fund. Amazon Web Services holds Project Nimbus — a $1.2B contract providing cloud and AI to Israeli military. AWS also provides cloud infrastructure to ICE for immigration enforcement data management.", impact: 5, source: "https://www.opensecrets.org/trump/2025-inauguration-donors", source_label: "OpenSecrets" },
    { company: "Meta (Facebook)", sector: "Technology / Social Media", date: "2025-01-10", category: "trump", incident_type: "donation", issue_tags: ["trump-financial", "media", "disinformation", "civil-rights"], reason: "Mark Zuckerberg donated $1M to Trump's 2025 inauguration fund, ended third-party fact-checking, fired DEI staff, and softened hate speech moderation across Facebook and Instagram. Met privately with Trump at Mar-a-Lago before inauguration.", impact: 5, source: "https://www.cnbc.com/2025/04/23/trump-inauguration-donors-include-meta-amazon-target-delta-ford.html", source_label: "CNBC" },
    { company: "Palantir Technologies", sector: "AI / Data Analytics", date: "2025-01-01", category: "both", incident_type: "surveillance", issue_tags: ["ice", "surveillance-tech", "gaza", "trump-financial"], reason: "Provides ICE with Maven Smart System AI used in immigration targeting and deportation raids across the U.S. Its Gotham AI platform is used by Israeli military for targeting operations in Gaza. CEO Alex Karp is a major Trump donor and attended inaugural events.", impact: 5, source: "https://theintercept.com", source_label: "The Intercept" },
    { company: "Boeing", sector: "Defense / Aerospace", date: "2024-10-07", category: "israel", incident_type: "contract", issue_tags: ["gaza", "weapons"], reason: "Supplier of MK-84 2,000-lb bombs and F-15 fighter jets used in Israeli strikes across Gaza. Named in AFSC Companies Profiting from Gaza Genocide. Received over $1B in active Israeli military contracts since October 2023.", impact: 5, source: "https://afsc.org/gaza-genocide-companies", source_label: "AFSC" },
    { company: "Lockheed Martin", sector: "Defense", date: "2024-10-07", category: "both", incident_type: "contract", issue_tags: ["gaza", "weapons", "iran", "federal-contracts"], reason: "Supplies F-35 jets, JDAM precision bombs, and Hellfire missiles used by Israeli Air Force in Gaza. Also supplying munitions for U.S. military buildup around Iran. Won billions in new federal contracts under Trump administration.", impact: 5, source: "https://afsc.org/gaza-genocide-companies", source_label: "AFSC" },
    { company: "Raytheon (RTX)", sector: "Defense", date: "2024-10-07", category: "both", incident_type: "contract", issue_tags: ["gaza", "weapons", "iran", "federal-contracts"], reason: "Manufactures Hellfire missiles, Patriot air defense systems, and GBU bombs used by IDF in Gaza. Primary defense contractor to Israel. Also supplying air defense systems positioned around Iran. Massive federal contract winner under Trump.", impact: 5, source: "https://afsc.org/gaza-genocide-companies", source_label: "AFSC" },
    { company: "Northrop Grumman", sector: "Defense", date: "2024-10-07", category: "both", incident_type: "contract", issue_tags: ["gaza", "weapons", "federal-contracts"], reason: "Supplies electronic warfare systems and propulsion for Israeli Air Force. Named in AFSC Gaza genocide report. Won major new U.S. federal defense contracts under Trump administration's increased defense spending.", impact: 5, source: "https://afsc.org/gaza-genocide-companies", source_label: "AFSC" },
    { company: "General Dynamics", sector: "Defense", date: "2024-10-07", category: "israel", incident_type: "contract", issue_tags: ["gaza", "weapons"], reason: "Supplies 155mm artillery shells and armored vehicles actively used by IDF in Gaza. Named in AFSC and UN reports. Over $500M in Israeli military contracts since October 2023.", impact: 5, source: "https://afsc.org/gaza-genocide-companies", source_label: "AFSC" },
    { company: "Google (Alphabet)", sector: "Technology", date: "2024-04-17", category: "both", incident_type: "contract", issue_tags: ["gaza", "surveillance-tech", "trump-financial"], reason: "Project Nimbus: $1.2B cloud and AI contract with Israeli government and military providing targeting and surveillance to IDF. Also donated to Trump 2025 inaugural events. Fired 28 employees arrested protesting the genocide contract.", impact: 5, source: "https://www.aljazeera.com/news/2025/7/1/un-report-lists-companies-complicit-in-israels-genocide-who-are-they", source_label: "Al Jazeera" },
    { company: "Microsoft", sector: "Technology", date: "2024-10-07", category: "both", incident_type: "contract", issue_tags: ["gaza", "surveillance-tech", "ice"], reason: "Azure cloud provided to Israeli military and intelligence. Also provides cloud to ICE for immigration enforcement. UN report cited Microsoft's role in enabling Israeli military operations. Fired employees who organized Gaza memorial.", impact: 5, source: "https://afsc.org/gaza-genocide-companies", source_label: "AFSC" },
    { company: "GEO Group", sector: "Private Prison / Detention", date: "2025-01-20", category: "trump", incident_type: "detention", issue_tags: ["ice", "detention", "trump-financial"], reason: "Largest private immigration detention contractor in the U.S., operating 70+ ICE detention facilities. Donated $250,000 to Trump's 2025 inaugural committee. Revenue and stock price surged after Trump's mass deportation executive orders.", impact: 5, source: "https://www.opensecrets.org/trump/2025-inauguration-donors", source_label: "OpenSecrets" },
    { company: "CoreCivic", sector: "Private Prison / Detention", date: "2025-01-20", category: "trump", incident_type: "detention", issue_tags: ["ice", "detention", "trump-financial"], reason: "Second largest private immigration detention company in the U.S. Holds thousands of ICE detainees. Received billions in expanded federal contracts under Trump administration's mass deportation program.", impact: 5, source: "https://www.opensecrets.org/trump/2025-inauguration-donors", source_label: "OpenSecrets" },
    { company: "Anduril Industries", sector: "Defense Technology / AI", date: "2025-01-01", category: "both", incident_type: "surveillance", issue_tags: ["ice", "surveillance-tech", "weapons", "trump-financial"], reason: "Provides AI-powered autonomous surveillance towers used by CBP at U.S. southern border for immigration enforcement. Founder Palmer Luckey is a major Trump donor. Also supplies autonomous weapons systems to Israeli military.", impact: 5, source: "https://theintercept.com", source_label: "The Intercept" },
    { company: "Elbit Systems of America", sector: "Defense Technology", date: "2024-10-07", category: "both", incident_type: "contract", issue_tags: ["gaza", "bds", "weapons", "ice"], reason: "U.S. subsidiary of Israeli weapons manufacturer supplying drones, surveillance systems, and munitions to IDF. Also sells border surveillance systems to CBP used along the U.S.-Mexico border for immigration enforcement.", impact: 5, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR" },
    { company: "Blackstone", sector: "Private Equity", date: "2025-01-10", category: "trump", incident_type: "investment", issue_tags: ["private-equity", "trump-financial", "food-system", "healthcare"], reason: "CEO Steve Schwarzman donated to Trump's inauguration fund. Blackstone is the world's largest landlord having acquired hundreds of thousands of U.S. homes, drives up rents, and owns major hospital and food distribution assets — extracting profit while making essentials unaffordable.", impact: 5, source: "https://www.brennancenter.org/our-work/research-reports/million-dollar-donors-flooded-trumps-second-inauguration", source_label: "Brennan Center" },
    { company: "Oracle", sector: "Technology / Cloud", date: "2025-01-10", category: "both", incident_type: "surveillance", issue_tags: ["ice", "surveillance-tech", "trump-financial", "federal-contracts"], reason: "Co-CEO Larry Ellison hosted Trump fundraiser and donated millions. Oracle provides cloud to ICE for immigration enforcement and to Israeli government agencies. Won billions in U.S. federal cloud contracts under Trump administration.", impact: 4, source: "https://perfectunion.us/trumps-corporate-colluders/", source_label: "More Perfect Union" },
    { company: "Caterpillar", sector: "Heavy Equipment", date: "2024-10-07", category: "israel", incident_type: "bds", issue_tags: ["gaza", "bds", "weapons"], reason: "Top BDS priority for 20+ years. Caterpillar D9 armored bulldozers are used by IDF to demolish Palestinian homes, hospitals, and UN facilities across Gaza and West Bank. Company refuses to restrict military sales despite repeated calls.", impact: 4, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR" },
    { company: "Motorola Solutions", sector: "Communications Technology", date: "2025-01-01", category: "israel", incident_type: "surveillance", issue_tags: ["gaza", "bds", "surveillance-tech"], reason: "Provides surveillance cameras, radio communications, and facial recognition systems used at Israeli military checkpoints throughout West Bank and Gaza perimeter. Listed as top BDS priority by USCPR and AFSC.", impact: 4, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR" },
    { company: "Chevron", sector: "Energy / Oil & Gas", date: "2025-01-10", category: "both", incident_type: "investment", issue_tags: ["trump-financial", "environment", "fossil-fuels", "venezuela"], reason: "Donated to Trump inauguration fund. Holds Israeli-claimed Mediterranean gas extraction rights. Received special Trump administration license to continue Venezuela oil operations despite sanctions — benefiting from selective sanctions enforcement.", impact: 4, source: "https://www.brennancenter.org/our-work/research-reports/million-dollar-donors-flooded-trumps-second-inauguration", source_label: "Brennan Center" },
    { company: "Exxon Mobil", sector: "Energy / Oil & Gas", date: "2025-01-10", category: "trump", incident_type: "investment", issue_tags: ["trump-financial", "environment", "fossil-fuels"], reason: "Donated to Trump's 2025 inauguration fund. Received expedited drilling permits on newly opened federal lands under Trump's energy emergency declaration. Successfully lobbied for methane emissions regulation rollback saving billions.", impact: 4, source: "https://www.brennancenter.org/our-work/research-reports/million-dollar-donors-flooded-trumps-second-inauguration", source_label: "Brennan Center" },
    { company: "Goldman Sachs", sector: "Finance / Banking", date: "2025-01-10", category: "both", incident_type: "investment", issue_tags: ["trump-financial", "financial-deregulation", "gaza"], reason: "Donated to Trump inauguration fund. Underwrites Israeli government bonds and defense firm stock. Benefited from Trump's rollback of Basel III bank capital requirements, saving Goldman billions in compliance costs.", impact: 4, source: "https://www.brennancenter.org/our-work/research-reports/million-dollar-donors-flooded-trumps-second-inauguration", source_label: "Brennan Center" },
    { company: "KKR & Co.", sector: "Private Equity", date: "2025-01-10", category: "trump", incident_type: "investment", issue_tags: ["private-equity", "trump-financial", "food-system", "healthcare"], reason: "Major Trump inauguration donor. KKR has acquired hospital chains, nursing homes, and food distribution companies across the U.S. PE model extracts profit while reducing care quality and food access for working Americans.", impact: 4, source: "https://perfectunion.us/trumps-corporate-colluders/", source_label: "More Perfect Union" },
    { company: "HP Inc.", sector: "Technology", date: "2025-01-01", category: "israel", incident_type: "contract", issue_tags: ["gaza", "bds", "surveillance-tech"], reason: "Provides biometric population registry systems and facial recognition technology used at Israeli military checkpoints in the West Bank. HP Government division holds active contracts with Israeli Defense Ministry.", impact: 4, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR" },
    { company: "L3Harris Technologies", sector: "Defense Electronics", date: "2024-10-07", category: "israel", incident_type: "contract", issue_tags: ["gaza", "weapons", "surveillance-tech"], reason: "Provides targeting systems, night vision equipment, and surveillance technology used by Israeli Air Force in Gaza. Named in AFSC report and UN inquiry into companies enabling Israeli military operations.", impact: 4, source: "https://afsc.org/gaza-genocide-companies", source_label: "AFSC" },
    { company: "Intel", sector: "Technology / Semiconductors", date: "2025-01-01", category: "israel", incident_type: "investment", issue_tags: ["gaza", "bds"], reason: "Operates Israel's largest private employer with major R&D centers and chip fabrication plant receiving billions in Israeli government subsidies. Deeply integrated with Israeli defense-technology ecosystem. BDS priority target.", impact: 4, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR" },
    { company: "JPMorgan Chase", sector: "Finance / Banking", date: "2025-01-10", category: "trump", incident_type: "lobbying", issue_tags: ["trump-financial", "financial-deregulation"], reason: "CEO Jamie Dimon met with Trump at Mar-a-Lago and lobbied for deregulatory agenda. JPMorgan successfully lobbied for rollback of bank capital requirements. Major beneficiary of CFPB dismantlement reducing consumer protection enforcement.", impact: 3, source: "https://perfectunion.us/trumps-corporate-colluders/", source_label: "More Perfect Union" },
    { company: "Comcast (NBCUniversal)", sector: "Media / Telecommunications", date: "2025-01-10", category: "trump", incident_type: "media", issue_tags: ["trump-financial", "media", "disinformation"], reason: "Donated to Trump's inauguration fund. NBCUniversal softened editorial coverage of Trump administration. Lobbied for FCC deregulation benefiting Comcast's broadband monopoly. Settled lawsuit with Trump ally.", impact: 3, source: "https://perfectunion.us/trumps-corporate-colluders/", source_label: "More Perfect Union" },
    { company: "Koch Industries", sector: "Conglomerate / Energy", date: "2025-01-10", category: "trump", incident_type: "lobbying", issue_tags: ["trump-financial", "environment", "fossil-fuels", "civil-rights", "labor", "disinformation"], reason: "Koch network funds anti-DEI think tanks, anti-union legislation, fossil fuel deregulation lobbying, and climate denial campaigns. Donated to Trump-aligned candidates. Benefits from every major Trump deregulatory action across energy and labor.", impact: 3, source: "https://perfectunion.us/trumps-corporate-colluders/", source_label: "More Perfect Union" },
    { company: "Target", sector: "Retail", date: "2025-01-10", category: "trump", incident_type: "donation", issue_tags: ["trump-financial", "civil-rights"], reason: "Donated to Trump's 2025 inauguration fund and reversed DEI commitments in early 2025, ending supplier diversity programs and removing LGBTQ+ inclusive products under political pressure from Trump administration.", impact: 3, source: "https://www.cnbc.com/2025/04/23/trump-inauguration-donors-include-meta-amazon-target-delta-ford.html", source_label: "CNBC" },
    { company: "Ford Motor Company", sector: "Automotive", date: "2025-01-10", category: "trump", incident_type: "donation", issue_tags: ["trump-financial", "labor", "civil-rights"], reason: "Donated to Trump's 2025 inauguration fund and ended DEI programs. Benefits from Trump's auto import tariffs. Met with Trump administration on manufacturing policy endorsing agenda that weakened UAW collective bargaining.", impact: 3, source: "https://www.cnbc.com/2025/04/23/trump-inauguration-donors-include-meta-amazon-target-delta-ford.html", source_label: "CNBC" },
    { company: "McDonald's", sector: "Food & Beverage", date: "2025-01-01", category: "israel", incident_type: "other", issue_tags: ["gaza", "bds"], reason: "McDonald's Israel franchise provided thousands of free meals to IDF soldiers during Gaza operations. Global BDS boycott caused significant reported sales losses across multiple markets throughout 2024-2025.", impact: 3, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR" },
    { company: "Sabra Dipping Company", sector: "Food / Consumer Goods", date: "2025-01-01", category: "israel", incident_type: "investment", issue_tags: ["gaza", "bds"], reason: "Joint venture of PepsiCo and Israeli Strauss Group. Strauss's Maytronics division has donated to Israeli military units serving in occupied territories. Primary global BDS consumer boycott target.", impact: 3, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR" },
    { company: "RE/MAX", sector: "Real Estate", date: "2025-01-01", category: "israel", incident_type: "investment", issue_tags: ["gaza", "bds"], reason: "RE/MAX Israel franchises actively market and sell properties in West Bank settlements in violation of international law and multiple UN resolutions. Listed as BDS target for complicity in settlement expansion.", impact: 3, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR" },
    { company: "Starbucks", sector: "Food & Beverage", date: "2025-01-01", category: "israel", incident_type: "bds", issue_tags: ["gaza", "bds", "labor", "union-busting"], reason: "BDS target after suing its own union (Workers United) for expressing Palestinian solidarity. Also faces multiple NLRB complaints for union-busting. Continued Israel franchise operations throughout genocide.", impact: 2, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR" },
    { company: "Airbnb", sector: "Travel / Technology", date: "2025-01-01", category: "israel", incident_type: "investment", issue_tags: ["gaza", "bds"], reason: "Reversed 2018 decision to remove West Bank settlement listings under legal pressure. Continues listing properties in internationally recognized occupied Palestinian territories, generating revenue from illegal settlements.", impact: 2, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR" },
    { company: "Priceline / Booking Holdings", sector: "Travel / Technology", date: "2025-01-01", category: "israel", incident_type: "investment", issue_tags: ["gaza", "bds"], reason: "Lists Israeli West Bank settlement properties as available accommodations, normalizing and generating revenue from tourism to illegally occupied territory. BDS boycott target.", impact: 3, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR" }
  ];

  const res = await fetch(`${SUPABASE_URL}/rest/v1/companies`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(coreData)
  });

  if (!res.ok) throw new Error(`Seed error: ${res.status} — ${await res.text()}`);
  console.log(`✅ Seeded ${coreData.length} core companies`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🕐 Corporate Accountability Tracker — ${new Date().toISOString()}`);
  console.log(`📋 Tracking ${SEARCH_TOPICS.length} issue areas\n`);

  // Check DB state
  const rowCount = await getRowCount();
  console.log(`📊 Current database: ${rowCount} rows\n`);

  // Seed if empty
  if (rowCount === 0) {
    await seedInitialData();
  }

  // Get existing keys for deduplication
  const existingKeys = await getExistingKeys();
  console.log(`🔑 ${existingKeys.size} unique incident keys loaded\n`);

  // Determine run mode
  // If fewer than 100 rows — run 16-month backfill
  // Otherwise — run last 48 hours only
  const isBackfill = rowCount < 100;

  if (isBackfill) {
    console.log('🔄 Running 16-MONTH HISTORICAL BACKFILL across all issue areas...\n');
    const ranges = getMonthlyRanges(15); // 16 months (0-15)
    let totalNew = 0;

    for (const { fromDate, toDate } of ranges) {
      console.log(`\n📅 Period: ${fromDate} → ${toDate}`);
      const count = await searchPeriod(fromDate, toDate, existingKeys);
      totalNew += count;
      // Pause between months to avoid API rate limits
      await new Promise(r => setTimeout(r, 3000));
    }

    console.log(`\n✅ Backfill complete. Total new incidents added: ${totalNew}`);
  } else {
    // Daily run — last 48 hours
    const toDate = new Date().toISOString().slice(0, 10);
    const fromDate = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    console.log(`🔍 Daily search: ${fromDate} → ${toDate}\n`);
    const count = await searchPeriod(fromDate, toDate, existingKeys);
    console.log(`\n✅ Daily run complete. New incidents: ${count}`);
  }

  const finalCount = await getRowCount();
  console.log(`\n📊 Database now contains: ${finalCount} incidents\n`);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
