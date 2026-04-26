// daily-agent.js
// Corporate Accountability Tracker
// Uses Perplexity Agent API — POST https://api.perplexity.ai/agent
// Preset: pro-search (built-in web search + reasoning)
// First run (0 rows): 16-month backfill, no dedup
// Daily runs: last 48 hours with dedup

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

const SEARCH_TOPICS = [
  { label: "Trump Donations — Inauguration & PACs", query: "Which U.S. corporations donated to Trump's 2025 inauguration fund, PACs, or super PACs?", issue_tags: ["trump-financial"] },
  { label: "Dark Money — Republican Campaigns", query: "Which corporations gave dark money to Republican senate or house campaigns or ALEC?", issue_tags: ["trump-financial", "lobbying"] },
  { label: "Federal Contracts — Post-Inauguration Awards", query: "Which companies received no-bid or inflated federal contracts from the Trump administration?", issue_tags: ["trump-financial", "federal-contracts"] },
  { label: "Tax Cuts — Billionaire & Corporate Beneficiaries", query: "Which corporations benefited most from Republican tax cuts, carried interest loopholes, or capital gains reductions?", issue_tags: ["tax-cuts", "wealth-extraction", "trump-financial"] },
  { label: "Deregulation — Financial Industry", query: "Which banks or financial companies lobbied for Dodd-Frank, CFPB, or Basel rollbacks and benefited?", issue_tags: ["financial-deregulation", "lobbying"] },
  { label: "Deregulation — Energy & Environment", query: "Which oil, gas, or coal companies benefited from EPA, Clean Air Act, or environmental regulation rollbacks?", issue_tags: ["environment", "fossil-fuels", "lobbying"] },
  { label: "Deregulation — Food & Drug Safety", query: "Which food or pharma companies benefited from FDA or USDA safety regulation rollbacks under DOGE cuts?", issue_tags: ["healthcare", "food-system", "lobbying"] },
  { label: "Tariff Exemptions — Insider Lobbying", query: "Which companies received Trump tariff exemptions or waivers through lobbying?", issue_tags: ["tariffs", "trump-financial", "lobbying"] },
  { label: "Tariff Profiteers — Price Gouging", query: "Which companies raised prices on consumers using Trump tariffs as cover while profits increased?", issue_tags: ["tariffs", "price-gouging"] },
  { label: "Medicare & Medicaid Cuts — Corporate Beneficiaries", query: "Which companies benefited from Social Security, Medicare, or Medicaid cuts or privatization efforts?", issue_tags: ["healthcare", "wealth-extraction", "lobbying"] },
  { label: "Education Privatization — Voucher Profiteers", query: "Which companies profited from school voucher programs or education privatization under DeVos or similar policies?", issue_tags: ["education", "private-equity", "lobbying"] },
  { label: "Anti-Labor — NLRB & Union Busting", query: "Which companies benefited from NLRB gutting, fired union organizers, or engaged in union busting under Trump?", issue_tags: ["labor", "union-busting", "lobbying"] },
  { label: "Voting Suppression — Corporate Funders", query: "Which corporations funded voter suppression legislation, gerrymandering efforts, or restrictive voting ID laws?", issue_tags: ["voting-rights", "civil-rights", "lobbying"] },
  { label: "Anti-DEI — Corporate Rollbacks", query: "Which companies ended DEI programs or funded anti-DEI legislation under Trump administration pressure?", issue_tags: ["civil-rights", "trump-financial"] },
  { label: "Anti-Trans Legislation — Corporate Funders", query: "Which companies donated to or funded anti-transgender legislation covering healthcare, sports, or bathrooms?", issue_tags: ["civil-rights", "lgbtq", "lobbying"] },
  { label: "Abortion Ban — Corporate Funders", query: "Which companies funded abortion ban legislation or restrictive reproductive rights bills?", issue_tags: ["civil-rights", "lobbying"] },
  { label: "Gun Lobby — NRA Corporate Funders", query: "Which companies fund the NRA or gun lobby and lobbied against gun control or background check legislation?", issue_tags: ["lobbying", "trump-financial"] },
  { label: "ALEC — Model Legislation Corporate Funders", query: "Which companies fund ALEC or similar organizations that write model legislation for right-wing state bills?", issue_tags: ["lobbying", "legislation-support", "trump-financial"] },
  { label: "Private Equity — Healthcare Extraction", query: "Which private equity firms acquired hospitals or nursing homes, then cut staff and raised prices?", issue_tags: ["healthcare", "private-equity", "wealth-extraction"] },
  { label: "Private Equity — Housing Monopolization", query: "Which hedge funds or private equity firms bought single-family homes or apartment complexes driving up rents?", issue_tags: ["private-equity", "wealth-extraction"] },
  { label: "Private Equity — Food System Monopolization", query: "Which private equity firms acquired food companies, grocery chains, or farms causing price increases?", issue_tags: ["food-system", "private-equity", "wealth-extraction"] },
  { label: "CEO Pay vs Worker Cuts", query: "Which companies increased CEO pay to record levels while simultaneously laying off workers or cutting benefits?", issue_tags: ["labor", "wealth-extraction"] },
  { label: "Stock Buybacks — Shareholders Over Workers", query: "Which companies did billions in stock buybacks for shareholders while cutting jobs or wages?", issue_tags: ["wealth-extraction", "labor"] },
  { label: "Offshore Tax Havens", query: "Which U.S. companies use offshore tax havens in Cayman Islands or Ireland to avoid U.S. taxes?", issue_tags: ["tax-cuts", "wealth-extraction"] },
  { label: "Market Manipulation — Policy Trading", query: "Which company executives traded stocks ahead of Trump tariff or policy announcements suggesting insider knowledge?", issue_tags: ["market-manipulation", "trump-financial"] },
  { label: "Pharma — Price Gouging Post-Deregulation", query: "Which pharmaceutical companies raised drug prices after Medicaid cuts or deregulation removed price controls?", issue_tags: ["healthcare", "price-gouging", "wealth-extraction"] },
  { label: "Insurance — Denial & Profit Extraction", query: "Which health insurance companies denied more claims while posting record profits after Medicaid privatization?", issue_tags: ["healthcare", "wealth-extraction"] },
  { label: "Junk Fees — CFPB Rollback Profiteers", query: "Which companies added or expanded junk fees and hidden charges after CFPB enforcement was gutted?", issue_tags: ["financial-deregulation", "wealth-extraction", "price-gouging"] },
  { label: "Gaza — Weapons & Munitions Suppliers", query: "Which U.S. companies supply weapons, bombs, or munitions used by the Israeli military in Gaza?", issue_tags: ["gaza", "weapons"] },
  { label: "Gaza — Technology & AI Targeting", query: "Which tech companies provide AI, surveillance, or cloud contracts to the Israeli military for Gaza operations?", issue_tags: ["gaza", "surveillance-tech"] },
  { label: "Gaza — Logistics & Supply Chain", query: "Which logistics or shipping companies support Israeli military supply chains or operations in Gaza?", issue_tags: ["gaza", "weapons"] },
  { label: "BDS — Israel Occupation Profiteers", query: "Which companies are BDS boycott targets for profiting from Israeli West Bank settlements or occupation?", issue_tags: ["gaza", "bds"] },
  { label: "Iran — War Escalation Profiteers", query: "Which defense companies have contracts or profit from U.S. military buildup or escalation around Iran?", issue_tags: ["iran", "weapons"] },
  { label: "Congo & Sudan — Conflict Minerals", query: "Which companies source conflict minerals like coltan, cobalt, or lithium from Congo or Sudan conflict zones?", issue_tags: ["congo", "sudan", "conflict-minerals"] },
  { label: "Yemen & Somalia — Arms Suppliers", query: "Which U.S. defense companies have weapons contracts tied to Yemen or Somalia conflicts causing civilian casualties?", issue_tags: ["weapons", "conflict"] },
  { label: "Russia — Sanctions Softening Beneficiaries", query: "Which companies resumed business in Russia after Trump softened or lifted sanctions?", issue_tags: ["russia", "sanctions"] },
  { label: "Venezuela — Sanctions Profiteers", query: "Which companies lobbied for Venezuela sanctions exemptions and profited from oil or gas access?", issue_tags: ["venezuela", "sanctions"] },
  { label: "ICE — Private Detention Contractors", query: "Which private prison companies have ICE detention contracts and expanded capacity under Trump deportation orders?", issue_tags: ["ice", "detention"] },
  { label: "ICE — Technology & Data Contractors", query: "Which tech companies provide ICE with AI, data analytics, or surveillance tools for immigration enforcement?", issue_tags: ["ice", "surveillance-tech"] },
  { label: "ICE — Immigrant Labor Hypocrisy", query: "Which companies employ undocumented workers while publicly supporting or donating to ICE enforcement?", issue_tags: ["ice", "labor"] },
  { label: "Surveillance — Selling Data to Enforcement", query: "Which companies sell facial recognition, location data, or personal data to police or ICE?", issue_tags: ["surveillance-tech", "ice", "civil-rights"] },
  { label: "Border — Autonomous Surveillance Tech", query: "Which companies build or operate autonomous AI surveillance towers or systems for CBP at the U.S. border?", issue_tags: ["surveillance-tech", "ice"] },
  { label: "Fossil Fuels — Federal Land Drilling", query: "Which oil and gas companies received drilling permits on newly opened federal lands or national monuments under Trump?", issue_tags: ["environment", "fossil-fuels"] },
  { label: "Climate Denial — Corporate Funders", query: "Which companies fund Heartland Institute, Heritage Foundation, or other climate denial think tanks?", issue_tags: ["environment", "disinformation", "lobbying"] },
  { label: "Pollution — EPA Enforcement Rollback", query: "Which companies increased pollution violations or emissions after EPA enforcement was gutted by DOGE?", issue_tags: ["environment", "trump-financial"] },
  { label: "Media Capture — Editorial Suppression", query: "Which media companies softened editorial coverage of Trump or settled lawsuits to avoid administration pressure?", issue_tags: ["media", "disinformation"] },
  { label: "Social Media — Disinformation Amplification", query: "Which social media companies removed content moderation allowing disinformation and hate speech to spread?", issue_tags: ["media", "disinformation"] },
  { label: "Think Tanks — Dark Money Narratives", query: "Which think tanks or PR firms are paid by dark money to produce pro-Republican or pro-Trump narratives?", issue_tags: ["disinformation", "lobbying"] },
  { label: "Wage Theft & Safety Violations", query: "Which companies committed wage theft or safety violations after OSHA enforcement was cut under Trump?", issue_tags: ["labor", "wealth-extraction"] },
  { label: "Gig Economy — Worker Misclassification", query: "Which companies lobbied against gig worker employee classification to deny workers benefits?", issue_tags: ["labor", "lobbying"] },
  { label: "Child Labor — Violations & Lobbying", query: "Which companies violated child labor laws or lobbied to weaken child labor protections?", issue_tags: ["labor", "civil-rights"] }
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

// ─── CALL PERPLEXITY AGENT API ────────────────────────────────────────────────
async function searchTopic(topic, fromDate, toDate) {
  console.log(`  🔍 [${fromDate}→${toDate}] ${topic.label}`);

  const userPrompt = `Search for real, documented corporate incidents between ${fromDate} and ${toDate}.

Topic: ${topic.label}
Question: ${topic.query}

Find U.S. or multinational companies involved in any of:
- Donations to Trump, Republican campaigns, PACs, inauguration funds, dark money
- Federal contracts awarded post-inauguration (especially no-bid or after donations)  
- Lobbying FOR: tax cuts for wealthy, deregulation, voter suppression, anti-labor, anti-abortion, anti-trans, gun lobby, Medicaid/Medicare cuts, education privatization, ALEC model bills
- Lobbying AGAINST: minimum wage, worker protections, drug price controls, antitrust, financial regulation, climate action
- Benefiting from specific legislation that passed due to their lobbying (name the bill and amount saved/earned)
- Tariff exemptions obtained via lobbying, or price gouging using tariffs as cover
- Private equity extracting profit from hospitals, housing, food, media — cutting services, raising prices
- CEO pay increases while laying off workers; stock buybacks over wages
- Offshore tax avoidance benefiting from Republican tax bills
- Weapons, tech, or logistics to Israel's military in Gaza
- Arms to Yemen, Sudan, Congo, Somalia conflict zones
- ICE detention contracts, enforcement tech, selling data to law enforcement
- EPA rollback beneficiaries, climate denial funders
- Union busting, wage theft, OSHA violations after enforcement gutted
- Media editorial suppression under political pressure
- Child labor violations or lobbying against protections

Return ONLY a raw JSON array. Each object must have:
{
  "company": "Full legal company name",
  "sector": "Industry sector",
  "date": "YYYY-MM-DD",
  "category": "trump" | "israel" | "both" | "global",
  "incident_type": "donation" | "contract" | "investment" | "lobbying" | "bds" | "surveillance" | "detention" | "labor-violation" | "price-gouging" | "environmental" | "market-manipulation" | "media" | "legislation-support" | "tax-avoidance" | "wealth-extraction" | "other",
  "issue_tags": ["tag1", "tag2"],
  "reason": "3-5 factual sentences. Name specific dollar amounts, bill names, contract values, dates, actions. No opinions.",
  "impact": 1-5,
  "source": "https://full-url-to-primary-source.com",
  "source_label": "Source Name"
}

Valid issue_tags only: ${JSON.stringify(VALID_ISSUE_TAGS)}
category "trump" = supports Trump/Republican agenda
category "israel" = supports Israeli military/occupation  
category "both" = both
category "global" = ICE, private equity, labor, environment, Congo/Sudan — broader harm

Impact: 5=mass harm ($2M+ donation, weapons to active conflict, major detention), 4=significant ($1-2M, major contract, key legislation), 3=moderate (<$1M, lobbying win, price gouging), 2=indirect (PAC, minor lobbying), 1=peripheral

NO markdown. NO backticks. NO explanation before or after. If nothing credible found, return exactly: []`;

  try {
    const response = await fetch('https://api.perplexity.ai/agent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'pro-search',
        messages: [
          {
            role: 'system',
            content: 'You are a corporate accountability researcher. Search the web for real, current, documented corporate incidents. Return only valid JSON arrays with no markdown or explanation. Be specific with dollar amounts, bill names, and dates.'
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_output_tokens: 4000,
        return_citations: true
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.log(`    ⚠️  API ${response.status}: ${err.slice(0, 150)}`);
      return [];
    }

    const data = await response.json();

    // Agent API returns choices[0].message.content
    const text = data?.choices?.[0]?.message?.content
      || data?.output?.map(o => o.content || '').join('')
      || '';

    if (!text || text.trim() === '[]') return [];

    const clean = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

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
  console.log(`\n🕐 Corporate Accountability Tracker — Perplexity Agent API`);
  console.log(`📅 Run date: ${new Date().toISOString().slice(0, 10)}`);
  console.log(`📋 ${SEARCH_TOPICS.length} issue areas | pro-search preset\n`);

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
