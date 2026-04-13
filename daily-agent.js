// daily-agent.js
// Runs daily at 7am CT via GitHub Actions
// Comprehensive corporate accountability tracker — full expanded scope

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SEARCH_TOPICS = [
  { label: "Trump Donations & Inauguration", query: "corporate donation Trump inauguration PAC 2025 2026", issue_tags: ["trump-financial"] },
  { label: "Gaza — Weapons & Logistics", query: "company weapons contract Israel military Gaza 2025 2026", issue_tags: ["gaza", "weapons"] },
  { label: "Gaza — Technology & AI Enablement", query: "tech company AI surveillance contract Israel IDF 2025 2026", issue_tags: ["gaza", "surveillance-tech"] },
  { label: "ICE — Technology Contractors", query: "company ICE contract surveillance facial recognition immigration enforcement 2025 2026", issue_tags: ["ice", "surveillance-tech"] },
  { label: "ICE — Detention & Private Prisons", query: "private prison detention center ICE contract deportation 2025 2026", issue_tags: ["ice", "detention"] },
  { label: "Congo & Sudan — Mining & Arms", query: "company mining contract Congo Sudan conflict minerals arms 2025 2026", issue_tags: ["congo", "sudan", "conflict-minerals"] },
  { label: "Venezuela Sanctions Profiteers", query: "company lobbying Venezuela sanctions oil profit 2025 2026", issue_tags: ["venezuela", "sanctions"] },
  { label: "Iran War Posturing — Defense", query: "defense company Iran military escalation contract profit 2025 2026", issue_tags: ["iran", "weapons"] },
  { label: "Private Equity — Food System", query: "private equity food company acquisition grocery farm monopoly 2025 2026", issue_tags: ["food-system", "private-equity"] },
  { label: "Private Equity — Healthcare", query: "private equity hospital acquisition healthcare profit Medicaid cuts 2025 2026", issue_tags: ["healthcare", "private-equity"] },
  { label: "Federal Contract Winners", query: "company federal government contract awarded Trump administration 2025 2026", issue_tags: ["trump-financial", "federal-contracts"] },
  { label: "Tariff Profiteers", query: "company profiting Trump tariffs price gouging consumers 2025 2026", issue_tags: ["tariffs", "trump-financial"] },
  { label: "Union Busting — NLRB", query: "company union busting NLRB labor violation Trump 2025 2026", issue_tags: ["labor", "union-busting"] },
  { label: "Environment — EPA Rollback Beneficiaries", query: "company EPA rollback pollution drilling federal land permit 2025 2026", issue_tags: ["environment", "trump-financial"] },
  { label: "Surveillance — Border & Immigration", query: "company facial recognition location data border patrol immigration 2025 2026", issue_tags: ["surveillance-tech", "ice"] },
  { label: "Data Brokers — Immigration Enforcement", query: "data broker selling location data ICE immigration enforcement 2025 2026", issue_tags: ["surveillance-tech", "ice"] },
  { label: "Market Manipulation — Tariff Trading", query: "company executive stock trading tariff announcement insider Trump 2025 2026", issue_tags: ["trump-financial", "market-manipulation"] },
  { label: "CFPB Gutting Beneficiaries", query: "bank financial company benefiting CFPB dismantled consumer protection 2025 2026", issue_tags: ["trump-financial", "financial-deregulation"] },
  { label: "Pharma — Price Gouging", query: "pharmaceutical company price gouging Medicaid Medicare cuts 2025 2026", issue_tags: ["healthcare", "price-gouging"] },
  { label: "Media Capture & Disinformation", query: "media company disinformation pro-Trump coverage editorial change 2025 2026", issue_tags: ["media", "disinformation"] },
  { label: "Russia — Sanctions Softening", query: "company Russia business sanctions softened Trump administration 2025 2026", issue_tags: ["russia", "sanctions"] },
  { label: "Yemen & Somalia Arms", query: "defense company weapons contract Yemen Somalia conflict 2025 2026", issue_tags: ["weapons", "conflict"] },
  { label: "Anti-DEI Corporate Rollbacks", query: "company funding anti-DEI legislation discrimination rollback 2025 2026", issue_tags: ["civil-rights", "trump-financial"] },
  { label: "Anti-Trans Corporate Support", query: "company funding anti-transgender legislation bills 2025 2026", issue_tags: ["civil-rights", "lgbtq"] },
  { label: "Farmland Private Equity Acquisition", query: "private equity hedge fund buying farmland food production 2025 2026", issue_tags: ["food-system", "private-equity"] },
  { label: "Fossil Fuel — Federal Land Drilling", query: "oil gas company drilling permit federal land Trump 2025 2026", issue_tags: ["environment", "fossil-fuels"] },
  { label: "BDS — Israel Occupation Profiteers", query: "company West Bank settlement profit BDS target 2025 2026", issue_tags: ["gaza", "bds"] },
  { label: "Social Media — Hate Speech Amplification", query: "social media platform moderation rollback hate speech advertising 2025 2026", issue_tags: ["media", "disinformation"] },
  { label: "PR & Think Tanks — Paid Narratives", query: "PR firm think tank paid Trump administration narrative lobbying 2025 2026", issue_tags: ["disinformation", "lobbying"] },
  { label: "ICE — Immigrant Labor Exploitation", query: "company using undocumented immigrant labor supporting ICE raids hypocrisy 2025 2026", issue_tags: ["ice", "labor"] }
];

