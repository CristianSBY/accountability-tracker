// daily-agent.js
// Runs daily at 7am CT via GitHub Actions
// Searches for new corporate incidents and writes them to Supabase

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ─── SEARCH FOR NEW INCIDENTS ─────────────────────────────────────────────────
async function findNewIncidents() {
  console.log('🔍 Searching for new corporate incidents...');

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const prompt = `You are a corporate accountability researcher. Search for and identify NEW incidents from ${yesterday} to ${today} involving U.S. companies that:

1. Made donations to Donald Trump, his inauguration fund, or Trump-aligned PACs
2. Received government contracts awarded by the Trump administration (defense, infrastructure, tech)
3. Made investments or have financial ties that directly benefit from Trump administration policies (deregulation, tariff exemptions, fossil fuel expansion)
4. Lobbied successfully for Trump administration policy positions
5. Have weapons contracts, technology contracts, or supply chain ties to Israeli military operations in Gaza
6. Are designated BDS (Boycott, Divestment, Sanctions) targets by USCPR, AFSC, or UN reports
7. Profited from Israeli settlement activities in the West Bank

For each incident found, return a JSON array. Each object must have these exact fields:
- company: string (company name)
- sector: string (industry sector)
- date: string (YYYY-MM-DD format, date of the incident)
- category: string (must be exactly "trump", "israel", or "both")
- incident_type: string (must be exactly one of: "donation", "contract", "investment", "lobbying", "bds", "other")
- reason: string (2-3 sentence factual description citing specific amounts, dates, and actions)
- impact: number (1-5 score based on this rubric:
    5 = ≥$2M donation OR direct weapons contracts to Israeli military
    4 = $1M-$2M donation OR top BDS target OR major defense contract
    3 = <$1M donation OR moderate Israel ties OR significant lobbying win
    2 = PAC support, minor lobbying, or indirect investment
    1 = peripheral or indirect involvement)
- source: string (full URL to primary source - FEC, OpenSecrets, NGO report, or major news)
- source_label: string (short name of source e.g. "OpenSecrets", "AFSC", "Reuters")

Return ONLY a valid JSON array. No preamble, no markdown, no explanation.
If no new incidents are found, return an empty array: []

Focus on: FEC filings, OpenSecrets, AFSC reports, USCPR BDS list updates, UN reports, Reuters, AP, CNBC, Bloomberg financial disclosures.`;

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
      tools: [{
        type: 'web_search_20250305',
        name: 'web_search'
      }],
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();

  // Extract text from response
  const text = data.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');

  // Parse JSON
  const clean = text.replace(/```json|```/g, '').trim();
  const incidents = JSON.parse(clean);
  console.log(`✅ Found ${incidents.length} new incidents`);
  return incidents;
}

