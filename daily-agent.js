// daily-agent.js
// Corporate Accountability Tracker
// Powered by Perplexity API (sonar-pro) — native real-time web search
// First run (0 rows): full 16-month backfill, no dedup
// Daily runs: last 48 hours with dedup

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

// ─── 55 SEARCH TOPICS ────────────────────────────────────────────────────────
const SEARCH_TOPICS = [
  // FINANCIAL SUPPORT
  { label: "Trump Donations — Inauguration & PACs", query: "corporation donated Trump inauguration fund PAC super PAC", issue_tags: ["trump-financial"] },
  { label: "Dark Money — Republican Campaigns", query: "corporation dark money republican senate house campaign ALEC", issue_tags: ["trump-financial", "lobbying"] },
  { label: "Federal Contracts — Post-Inauguration Awards", query: "company awarded federal contract Trump administration no-bid sole source inflated", issue_tags: ["trump-financial", "federal-contracts"] },

  // LEGISLATION & POLICY
  { label: "Tax Cuts — Billionaire & Corporate Beneficiaries", query: "corporation benefiting Republican tax cut bill carried interest loophole capital gains", issue_tags: ["tax-cuts", "wealth-extraction", "trump-financial"] },
  { label: "Deregulation — Financial Industry Lobbying", query: "bank financial company lobbying Dodd-Frank CFPB Basel rollback benefit", issue_tags: ["financial-deregulation", "lobbying"] },
  { label: "Deregulation — Energy & Environment", query: "oil gas coal company EPA Clean Air Act rollback drilling permit benefit", issue_tags: ["environment", "fossil-fuels", "lobbying"] },
  { label: "Deregulation — Food & Drug Safety", query: "food pharma company FDA USDA safety regulation rollback benefit DOGE", issue_tags: ["healthcare", "food-system", "lobbying"] },
  { label: "Tariff Exemptions — Insider Lobbying Deals", query: "company received Trump tariff exemption waiver exclusion lobbied", issue_tags: ["tariffs", "trump-financial", "lobbying"] },
  { label: "Tariff Profiteers — Price Gouging Consumers", query: "company raised prices consumers Trump tariffs while profits increased", issue_tags: ["tariffs", "price-gouging"] },
  { label: "Social Security & Medicare Cuts — Corporate Beneficiaries", query: "company benefiting Social Security Medicare Medicaid cuts privatization", issue_tags: ["healthcare", "wealth-extraction", "lobbying"] },
  { label: "Education Privatization — Voucher Profiteers", query: "company profiting school voucher charter education privatization", issue_tags: ["education", "private-equity", "lobbying"] },
  { label: "Anti-Labor Legislation — NLRB & Union Busting", query: "company benefiting NLRB gutted union busting right to work fired organizers", issue_tags: ["labor", "union-busting", "lobbying"] },
  { label: "Voting Suppression — Corporate Funders", query: "corporation funding voter suppression gerrymandering restrictive voting ID laws", issue_tags: ["voting-rights", "civil-rights", "lobbying"] },
  { label: "Anti-DEI — Corporate Funders & Rollbacks", query: "company funding anti-DEI legislation ending diversity programs rollback", issue_tags: ["civil-rights", "trump-financial"] },
  { label: "Anti-Trans Legislation — Corporate Funders", query: "company donating anti-transgender legislation healthcare sports bathroom bills", issue_tags: ["civil-rights", "lgbtq", "lobbying"] },
  { label: "Abortion Ban — Corporate Funders", query: "company funding abortion ban legislation restrictive reproductive rights bills", issue_tags: ["civil-rights", "lobbying"] },
  { label: "Gun Lobby — NRA Corporate Funders", query: "company funding NRA gun lobby against gun control background check legislation", issue_tags: ["lobbying", "trump-financial"] },
  { label: "Big Tech — Internet & AI Deregulation", query: "tech company lobbying internet regulation AI oversight rollback net neutrality", issue_tags: ["lobbying", "surveillance-tech", "trump-financial"] },
  { label: "ALEC — Model Legislation Corporate Funders", query: "company funding ALEC American Legislative Exchange Council model bills", issue_tags: ["lobbying", "legislation-support", "trump-financial"] },

  // WEALTH EXTRACTION
  { label: "Private Equity — Healthcare Extraction", query: "private equity acquired hospital nursing home healthcare profit extraction staff cuts", issue_tags: ["healthcare", "private-equity", "wealth-extraction"] },
  { label: "Private Equity — Housing Monopolization", query: "private equity hedge fund buying single family homes apartments rents increased evictions", issue_tags: ["private-equity", "wealth-extraction"] },
  { label: "Private Equity — Food System Monopolization", query: "private equity acquiring food company grocery chain farm consolidation price increase", issue_tags: ["food-system", "private-equity", "wealth-extraction"] },
  { label: "Private Equity — Media Consolidation", query: "private equity acquiring local news media outlet consolidation layoffs closure", issue_tags: ["media", "private-equity", "wealth-extraction"] },
  { label: "CEO Pay vs Worker Cuts", query: "company CEO pay increased record while laying off workers cutting wages benefits", issue_tags: ["labor", "wealth-extraction"] },
  { label: "Stock Buybacks — Shareholders Over Workers", query: "company stock buyback billions shareholders while cutting jobs wages benefits", issue_tags: ["wealth-extraction", "labor"] },
  { label: "Offshore Tax Havens", query: "company offshore tax haven Cayman Ireland avoiding US taxes Republican bill", issue_tags: ["tax-cuts", "wealth-extraction"] },
  { label: "Market Manipulation — Policy Trading", query: "executive insider trading stock options tariff policy announcement Trump", issue_tags: ["market-manipulation", "trump-financial"] },
  { label: "Pharma — Price Gouging Post-Deregulation", query: "pharmaceutical company raised drug prices after Medicaid cuts deregulation", issue_tags: ["healthcare", "price-gouging", "wealth-extraction"] },
  { label: "Insurance — Denial & Profit Extraction", query: "health insurance company denying claims record profits Medicaid privatization", issue_tags: ["healthcare", "wealth-extraction"] },
  { label: "Junk Fees — CFPB Rollback Profiteers", query: "company charging junk fees hidden fees after CFPB rule rollback benefit", issue_tags: ["financial-deregulation", "wealth-extraction", "price-gouging"] },

  // MILITARY & CONFLICT
  { label: "Gaza — Weapons & Munitions Suppliers", query: "company supplying weapons munitions bombs Israel military Gaza genocide", issue_tags: ["gaza", "weapons"] },
  { label: "Gaza — Technology & AI Targeting", query: "tech company AI surveillance contract Israel IDF targeting Gaza", issue_tags: ["gaza", "surveillance-tech"] },
  { label: "Gaza — Logistics & Supply Chain", query: "company logistics shipping supply chain Israel military operations Gaza", issue_tags: ["gaza", "weapons"] },
  { label: "BDS — Israel Occupation Profiteers", query: "company West Bank settlement profit BDS boycott target occupation", issue_tags: ["gaza", "bds"] },
  { label: "Iran — War Escalation Profiteers", query: "defense company Iran military buildup weapons contract profit escalation", issue_tags: ["iran", "weapons"] },
  { label: "Congo & Sudan — Conflict Minerals", query: "company sourcing conflict minerals Congo Sudan DRC coltan lithium cobalt", issue_tags: ["congo", "sudan", "conflict-minerals"] },
  { label: "Yemen & Somalia — Arms Suppliers", query: "defense company weapons contract Yemen Somalia conflict civilian casualties", issue_tags: ["weapons", "conflict"] },
  { label: "Russia — Sanctions Softening Beneficiaries", query: "company resuming Russia business after Trump softened eased sanctions", issue_tags: ["russia", "sanctions"] },
  { label: "Venezuela — Sanctions Profiteers", query: "company lobbying Venezuela sanctions exemption oil gas profit", issue_tags: ["venezuela", "sanctions"] },

  // ICE & SURVEILLANCE
  { label: "ICE — Private Detention Contractors", query: "private prison company ICE detention contract deportation profit expansion", issue_tags: ["ice", "detention"] },
  { label: "ICE — Technology & Data Contractors", query: "tech company ICE contract data analytics AI surveillance immigration enforcement", issue_tags: ["ice", "surveillance-tech"] },
  { label: "ICE — Immigrant Labor Hypocrisy", query: "company employing undocumented workers while donating supporting ICE deportation", issue_tags: ["ice", "labor"] },
  { label: "Surveillance — Selling Data to Enforcement", query: "company selling facial recognition location data police ICE border patrol", issue_tags: ["surveillance-tech", "ice", "civil-rights"] },
  { label: "Border — Autonomous Surveillance Tech", query: "company autonomous AI surveillance tower border wall CBP contract", issue_tags: ["surveillance-tech", "ice"] },
  { label: "Prison Tech — Monitoring & Control", query: "company prison jail monitoring technology contract profit expansion", issue_tags: ["detention", "surveillance-tech"] },

  // ENVIRONMENT
  { label: "Fossil Fuels — Federal Land Drilling", query: "oil gas company drilling permit opened federal land national park monument Trump", issue_tags: ["environment", "fossil-fuels"] },
  { label: "Climate Denial — Corporate Funders", query: "company funding climate denial think tank Heartland Heritage lobbying against climate", issue_tags: ["environment", "disinformation", "lobbying"] },
  { label: "Pollution — EPA Enforcement Rollback", query: "company increasing pollution violations after EPA enforcement rollback DOGE cuts", issue_tags: ["environment", "trump-financial"] },
  { label: "Plastics & Chemicals — Regulation Rollback", query: "plastics chemical company PFAS pesticide regulation rollback benefit", issue_tags: ["environment", "lobbying"] },

  // MEDIA & DISINFORMATION
  { label: "Media Capture — Editorial Suppression", query: "media company soften coverage Trump lawsuit settlement editorial pressure fired journalist", issue_tags: ["media", "disinformation"] },
  { label: "Social Media — Disinformation Amplification", query: "social media platform moderation rollback hate speech disinformation profit", issue_tags: ["media", "disinformation"] },
  { label: "Think Tanks — Dark Money Narratives", query: "think tank PR firm dark money Republican narrative propaganda paid", issue_tags: ["disinformation", "lobbying"] },

  // LABOR
  { label: "Wage Theft & Safety Violations", query: "company wage theft labor violation workers OSHA cuts enforcement rollback", issue_tags: ["labor", "wealth-extraction"] },
  { label: "Gig Economy — Worker Misclassification", query: "company gig worker misclassification lobbying against employee status benefits", issue_tags: ["labor", "lobbying"] },
  { label: "Child Labor — Violations & Lobbying", query: "company child labor violation lobbying weakening child labor protection laws", issue_tags: ["labor", "civil-rights"] }
];