const VALID_CATEGORIES = ['trump', 'israel', 'both', 'global'];
const VALID_INCIDENT_TYPES = ['donation', 'contract', 'investment', 'lobbying', 'bds', 'surveillance', 'detention', 'labor-violation', 'price-gouging', 'environmental', 'market-manipulation', 'media', 'other'];
const VALID_ISSUE_TAGS = ['trump-financial', 'gaza', 'weapons', 'ice', 'detention', 'surveillance-tech', 'congo', 'sudan', 'conflict-minerals', 'venezuela', 'iran', 'food-system', 'private-equity', 'healthcare', 'federal-contracts', 'tariffs', 'labor', 'union-busting', 'environment', 'fossil-fuels', 'market-manipulation', 'financial-deregulation', 'sanctions', 'russia', 'conflict', 'civil-rights', 'lgbtq', 'media', 'disinformation', 'lobbying', 'bds', 'price-gouging'];

async function searchTopic(topic) {
  console.log(`  🔍 ${topic.label}`);
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const prompt = `You are a corporate accountability researcher. Search for incidents from ${thirtyDaysAgo} to ${today} related to: "${topic.label}" (query: ${topic.query})

Find U.S. or multinational companies with U.S. operations involved in:
- Financial support: donations, PAC contributions, inauguration funds
- Government contracts: defense, tech, logistics, detention, surveillance
- Investments that benefit from harmful policies
- Lobbying for harmful legislation or deregulation
- Direct participation in: genocide, mass detention, surveillance of civilians, environmental crimes, price gouging, union busting, disinformation
- Market manipulation around policy announcements
- Data sales to enforcement agencies targeting civilians

Return a JSON array. Each object must have:
- company: string
- sector: string
- date: string (YYYY-MM-DD)
- category: exactly one of: "trump", "israel", "both", "global"
- incident_type: exactly one of: "donation", "contract", "investment", "lobbying", "bds", "surveillance", "detention", "labor-violation", "price-gouging", "environmental", "market-manipulation", "media", "other"
- issue_tags: array from: ${JSON.stringify(VALID_ISSUE_TAGS)}
- reason: string (2-4 factual sentences with specific amounts, dates, actions)
- impact: number 1-5 (5=direct mass harm enablement, 4=significant, 3=moderate, 2=indirect, 1=peripheral)
- source: string (full URL — prioritize FEC, OpenSecrets, AFSC, USCPR, Reuters, AP, Bloomberg, ProPublica, The Intercept, UN reports)
- source_label: string

Return ONLY valid JSON array. If nothing credible found, return []. No speculation, only verifiable sources.`;

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
        max_tokens: 3000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) { console.log(`    ⚠️  API ${response.status}`); return []; }

    const data = await response.json();
    const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const clean = text.replace(/```json|```/g, '').trim();
    if (!clean || clean === '[]') return [];
    const incidents = JSON.parse(clean);
    console.log(`    ✅ ${incidents.length} found`);
    return Array.isArray(incidents) ? incidents : [];
  } catch (err) {
    console.log(`    ⚠️  Error: ${err.message}`);
    return [];
  }
}