// ─── GET EXISTING COMPANIES TO AVOID DUPLICATES ───────────────────────────────
async function getExistingEntries() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/companies?select=company,date,incident_type`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    }
  );
  if (!res.ok) throw new Error(`Supabase fetch error: ${res.status}`);
  return await res.json();
}

// ─── WRITE NEW INCIDENTS TO SUPABASE ─────────────────────────────────────────
async function writeToSupabase(incidents) {
  if (!incidents.length) {
    console.log('No new incidents to write.');
    return;
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/companies`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(incidents)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase write error: ${res.status} — ${err}`);
  }

  console.log(`✅ Wrote ${incidents.length} new incidents to database`);
}

// ─── SEED INITIAL DATA ────────────────────────────────────────────────────────
async function seedInitialData() {
  console.log('🌱 Seeding initial dataset...');

  const initialData = [
    { company: "Amazon", sector: "Technology / Retail", date: "2025-01-10", category: "both", incident_type: "donation", reason: "Jeff Bezos donated $1M to Trump's 2025 inauguration fund. Amazon Web Services maintains contracts with Israeli government and military intelligence. Amazon's Project Nimbus provides cloud infrastructure to Israeli Defense Ministry.", impact: 5, source: "https://www.opensecrets.org/trump/2025-inauguration-donors", source_label: "OpenSecrets" },
    { company: "Meta (Facebook)", sector: "Technology / Social Media", date: "2025-01-10", category: "trump", incident_type: "donation", reason: "Mark Zuckerberg personally donated $1M to Trump's 2025 inauguration fund. Zuckerberg met privately with Trump at Mar-a-Lago and softened Meta's content moderation policies.", impact: 5, source: "https://www.cnbc.com/2025/04/23/trump-inauguration-donors-include-meta-amazon-target-delta-ford.html", source_label: "CNBC" },
    { company: "Boeing", sector: "Defense / Aerospace", date: "2024-10-07", category: "israel", incident_type: "contract", reason: "Supplier of MK-84 2,000-lb bombs and F-15 fighter jets used in Israeli military operations in Gaza. Named in AFSC's Companies Profiting from the Gaza Genocide report and targeted by BDS campaign.", impact: 5, source: "https://afsc.org/gaza-genocide-companies", source_label: "AFSC" },
    { company: "Lockheed Martin", sector: "Defense", date: "2024-10-07", category: "israel", incident_type: "contract", reason: "Major supplier of F-35 fighter jets and other weapons systems used by Israeli Air Force. Listed in AFSC Gaza genocide companies report. Supplies munitions used in Gaza operations.", impact: 5, source: "https://afsc.org/gaza-genocide-companies", source_label: "AFSC" },
    { company: "Google (Alphabet)", sector: "Technology", date: "2024-04-17", category: "israel", incident_type: "contract", reason: "Project Nimbus: $1.2B cloud and AI contract with Israeli government and military. Employees staged walkouts over the contract. Provides AI and data analytics to Israeli Defense Ministry.", impact: 5, source: "https://www.aljazeera.com/news/2025/7/1/un-report-lists-companies-complicit-in-israels-genocide-who-are-they", source_label: "Al Jazeera" },
    { company: "Microsoft", sector: "Technology", date: "2024-10-07", category: "israel", incident_type: "contract", reason: "Azure cloud services provided to Israeli military and intelligence agencies. Listed in AFSC report. UN report cited Microsoft's role in enabling Israeli military operations.", impact: 5, source: "https://afsc.org/gaza-genocide-companies", source_label: "AFSC" },
    { company: "Palantir Technologies", sector: "AI / Data Analytics", date: "2024-10-07", category: "both", incident_type: "contract", reason: "Provides AI-powered intelligence software (Gotham platform) to Israeli military for targeting and surveillance. CEO Alex Karp is vocal Trump supporter; company won multiple U.S. defense contracts under Trump.", impact: 5, source: "https://mondoweiss.net/2025/07/new-un-report-reveals-the-companies-getting-rich-off-israeli-occupation-and-genocide/", source_label: "Mondoweiss / UN" },
    { company: "General Dynamics", sector: "Defense", date: "2024-10-07", category: "israel", incident_type: "contract", reason: "Supplier of 155mm artillery shells and armored vehicles to Israel. Named in AFSC Gaza genocide report and UN investigation into companies profiting from Israeli military operations.", impact: 5, source: "https://afsc.org/gaza-genocide-companies", source_label: "AFSC" },
    { company: "Raytheon (RTX)", sector: "Defense", date: "2024-10-07", category: "israel", incident_type: "contract", reason: "Manufactures Hellfire missiles, Patriot air defense systems, and other weapons actively used by Israeli military in Gaza. Primary defense contractor to Israel, listed by AFSC.", impact: 5, source: "https://afsc.org/gaza-genocide-companies", source_label: "AFSC" },
    { company: "Northrop Grumman", sector: "Defense", date: "2024-10-07", category: "israel", incident_type: "contract", reason: "Supplies ammunition, electronic warfare systems, and propulsion for Israeli military aircraft and munitions. Listed in AFSC Gaza genocide report.", impact: 5, source: "https://afsc.org/gaza-genocide-companies", source_label: "AFSC" },
    { company: "Elbit Systems of America", sector: "Defense Technology", date: "2024-10-07", category: "israel", incident_type: "contract", reason: "U.S. subsidiary of Israeli weapons manufacturer Elbit Systems. Supplies drones, surveillance systems, and munitions directly to Israeli military. Primary target of BDS and anti-genocide activists.", impact: 5, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR BDS List" },
    { company: "Target", sector: "Retail", date: "2025-01-10", category: "trump", incident_type: "donation", reason: "Donated to Trump's 2025 inauguration fund. CEO signed onto inaugural business roundtable supporting Trump's economic agenda following corporate donation.", impact: 4, source: "https://www.cnbc.com/2025/04/23/trump-inauguration-donors-include-meta-amazon-target-delta-ford.html", source_label: "CNBC" },
    { company: "Delta Air Lines", sector: "Aviation / Travel", date: "2025-01-10", category: "trump", incident_type: "donation", reason: "Donated to Trump's 2025 inauguration fund. CEO Ed Bastian attended inauguration events. Delta contributed to PACs supporting Trump-aligned candidates.", impact: 4, source: "https://www.cnbc.com/2025/04/23/trump-inauguration-donors-include-meta-amazon-target-delta-ford.html", source_label: "CNBC" },
    { company: "Ford Motor Company", sector: "Automotive", date: "2025-01-10", category: "trump", incident_type: "donation", reason: "Donated to Trump's 2025 inauguration fund. CEO Jim Farley met with Trump at Mar-a-Lago and expressed support for Trump's tariff and manufacturing policies.", impact: 4, source: "https://www.cnbc.com/2025/04/23/trump-inauguration-donors-include-meta-amazon-target-delta-ford.html", source_label: "CNBC" },
    { company: "Caterpillar", sector: "Heavy Equipment", date: "2024-10-07", category: "israel", incident_type: "bds", reason: "Top BDS boycott priority. Caterpillar D9 armored bulldozers used by Israeli Defense Forces to demolish Palestinian homes and infrastructure in Gaza and West Bank.", impact: 4, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR BDS List" },
    { company: "HP Inc.", sector: "Technology", date: "2025-01-01", category: "israel", incident_type: "contract", reason: "Provides biometric systems and facial recognition technology used at Israeli military checkpoints in the West Bank. HP Government division holds Israeli military contracts.", impact: 4, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR BDS List" },
    { company: "Chevron", sector: "Energy / Oil & Gas", date: "2025-01-10", category: "both", incident_type: "investment", reason: "Donated to Trump's 2025 inauguration fund. Chevron has natural gas extraction rights in Israeli-claimed Mediterranean waters (Leviathan field). Benefits from Trump's fossil fuel deregulation agenda.", impact: 4, source: "https://www.brennancenter.org/our-work/research-reports/million-dollar-donors-flooded-trumps-second-inauguration", source_label: "Brennan Center" },
    { company: "Goldman Sachs", sector: "Finance / Banking", date: "2025-01-10", category: "both", incident_type: "investment", reason: "Donated to Trump's 2025 inauguration fund. Goldman Sachs has significant underwriting relationships with Israeli government bonds and defense firms.", impact: 4, source: "https://www.brennancenter.org/our-work/research-reports/million-dollar-donors-flooded-trumps-second-inauguration", source_label: "Brennan Center" },
    { company: "Exxon Mobil", sector: "Energy / Oil & Gas", date: "2025-01-10", category: "trump", incident_type: "donation", reason: "Donated to Trump's 2025 inauguration fund. ExxonMobil strongly supported Trump's withdrawal from Paris Climate Agreement and expansion of domestic drilling.", impact: 4, source: "https://www.brennancenter.org/our-work/research-reports/million-dollar-donors-flooded-trumps-second-inauguration", source_label: "Brennan Center" },
    { company: "Oracle", sector: "Technology / Cloud", date: "2025-01-10", category: "both", incident_type: "investment", reason: "Co-CEO Larry Ellison is a major Trump donor and hosted Trump fundraiser. Oracle provides cloud computing services to Israeli military and intelligence agencies.", impact: 4, source: "https://perfectunion.us/trumps-corporate-colluders/", source_label: "More Perfect Union" },
    { company: "Motorola Solutions", sector: "Communications Technology", date: "2025-01-01", category: "israel", incident_type: "contract", reason: "Provides surveillance and communications equipment used by Israeli military at West Bank checkpoints and settlement perimeters. Major BDS target; listed in USCPR and AFSC reports.", impact: 4, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR BDS List" },
    { company: "L3Harris Technologies", sector: "Defense Electronics", date: "2024-10-07", category: "israel", incident_type: "contract", reason: "Provides surveillance and targeting systems used by Israeli Air Force. Named in AFSC report and UN inquiry into companies supplying technology enabling military operations in Gaza.", impact: 4, source: "https://afsc.org/gaza-genocide-companies", source_label: "AFSC" },
    { company: "Intel", sector: "Technology / Semiconductors", date: "2025-01-01", category: "israel", incident_type: "investment", reason: "Operates major R&D centers and a chip fab in Israel. Designated as BDS priority target due to deep integration with Israeli defense-technology ecosystem generating billions in Israeli economic activity.", impact: 4, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR BDS List" },
    { company: "JPMorgan Chase", sector: "Finance / Banking", date: "2025-01-10", category: "trump", incident_type: "lobbying", reason: "Jamie Dimon met with Trump at Mar-a-Lago post-election. JPMorgan lobbied for rollback of banking capital requirements under Trump administration. Expressed support for Trump's deregulatory agenda.", impact: 3, source: "https://perfectunion.us/trumps-corporate-colluders/", source_label: "More Perfect Union" },
    { company: "Bank of America", sector: "Finance / Banking", date: "2025-01-10", category: "trump", incident_type: "donation", reason: "Contributed to Trump's 2025 inauguration fund. CEO Brian Moynihan participated in Trump economic roundtables and lobbied for financial deregulation.", impact: 3, source: "https://www.brennancenter.org/our-work/research-reports/million-dollar-donors-flooded-trumps-second-inauguration", source_label: "Brennan Center" },
    { company: "Walmart", sector: "Retail", date: "2025-01-10", category: "trump", incident_type: "donation", reason: "Donated to Trump's 2025 inauguration fund. CEO Doug McMillon participated in Trump CEO roundtable and pledged cooperation on domestic manufacturing.", impact: 3, source: "https://perfectunion.us/trumps-corporate-colluders/", source_label: "More Perfect Union" },
    { company: "Uber", sector: "Technology / Transportation", date: "2025-01-10", category: "trump", incident_type: "lobbying", reason: "CEO Dara Khosrowshahi donated to and attended Trump's 2025 inauguration events. Uber benefited from Trump administration's gig-economy deregulation and labor classification rulings.", impact: 3, source: "https://perfectunion.us/trumps-corporate-colluders/", source_label: "More Perfect Union" },
    { company: "Comcast (NBCUniversal)", sector: "Media / Telecommunications", date: "2025-01-10", category: "trump", incident_type: "donation", reason: "Donated to Trump's 2025 inauguration fund. NBCUniversal reduced adversarial coverage following Trump inauguration. Comcast settled lawsuit with Trump ally.", impact: 3, source: "https://perfectunion.us/trumps-corporate-colluders/", source_label: "More Perfect Union" },
    { company: "IBM", sector: "Technology / Consulting", date: "2025-01-01", category: "israel", incident_type: "contract", reason: "IBM Watson AI services contracted with Israeli government agencies. IBM Israel is a major tech partner to Israeli defense sector R&D. Listed in UN corporate complicity inquiry.", impact: 3, source: "https://mondoweiss.net/2025/07/new-un-report-reveals-the-companies-getting-rich-off-israeli-occupation-and-genocide/", source_label: "Mondoweiss / UN" },
    { company: "Koch Industries", sector: "Conglomerate / Energy", date: "2025-01-10", category: "trump", incident_type: "lobbying", reason: "Koch network PACs contributed to Trump-aligned campaigns. Koch Industries lobbied heavily for Trump deregulatory priorities across energy, agriculture, and manufacturing sectors.", impact: 3, source: "https://perfectunion.us/trumps-corporate-colluders/", source_label: "More Perfect Union" },
    { company: "Priceline / Booking Holdings", sector: "Travel / Technology", date: "2025-01-01", category: "israel", incident_type: "investment", reason: "Lists Israeli settlements in the West Bank as available lodging. BDS boycott target for normalizing and profiting from settlement tourism in internationally recognized occupied territory.", impact: 3, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR BDS List" },
    { company: "RE/MAX", sector: "Real Estate", date: "2025-01-01", category: "israel", incident_type: "investment", reason: "RE/MAX Israel franchises actively market and sell properties in Israeli settlements in the West Bank in violation of international law. Listed as BDS target for settlement expansion complicity.", impact: 3, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR BDS List" },
    { company: "McDonald's", sector: "Food & Beverage", date: "2025-01-01", category: "israel", incident_type: "other", reason: "McDonald's Israel franchise provided free meals to Israeli Defense Forces during Gaza operations. Global BDS boycott campaign caused reported sales losses across multiple markets.", impact: 3, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR BDS List" },
    { company: "Sabra Dipping Company", sector: "Food / Consumer Goods", date: "2025-01-01", category: "israel", incident_type: "investment", reason: "Jointly owned by PepsiCo and Israeli company Strauss Group, whose other division has donated to Israeli military units. Primary BDS consumer boycott target due to Strauss's direct military support.", impact: 3, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR BDS List" },
    { company: "Visa", sector: "Finance / Payments", date: "2025-01-10", category: "trump", incident_type: "lobbying", reason: "Donated to Trump's 2025 inauguration fund. Visa lobbied for Trump administration regulatory positions on financial technology and cross-border payment oversight favoring incumbents.", impact: 2, source: "https://www.brennancenter.org/our-work/research-reports/million-dollar-donors-flooded-trumps-second-inauguration", source_label: "Brennan Center" },
    { company: "Mastercard", sector: "Finance / Payments", date: "2025-01-10", category: "trump", incident_type: "lobbying", reason: "Donated to Trump's 2025 inauguration fund. CEO participated in Trump-era financial deregulation roundtables.", impact: 2, source: "https://www.brennancenter.org/our-work/research-reports/million-dollar-donors-flooded-trumps-second-inauguration", source_label: "Brennan Center" },
    { company: "Pfizer", sector: "Pharmaceuticals", date: "2025-01-10", category: "trump", incident_type: "lobbying", reason: "Donated to Trump's 2025 inauguration fund. Pfizer's lobbying aligned with Trump's HHS priorities and benefited from administration's pharmaceutical deregulation agenda.", impact: 2, source: "https://perfectunion.us/trumps-corporate-colluders/", source_label: "More Perfect Union" },
    { company: "Citigroup", sector: "Finance / Banking", date: "2025-01-10", category: "trump", incident_type: "lobbying", reason: "Donated to Trump's 2025 inauguration fund. Citi CEO participated in Trump CEO forums. Citigroup lobbied for rollback of banking regulations under Trump administration.", impact: 2, source: "https://www.brennancenter.org/our-work/research-reports/million-dollar-donors-flooded-trumps-second-inauguration", source_label: "Brennan Center" },
    { company: "Verizon", sector: "Telecommunications", date: "2025-01-10", category: "trump", incident_type: "lobbying", reason: "Donated to Trump's 2025 inauguration fund and lobbied for FCC deregulation under Trump appointees. CEO participated in Trump economic advisory sessions.", impact: 2, source: "https://www.brennancenter.org/our-work/research-reports/million-dollar-donors-flooded-trumps-second-inauguration", source_label: "Brennan Center" },
    { company: "American Express", sector: "Finance / Payments", date: "2025-01-10", category: "trump", incident_type: "donation", reason: "Donated to Trump's 2025 inauguration fund. CEO Stephen Squeri attended Trump economic roundtables and expressed support for financial deregulation agenda.", impact: 2, source: "https://www.brennancenter.org/our-work/research-reports/million-dollar-donors-flooded-trumps-second-inauguration", source_label: "Brennan Center" },
    { company: "Deloitte", sector: "Consulting", date: "2025-01-10", category: "trump", incident_type: "contract", reason: "Listed as corporate colluder by More Perfect Union. Deloitte won significant federal consulting contracts under Trump administration and donated to inauguration fund through affiliated partners.", impact: 2, source: "https://perfectunion.us/trumps-corporate-colluders/", source_label: "More Perfect Union" },
    { company: "Airbnb", sector: "Travel / Technology", date: "2018-11-19", category: "israel", incident_type: "investment", reason: "Initially agreed to remove West Bank settlement listings under BDS pressure in 2018, then reversed the decision. Continues to list properties in occupied Palestinian territories.", impact: 2, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR BDS List" },
    { company: "Starbucks", sector: "Food & Beverage", date: "2025-01-01", category: "israel", incident_type: "bds", reason: "BDS target following Starbucks Workers United expressing solidarity with Palestinians. Starbucks sued its union. Israel franchise continues operations despite consumer boycott and reported sales decline.", impact: 2, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR BDS List" },
    { company: "Puma", sector: "Apparel / Sports", date: "2025-01-01", category: "israel", incident_type: "investment", reason: "Puma sponsors the Israeli Football Association, which includes teams in West Bank settlements. Listed as BDS priority target despite announced sponsorship review.", impact: 2, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR BDS List" },
    { company: "JBS (Pilgrim's Pride)", sector: "Food / Agriculture", date: "2025-01-10", category: "trump", incident_type: "lobbying", reason: "U.S. subsidiary listed as Trump colluder by More Perfect Union. Donated to Trump-affiliated PACs and lobbied against labor and environmental regulations under Trump.", impact: 2, source: "https://perfectunion.us/trumps-corporate-colluders/", source_label: "More Perfect Union" },
    { company: "SodaStream (PepsiCo)", sector: "Consumer Goods", date: "2025-01-01", category: "israel", incident_type: "investment", reason: "SodaStream, owned by PepsiCo, operated its primary factory in an Israeli West Bank settlement until 2015. BDS target; PepsiCo acquisition extended boycott calls to the parent brand.", impact: 2, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR BDS List" },
    { company: "Wix.com", sector: "Technology / Web Services", date: "2025-01-01", category: "israel", incident_type: "investment", reason: "Israeli-founded tech company with R&D in Tel Aviv providing tax base for Israeli economy. BDS target for Israeli economic ties and refusal to divest Israeli operations.", impact: 1, source: "https://uscpr.org/activist-resource/boycott-divestment-and-sanctions/", source_label: "USCPR BDS List" }
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

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Seed error: ${res.status} — ${err}`);
  }

  console.log(`✅ Seeded ${initialData.length} initial companies`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🕐 Running accountability tracker agent — ${new Date().toISOString()}\n`);

  // Check if DB is empty — if so, seed it
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/companies?select=id&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    }
  );
  const existing = await checkRes.json();

  if (!existing.length) {
    await seedInitialData();
    console.log('✅ Initial seed complete. Skipping news search on first run.');
    return;
  }

  // Find and write new incidents
  try {
    const incidents = await findNewIncidents();

    if (incidents.length > 0) {
      // Get existing to dedup
      const existingEntries = await getExistingEntries();
      const existingKeys = new Set(
        existingEntries.map(e => `${e.company}|${e.date}|${e.incident_type}`)
      );

      const newOnly = incidents.filter(inc =>
        !existingKeys.has(`${inc.company}|${inc.date}|${inc.incident_type}`)
      );

      console.log(`📊 ${incidents.length} found, ${newOnly.length} are new (deduped)`);
      await writeToSupabase(newOnly);
    }
  } catch (err) {
    console.error('❌ Agent error:', err.message);
    process.exit(1);
  }

  console.log('\n✅ Agent run complete.\n');
}

main();