const VALID_CATEGORIES = ['trump', 'israel', 'both', 'global'];
const VALID_INCIDENT_TYPES = [
  'donation', 'contract', 'investment', 'lobbying', 'bds',
  'surveillance', 'detention', 'labor-violation', 'price-gouging',
  'environmental', 'market-manipulation', 'media', 'legislation-support',
  'tax-avoidance', 'wealth-extraction', 'other'
];
const VALID_ISSUE_TAGS = [
  'trump-financial', 'gaza', 'weapons', 'ice', 'detention',
  'surveillance-tech', 'congo', 'sudan', 'conflict-minerals',
  'venezuela', 'iran', 'food-system', 'private-equity', 'healthcare',
  'federal-contracts', 'tariffs', 'labor', 'union-busting', 'environment',
  'fossil-fuels', 'market-manipulation', 'financial-deregulation',
  'sanctions', 'russia', 'conflict', 'civil-rights', 'lgbtq', 'media',
  'disinformation', 'lobbying', 'bds', 'price-gouging', 'wealth-extraction',
  'tax-cuts', 'voting-rights', 'education', 'legislation-support'
];

// ─── SEARCH VIA PERPLEXITY API ────────────────────────────────────────────────
async function searchTopic(topic, fromDate, toDate) {
  console.log(`  🔍 [${fromDate}→${toDate}] ${topic.label}`);

  const prompt = `You are a corporate accountability researcher. Today is April 13, 2026.

Search for REAL, DOCUMENTED incidents between ${fromDate} and ${toDate} for:
"${topic.label}" — query: ${topic.query}

Find U.S. or multinational companies involved in ANY of:
- Donations to Trump, Republican campaigns, PACs, inauguration funds, dark money groups
- Federal contracts awarded post-inauguration (especially no-bid or after donations)
- Lobbying FOR: tax cuts for wealthy, deregulation, voter suppression, anti-labor bills, anti-abortion, anti-trans, gun lobby, Medicaid/Medicare/Social Security cuts, education privatization
- Lobbying AGAINST: minimum wage, worker protections, drug price controls, antitrust, financial regulation, climate legislation
- Funding ALEC or model-legislation organizations — name specific bills passed
- Benefiting from tariff exemptions or tariff-driven price gouging
- Private equity extracting profit from hospitals, housing, food, media — cutting services while raising prices
- CEO pay increases while laying off workers; stock buybacks over worker pay
- Offshore tax avoidance benefiting from Republican tax bills
- Weapons, tech, or logistics supplied to Israel's military in Gaza
- Arms deals to Yemen, Sudan, Congo, Somalia conflict zones
- ICE detention contracts, enforcement technology, data sales
- Surveillance tech sold to law enforcement targeting civilians
- EPA rollback beneficiaries, climate denial funders
- Union busting, wage theft, OSHA violations after enforcement cut
- Media editorial suppression under political pressure
- Child labor violations or lobbying against protections

Return a JSON array. Each object:
{
  "company": "Full legal company name",
  "sector": "Industry sector",
  "date": "YYYY-MM-DD",
  "category": "trump" | "israel" | "both" | "global",
  "incident_type": "donation" | "contract" | "investment" | "lobbying" | "bds" | "surveillance" | "detention" | "labor-violation" | "price-gouging" | "environmental" | "market-manipulation" | "media" | "legislation-support" | "tax-avoidance" | "wealth-extraction" | "other",
  "issue_tags": ["tag1", "tag2"],
  "reason": "3-5 factual sentences with specific dollar amounts, bill names, contract values, dates, actions. No opinions.",
  "impact": 1-5,
  "source": "https://full-url-primary-source.com",
  "source_label": "Source Name"
}

Valid issue_tags: ${JSON.stringify(VALID_ISSUE_TAGS)}

Impact: 5=mass harm ($2M+ donation, weapons to active conflict, major detention), 4=significant ($1-2M, major contract, key legislation), 3=moderate (<$1M, lobbying win, price gouging), 2=indirect (PAC, minor lobbying), 1=peripheral

RETURN ONLY RAW JSON ARRAY. No markdown, no backticks, no explanation.
If nothing credible found: []`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a corporate accountability researcher. Search the web for real, current, documented corporate incidents. Return only valid JSON arrays with no markdown or explanation.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.1,
        return_citations: true
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.log(`    ⚠️  Perplexity API ${response.status}: ${err.slice(0, 100)}`);
      return [];
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    if (!text || text.trim() === '[]') return [];

    // Strip any accidental markdown
    const clean = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    const start = clean.indexOf('[');
    const end = clean.lastIndexOf(']');
    if (start === -1 || end === -1) {
      console.log(`    ⚠️  No JSON array in response`);
      return [];
    }

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

// ─── SEARCH PERIOD ────────────────────────────────────────────────────────────
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
  console.log(`\n🕐 Corporate Accountability Tracker — Perplexity Edition`);
  console.log(`📅 Run date: ${new Date().toISOString().slice(0,10)}`);
  console.log(`📋 ${SEARCH_TOPICS.length} issue areas | sonar-pro real-time search\n`);

  // Validate env vars
  if (!PERPLEXITY_API_KEY) { console.error('❌ PERPLEXITY_API_KEY is not set'); process.exit(1); }
  if (!SUPABASE_URL) { console.error('❌ SUPABASE_URL is not set'); process.exit(1); }
  if (!SUPABASE_SERVICE_KEY) { console.error('❌ SUPABASE_SERVICE_KEY is not set'); process.exit(1); }
  console.log(`🔑 Perplexity key loaded: ${PERPLEXITY_API_KEY.slice(0,8)}...\n`);

  const rowCount = await getRowCount();
  console.log(`📊 Database: ${rowCount} rows`);

  const existingKeys = await getExistingKeys();
  console.log(`🔑 ${existingKeys.size} existing keys\n`);

  if (rowCount === 0) {
    console.log('🔄 FIRST RUN — 16-month backfill (Dec 2024 → Apr 2026)');
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