function validateIncident(inc) {
  if (!inc.company || !inc.date || !inc.reason) return null;
  if (!VALID_CATEGORIES.includes(inc.category)) inc.category = 'global';
  if (!VALID_INCIDENT_TYPES.includes(inc.incident_type)) inc.incident_type = 'other';
  if (!Array.isArray(inc.issue_tags)) inc.issue_tags = [];
  inc.issue_tags = inc.issue_tags.filter(t => VALID_ISSUE_TAGS.includes(t));
  inc.impact = Math.min(5, Math.max(1, parseInt(inc.impact) || 3));
  if (!inc.source) inc.source = '';
  if (!inc.source_label) inc.source_label = 'News Report';
  return inc;
}

async function getExistingKeys() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=company,date,incident_type&limit=2000`, {
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` }
  });
  if (!res.ok) throw new Error(`Supabase fetch error: ${res.status}`);
  const rows = await res.json();
  return new Set(rows.map(r => `${r.company}|${r.date}|${r.incident_type}`));
}

async function writeToSupabase(incidents) {
  if (!incidents.length) return;
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
    if (!res.ok) console.error(`❌ Write error: ${res.status} — ${await res.text()}`);
  }
  console.log(`✅ Wrote ${incidents.length} new incidents`);
}

async function seedInitialData() {
  console.log('🌱 Seeding initial dataset...');
  const initialData = [
    { company: "Amazon", sector: "Technology / Retail", date: "2025-01-10", category: "both", incident_type: "donation", issue_tags: ["trump-financial", "gaza", "surveillance-tech"], reason: "Jeff Bezos donated $1M to Trump's 2025 inauguration fund. Amazon Web Services holds Project Nimbus — a $1.2B contract providing cloud and AI to Israeli military, enabling surveillance and targeting in Gaza. AWS also provides cloud to ICE for immigration enforcement.", impact: 5, source: "https://www.opensecrets.org/trump/2025-inauguration-donors", source_label: "OpenSecrets" },
    { company: "Meta (Facebook)", sector: "Technology / Social Media", date: "2025-01-10", category: "trump", incident_type: "donation", issue_tags: ["trump-financial", "media", "disinformation", "civil-rights"], reason: "Zuckerberg donated $1M to Trump's 2025 inauguration, met privately with Trump, ended third-party fact-checking, fired DEI staff, and softened hate speech moderation — enabling disinformation to spread ahead of the 2026 midterms.", impact: 5, source: "https://www.cnbc.com/2025/04/23/trump-inauguration-donors-include-meta-amazon-target-delta-ford.html", source_label: "CNBC" },
    { company: "Palantir Technologies", sector: "AI / Data Analytics", date: "2025-01-01", category: "both", incident_type: "surveillance", issue_tags: ["ice", "surveillance-tech", "gaza", "trump-financial"], reason: "Provides ICE with Maven Smart System AI used in immigration targeting and deportation raids. Its Gotham AI platform is used by Israeli military for targeting in Gaza. CEO Alex Karp is vocal Trump supporter who attended inaugural events.", impact: 5, source: "https://theintercept.com", source_label: "The Intercept" },
    { company: "Boeing", sector: "Defense / Aerospace", date: "2024-10-07", category: "israel", incident_type: "contract", issue_tags: ["gaza", "weapons"], reason: "Supplier of MK-84 2,000-lb bombs and F-15 jets used in Israeli strikes across Gaza. Named in AFSC Companies Profiting from Gaza Genocide. Received $1B+ in active Israeli military contracts since October 2023.", impact: 5, source: "https://afsc.org/gaza-genocide-companies", source_label: "AFSC" },
    { company: "Lockheed Martin", sector: "Defense", date: "2024-10-07", category: "israel", incident_type: "contract", issue_tags: ["gaza", "weapons", "iran"], reason: "Supplies F-35 jets, JDAM precision bombs, and Hellfire missiles used by Israeli Air Force across Gaza. Also supplying munitions for U.S. military posture around Iran. Listed in AFSC Gaza genocide companies report.", impact: 5, source: "https://afsc.org/gaza-genocide-companies", source_label: "AFSC" },
    { company: "Raytheon (RTX)", sector: "Defense", date: "2024-10-07", category: "israel", incident_type: "contract", issue_tags: ["gaza", "weapons", "iran"], reason: "Manufactures Hellfire missiles, Patriot air defense systems, and GBU bombs used by IDF in Gaza. Primary defense contractor to Israel. Also supplying air defense systems positioned around Iran.", impact: 5, source: "https://afsc.org/gaza-genocide-companies", source_label: "AFSC" },
    { company: "Northrop Grumman", sector: "Defense", date: "2024-10-07", category: "israel", incident_type: "contract", issue_tags: ["gaza", "weapons", "sudan"], reason: "Supplies ammunition, electronic warfare, and propulsion for Israeli Air Force. Also has active contracts related to Sudan conflict operations. Listed in AFSC Gaza genocide report.", impact: 5, source: "https://afsc.org/gaza-genocide-companies", source_label: "AFSC" },
    { company: "General Dynamics", sector: "Defense", date: "2024-10-07", category: "israel", incident_type: "contract", issue_tags: ["gaza", "weapons"], reason: "Supplies 155mm artillery shells and armored vehicles actively used by IDF in Gaza. Named in AFSC and UN reports. Over $500M in Israeli military contracts since October 2023.", impact: 5, source: "https://afsc.org/gaza-genocide-companies", source_label: "AFSC" },
    { company: "Google (Alphabet)", sector: "Technology", date: "2024-04-17", category: "both", incident_type: "contract", issue_tags: ["gaza", "surveillance-tech", "trump-financial"], reason: "Project Nimbus: $1.2B cloud and AI contract with Israeli government and military providing targeting and surveillance capabilities to IDF. Donated to Trump's 2025 inaugural events. Fired 28 employees arrested at anti-genocide protest.", impact: 5, source: "https://www.aljazeera.com/news/2025/7/1/un-report-lists-companies-complicit-in-israels-genocide-who-are-they", source_label: "Al Jazeera" },
    { company: "Microsoft", sector: "Technology", date: "2024-10-07", category: "both", incident_type: "contract", issue_tags: ["gaza", "surveillance-tech", "ice"], reason: "Azure cloud provided to Israeli military and intelligence agencies. Also provides cloud to ICE for immigration enforcement data management. UN report cited Microsoft's role enabling Israeli military operations in Gaza.", impact: 5, source: "https://afsc.org/gaza-genocide-companies", source_label: "AFSC" },
    { company: "GEO Group", sector: "Private Prison / Detention", date: "2025-01-20", category: "trump", incident_type: "detention", issue_tags: ["ice", "detention", "trump-financial"], reason: "Largest private immigration detention contractor in the U.S., operating 70+ ICE facilities. Donated $250,000 to Trump's 2025 inaugural committee. Revenue surged after Trump's mass deportation executive orders.", impact: 5, source: "https://www.opensecrets.org/trump/2025-inauguration-donors", source_label: "OpenSecrets" },
    { company: "CoreCivic", sector: "Private Prison / Detention", date: "2025-01-20", category: "trump", incident_type: "detention", issue_tags: ["ice", "detention", "trump-financial"], reason: "Second largest private immigration detention company. Holds thousands of ICE detainees. Received billions in federal contracts under Trump administration. Stock surged 40% after 2024 election on mass deportation expectations.", impact: 5, source: "https://www.opensecrets.org/trump/2025-inauguration-donors", source_label: "OpenSecrets" },
    { company: "Anduril Industries", sector: "Defense Technology / AI", date: "2025-01-01", category: "both", incident_type: "surveillance", issue_tags: ["ice", "surveillance-tech", "weapons", "trump-financial"], reason: "Provides AI-powered autonomous surveillance towers used by CBP at U.S. southern border for immigration enforcement. Founder Palmer Luckey is a major Trump donor. Supplies autonomous weapons to Israeli military.", impact: 5, source: "https://theintercept.com", source_label: "The Intercept" },
    { company: "Elbit Systems of America", sector: "Defense Technology", date: "2024-10-07", category: "israel", incident_type: "contract", issue_tags: ["gaza", "bds", "weapons", "ice"], reason: "U.S. subsidiary of Israeli weapons manufacturer supplying drones, surveillance, and munitions to IDF. Also sells border surveillance systems used by CBP along the U.S.-Mexico border.", impact: 5, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR" },
    { company: "Blackstone", sector: "Private Equity", date: "2025-01-10", category: "trump", incident_type: "investment", issue_tags: ["private-equity", "trump-financial", "food-system", "healthcare"], reason: "CEO Steve Schwarzman donated to Trump's inauguration fund. Blackstone is the world's largest landlord and has acquired hundreds of thousands of U.S. homes, thousands of hospital beds, and food distribution companies — extracting profit while driving up costs.", impact: 5, source: "https://www.brennancenter.org/our-work/research-reports/million-dollar-donors-flooded-trumps-second-inauguration", source_label: "Brennan Center" },
    { company: "Oracle", sector: "Technology / Cloud", date: "2025-01-10", category: "both", incident_type: "surveillance", issue_tags: ["ice", "surveillance-tech", "trump-financial", "gaza"], reason: "Co-CEO Larry Ellison hosted Trump fundraiser. Oracle provides cloud to ICE for immigration enforcement and to Israeli government agencies. Won billions in federal contracts under Trump. Ellison donated multiple millions to Trump-aligned causes.", impact: 4, source: "https://perfectunion.us/trumps-corporate-colluders/", source_label: "More Perfect Union" },
    { company: "Caterpillar", sector: "Heavy Equipment", date: "2024-10-07", category: "israel", incident_type: "bds", issue_tags: ["gaza", "bds", "weapons"], reason: "Top BDS priority for 20+ years. Caterpillar D9 armored bulldozers are used by IDF to demolish Palestinian homes, hospitals, and UN facilities in Gaza and West Bank. Company refuses to restrict military sales.", impact: 4, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR" },
    { company: "Motorola Solutions", sector: "Communications Technology", date: "2025-01-01", category: "israel", incident_type: "surveillance", issue_tags: ["gaza", "bds", "surveillance-tech"], reason: "Provides surveillance cameras, radio communications, and facial recognition used at Israeli military checkpoints throughout West Bank and Gaza perimeter. Listed as top BDS priority by USCPR and AFSC.", impact: 4, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR" },
    { company: "Chevron", sector: "Energy / Oil & Gas", date: "2025-01-10", category: "both", incident_type: "investment", issue_tags: ["trump-financial", "environment", "fossil-fuels", "venezuela"], reason: "Donated to Trump inauguration fund. Holds Israeli-claimed Mediterranean gas extraction rights. Received special license to continue Venezuela oil operations despite sanctions — benefiting from Trump's selective enforcement.", impact: 4, source: "https://www.brennancenter.org/our-work/research-reports/million-dollar-donors-flooded-trumps-second-inauguration", source_label: "Brennan Center" },
    { company: "Exxon Mobil", sector: "Energy / Oil & Gas", date: "2025-01-10", category: "trump", incident_type: "investment", issue_tags: ["trump-financial", "environment", "fossil-fuels"], reason: "Donated to Trump's 2025 inauguration fund. Received expedited drilling permits on newly opened federal lands under Trump's energy emergency declaration. Successfully lobbied for methane emissions regulation rollback.", impact: 4, source: "https://www.brennancenter.org/our-work/research-reports/million-dollar-donors-flooded-trumps-second-inauguration", source_label: "Brennan Center" },
    { company: "Goldman Sachs", sector: "Finance / Banking", date: "2025-01-10", category: "both", incident_type: "investment", issue_tags: ["trump-financial", "financial-deregulation", "gaza"], reason: "Donated to Trump inauguration fund. Underwrites Israeli government bonds and defense firm stock offerings. Benefited from Trump's rollback of Basel III bank capital requirements, saving billions in compliance costs.", impact: 4, source: "https://www.brennancenter.org/our-work/research-reports/million-dollar-donors-flooded-trumps-second-inauguration", source_label: "Brennan Center" },
    { company: "KKR & Co.", sector: "Private Equity", date: "2025-01-10", category: "trump", incident_type: "investment", issue_tags: ["private-equity", "trump-financial", "food-system", "healthcare"], reason: "Major Trump inauguration donor. KKR has acquired hospital chains, nursing homes, and food distribution companies. PE ownership model extracts profit while reducing care quality and food access for working Americans.", impact: 4, source: "https://perfectunion.us/trumps-corporate-colluders/", source_label: "More Perfect Union" },
    { company: "HP Inc.", sector: "Technology", date: "2025-01-01", category: "israel", incident_type: "contract", issue_tags: ["gaza", "bds", "surveillance-tech"], reason: "Provides biometric population registry and facial recognition technology used at Israeli military checkpoints in the West Bank. HP Government division holds active contracts with Israeli Defense Ministry.", impact: 4, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR" },
    { company: "L3Harris Technologies", sector: "Defense Electronics", date: "2024-10-07", category: "israel", incident_type: "contract", issue_tags: ["gaza", "weapons", "surveillance-tech"], reason: "Provides targeting systems, night vision, and surveillance tech used by Israeli Air Force in Gaza. Named in AFSC report and UN inquiry into companies enabling Israeli military operations.", impact: 4, source: "https://afsc.org/gaza-genocide-companies", source_label: "AFSC" },
    { company: "JPMorgan Chase", sector: "Finance / Banking", date: "2025-01-10", category: "trump", incident_type: "lobbying", issue_tags: ["trump-financial", "financial-deregulation"], reason: "CEO Jamie Dimon met with Trump at Mar-a-Lago and supported deregulatory agenda. JPMorgan lobbied successfully for rollback of bank capital requirements and benefits from CFPB dismantlement reducing consumer protection enforcement.", impact: 3, source: "https://perfectunion.us/trumps-corporate-colluders/", source_label: "More Perfect Union" },
    { company: "Comcast (NBCUniversal)", sector: "Media / Telecommunications", date: "2025-01-10", category: "trump", incident_type: "media", issue_tags: ["trump-financial", "media", "disinformation"], reason: "Donated to Trump's inauguration fund. NBCUniversal softened editorial coverage of Trump administration. Lobbied for FCC deregulation benefiting Comcast's broadband monopoly. Settled lawsuit with Trump ally.", impact: 3, source: "https://perfectunion.us/trumps-corporate-colluders/", source_label: "More Perfect Union" },
    { company: "Koch Industries", sector: "Conglomerate / Energy", date: "2025-01-10", category: "trump", incident_type: "lobbying", issue_tags: ["trump-financial", "environment", "fossil-fuels", "civil-rights", "labor", "disinformation"], reason: "Koch network funds anti-DEI think tanks, anti-union legislation, fossil fuel deregulation lobbying, and climate denial campaigns. Donated to Trump-aligned candidates. Benefits from every major Trump deregulatory action.", impact: 3, source: "https://perfectunion.us/trumps-corporate-colluders/", source_label: "More Perfect Union" },
    { company: "Target", sector: "Retail", date: "2025-01-10", category: "trump", incident_type: "donation", issue_tags: ["trump-financial", "civil-rights"], reason: "Donated to Trump's 2025 inauguration fund and reversed its DEI commitments in early 2025, ending supplier diversity programs and removing LGBTQ+ inclusive products under political pressure from Trump administration.", impact: 3, source: "https://www.cnbc.com/2025/04/23/trump-inauguration-donors-include-meta-amazon-target-delta-ford.html", source_label: "CNBC" },
    { company: "Ford Motor Company", sector: "Automotive", date: "2025-01-10", category: "trump", incident_type: "donation", issue_tags: ["trump-financial", "labor", "civil-rights"], reason: "Donated to Trump's 2025 inauguration fund and ended its DEI programs. Benefits from Trump's auto import tariffs. Met with Trump administration on manufacturing policy, endorsing agenda that weakened UAW collective bargaining.", impact: 3, source: "https://www.cnbc.com/2025/04/23/trump-inauguration-donors-include-meta-amazon-target-delta-ford.html", source_label: "CNBC" },
    { company: "RE/MAX", sector: "Real Estate", date: "2025-01-01", category: "israel", incident_type: "investment", issue_tags: ["gaza", "bds"], reason: "RE/MAX Israel franchises actively market and sell properties in West Bank settlements in violation of international law and multiple UN resolutions. Listed as BDS target for direct complicity in settlement expansion.", impact: 3, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR" },
    { company: "McDonald's", sector: "Food & Beverage", date: "2025-01-01", category: "israel", incident_type: "other", issue_tags: ["gaza", "bds"], reason: "McDonald's Israel franchise provided thousands of free meals to IDF soldiers during Gaza operations. Global BDS boycott caused significant sales losses across multiple markets. Company maintained Israeli franchise throughout.", impact: 3, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR" },
    { company: "Sabra Dipping Company", sector: "Food / Consumer Goods", date: "2025-01-01", category: "israel", incident_type: "investment", issue_tags: ["gaza", "bds"], reason: "Joint venture of PepsiCo and Strauss Group. Strauss's Maytronics division has donated to Israeli military units serving in occupied territories. Primary BDS consumer boycott target globally.", impact: 3, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR" },
    { company: "Starbucks", sector: "Food & Beverage", date: "2025-01-01", category: "israel", incident_type: "bds", issue_tags: ["gaza", "bds", "labor", "union-busting"], reason: "BDS target after suing its own union (Workers United) for expressing solidarity with Palestinians. Also facing multiple NLRB complaints for union-busting in the U.S. Continued Israel franchise throughout genocide.", impact: 2, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR" },
    { company: "Airbnb", sector: "Travel / Technology", date: "2025-01-01", category: "israel", incident_type: "investment", issue_tags: ["gaza", "bds"], reason: "Reversed 2018 decision to remove West Bank settlement listings under legal pressure. Continues listing properties in internationally recognized occupied Palestinian territories, generating revenue from illegal settlements.", impact: 2, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR" },
    { company: "Priceline / Booking Holdings", sector: "Travel / Technology", date: "2025-01-01", category: "israel", incident_type: "investment", issue_tags: ["gaza", "bds"], reason: "Lists Israeli West Bank settlement properties as available accommodations, normalizing and generating revenue from tourism to illegally occupied territory. BDS boycott target.", impact: 3, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR" },
    { company: "Intel", sector: "Technology / Semiconductors", date: "2025-01-01", category: "israel", incident_type: "investment", issue_tags: ["gaza", "bds"], reason: "Largest private employer in Israel with major R&D centers and chip fab receiving billions in Israeli government subsidies. Deeply integrated with Israeli defense tech ecosystem. BDS priority target.", impact: 4, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR" }
  ];

  const res = await fetch(`${SUPABASE_URL}/rest/v1/companies`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(initialData)
  });

  if (!res.ok) throw new Error(`Seed error: ${res.status} — ${await res.text()}`);
  console.log(`✅ Seeded ${initialData.length} companies`);
}

async function main() {
  console.log(`\n🕐 Corporate Accountability Tracker Agent — ${new Date().toISOString()}`);
  console.log(`📋 Tracking ${SEARCH_TOPICS.length} issue areas\n`);

  const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=id&limit=1`, {
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` }
  });
  const existing = await checkRes.json();

  if (!existing.length) {
    await seedInitialData();
    console.log('\n✅ Initial seed complete. Daily search starts tomorrow.\n');
    return;
  }

  const existingKeys = await getExistingKeys();
  console.log(`📊 ${existingKeys.size} existing incidents in database\n`);

  let allNew = [];
  for (const topic of SEARCH_TOPICS) {
    const found = await searchTopic(topic);
    for (const inc of found) {
      const cleaned = validateIncident(inc);
      if (!cleaned) continue;
      const key = `${cleaned.company}|${cleaned.date}|${cleaned.incident_type}`;
      if (!existingKeys.has(key)) {
        allNew.push(cleaned);
        existingKeys.add(key);
      }
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n📊 New incidents found: ${allNew.length}`);
  if (allNew.length) await writeToSupabase(allNew);
  else console.log('No new incidents today.');
  console.log('\n✅ Done.\n');
}

main().catch(err => { console.error('❌ Fatal:', err); process.exit(1); });
