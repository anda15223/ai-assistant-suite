/**
 * Festival Briefings — master briefings per festival slug.
 *
 * Imported by BOTH:
 *   - client/src/pages/Festivals.tsx (seeded into festivalNotes + extraDocs if not overridden)
 *   - server/brainService.ts (injected into LLM system prompt so the brain knows everything)
 *
 * Edit freely — the app reads straight from here. User overrides in localStorage
 * take precedence over the seed values for festivalNotes.
 */

export interface FestivalBriefing {
  slug: string;
  name: string;
  notes: string; // markdown body
  extraDocs: { title: string; url: string }[];
}

export const JELLING_BRIEFING: FestivalBriefing = {
  slug: "jelling",
  name: "Jelling Musikfestival",
  notes: `# JELLING MUSIKFESTIVAL 2026 — Master Briefing

## 🗓 Key Dates
- **Festival days:** 21–24 May 2026 (Thursday → Sunday)
- **Attendance:** 38,000–40,000 guests over 4 days
- **Setup/køl delivery (Godik):** 19 May 2026, window 18:00 (day before) → 07:00
- **Teardown/køl pickup (Godik):** 25 May 2026, window 18:00 → 07:00

## 📍 Location & Host
- **Festival site (pladsadresse):** Mølvangvej 66B, 7300 Jelling
- **Host (FF = Festivalfonden af 2006):** Møllegade 10, 1. sal, 7300 Jelling · CVR 29413770

## 👥 Key Contacts
| Role | Person | Phone | Email |
|---|---|---|---|
| Contract owner (FF) | Bettina Küsch | +45 7587 2888 | bettina@jellingmusikfestival.dk |
| Practical / festivalafvikling | Jonas Kring | +45 2296 9161 | jonas@skevents.dk (earlier @nicolinehus.dk) |
| Økonomi / sortiment | Jelling økonomi team | — | okonomi@jellingmusikfestival.dk |
| Akkreditering | Jelling team | — | akkreditering@jellingmusikfestival.dk |
| Godik (køl) account mgr | Jakob Muldbjerg | +45 9644 3313 | jmu@godik.dk |

## 🍔 Concepts Signed (3 booths)
All three signed under **The Fish Project ApS** (CVR 39236931, Bygade 14A, 3550 Slangerup). Alexandra Artimon (aa@thefishproject.dk / +45 4278 7738) is contact.

### 1. Chicks & Buns
- **Menu:** Fried chicken box, chicken burger, chicken bowls, gourmet jumbo fries (min 1 vegetarian, gluten-free & lactose-free options required)
- **Tent:** 12 facademeter × **6 m** dybde, shared with **La Creperie**. FF bestilt telt, plastgulv inkl. Pris modregnes i afregning.
- **Back area:** 3 m bagområde (standard)
- **Power:** 8 × 16/3A. Extra 16A = 1.000 kr/stk.
- **Opening hours:** Day 1 (Thursday) 12:00–03:00; Days 2–4 (Fri/Sat/Sun) 07:00–03:00
- **Location:** Markedspladsen / Campen

### 2. Gyros By Gaia
- **Menu:** Chicken gyros + fries (+ vegetarian / gluten / lactose options)
- **Tent:** 12 facademeter × **9 m** dybde, shared with **Fish Project**. FF bestilt telt.
- **Back area:** 3 m bagområde
- **Power:** 2 × 32A + 5 × 16A. Extra 16A = 1.000 kr/stk.
- **Opening hours:** Match pladsens åbningstider
- **Location:** main site

### 3. La Creperie
- **Menu:** Sweet / savoury / breakfast pancakes (egg & bacon)
- **Tent:** 12 × 6 m, shared with **Chicks & Buns**. FF bestilt.
- **Power:** 7 × 230V. Extra 16A = 1.000 kr/stk.
- **Opening hours:** Day 1 12:00–03:00; Days 2–4 07:00–03:00

### 4. Fish Bistro (also operating?)
- Menu (DK/EN 2026) in Drive: Fish & Chips 155 kr, Fish Burger Combo 145 kr, Moules Frites 135 kr, Tuna Tartar 145 kr, Fish of the Month 165 kr, Tuna Salad 145 kr, Fish Soup 130 kr, Shrimp Linguine 135 kr, Salmon Pasta 135 kr, Sardines Conservas 125 kr, Gillardeau Oysters 65 kr/stk, 6 stk 325 kr (+25 for 2 glas bobler). Sides: tuna salad 60, tiger prawns 65, bread & butter 35.

## 🥤 Beverage Rule — IMPORTANT
**Only Egekilde spring water (Royal brand) may be sold.** No other drinks unless described in the menu section of the contract. Non-compliance = breach.

## ♻️ Cleanliness & End-of-festival
- Continuous cleanup in 10 m radius of booth during festival
- Waste sorted per festival rules
- Full teardown cleanup by 07:00 the morning after day 4 (before site walkthrough with Jonas Kring)
- Own fire equipment ADAPTED to booth activity

## 🏗 Facade Rules (NEW 2026 — BR18 bilag 11)
- Facades must NOT be fixed to tent structure (breaks cert)
- On tents: ophængt skilt/objekt max 2 × 25 kg split on kip + midtspær
- Facades within tent gavl (2.2 m side, 3.3 m kip) = no approval needed, must be anchored (pole-bored or screw foundation)
- Facades sticking ABOVE tent: need certification (Teknologisk Institut) OR Vejle Kommune byggetilladelse
- **Truss rental option** from festival: 950 kr + moms per facademeter (festival pays ½) → **stadeholder net price 475 kr + moms/facademeter**
- Food trucks / containers: facades must be self-certified
- Issued: Jelling 25 March 2026

## 📦 Sortiment Deadline
- **Excel template "2026 Stadeholdere skabelon til oprettelse af produkter"** received 20 March 2026 from okonomi@jellingmusikfestival.dk
- **DEADLINE: 15 April 2026** (⚠️ ALREADY PASSED — confirm status!)
- Must fill: company name, sortiment contact, bank account for payout, emails for POS access, product list (name/type/category/tab/VAT-incl price/salesstand/extra info). Product types: Mad / Menu / Drikke / Kiosk / Andet. Categories include Måltid, Snacks, Sødt, Morgenmad, ØL, Drinks, Vin/Champagne, etc.

## 📋 Other Deadlines
- **15 March 2026:** Back-area layout sketch (tegning) submitted — 12 m bred × 3 m dyb. Show køletrailer, kølebil, palleplads + mål i meter. Show telt installations (el/gas). ⚠️ PAST DUE — confirm submission.
- **9 April 2026 — URGENT:** Teltfacade follow-up email from Jonas Kring → needs facade-on-tent-structure details
- **14 April 2026:** 4× akkreditering invitations received from akkreditering@jellingmusikfestival.dk → need to submit staff list

## 🧊 Cooling Container Order (Godik, tilbud 247741)
- **2 × køle/frysecontainer 20 fod** m/ 2 låsebeslag each
- 10 m elkabel 400V/32A included
- 2 × CISA padlock (1 nøgle hver)
- External dimensions: H 270 × B 250 × L 615 cm
- **Transport tur/retur incl. vejafgift:** 7,280 kr
- **Forsikring/Track&Trace/miljø/diesel 7.5%:** 954 kr
- **Total excl. moms: 12,586 kr** · incl. moms: **15,732.50 kr**
- **Payment:** net 7 days before delivery (= by 12 May 2026)
- **Customer:** Blue Fish ApS, CVR 40747745, c/o Alexandra Artimon, Gentoftegade 110 kl, 2820 Gentofte
- ⚠️ **Godik tilbud 247805 (Heartland) and 247806 (Syd For Solen)** same bundle — accept each with "Tilbud nr. 24xxxx ver. 1 ACCEPTERES" per-email reply.
- **We supply tilslutning/frakobling ourselves** — Godik does NOT crane or hook up.
- Return in same cleaned state.

## 🔌 Power
- Base power supplied by FF per contract per concept (see above)
- Extra 16A = 1,000 kr each
- 2026-03-13 email from Jonas Kring: "Power Jelling" PDF attached (placement/totals)
- Internal note (2026-02-05 Alexandra → Filip): "At Jelling, in our experience, it has never really mattered whether we had more or less, because in the end it was always paid per outlet."
- **We bring our own cables:** min 30 m kabeltromler + overgang from CEE-stik til LK-stik

## 📊 2025 Sales Heatmaps (for 2026 forecast)
### Fish Project 2025 — total 4,278 units over 4 days
- Peak hours: 29/05 19–20 = 204; 31/05 15–16 = 210; 31/05 18–19 = 219; 31/05 21–22 = 211
- Opening hour (12:00): very low (5–7 units)
- Late night dies off quickly after 01:00

### Gyros By Gaia 2025
- Peak: 28/05 19–20 = 274; 29/05 19–20 = 276; 30/05 20–21 = 256
- Strong 18:00–22:00 window consistently across all days

## 💸 Commission & Economy
- FF modregner tent cost in afregning
- (Separate) GAIA tillæg til kontrakt = **NICOLINEHUS Markedshallen** — NOT Jelling. 21% bruttoomsætning + 500,000 kr/år minimumsleje. Filed under Jelling by mistake in email thread.
- Northside & Jelling internal note (2026-02-16): production cost 23% similar at both

## 🧑‍🍳 Staff
- Marius Artimon (ma@thefishproject.dk) maintaining Fidibus Festival Team Events Calendar 2026 + "Updated Summer 2026 Festival Staffing Calendar"
- Marko Blazevic 2025 Jelling hours: 62 h total (28.5 14h, 29.5 12h, 30.5 16h, 31.5 15h, 1.6 cleanup 2h + van 3h)

## 📎 Attachments Archive (email-exports)
- Chicks & Buns kontrakt 2026.pdf · Gyros By Gaia kontrakt 2026.pdf · La Creperie kontrakt 2026.pdf
- Facader på salgsboder ved Jelling Musikfestival 2026.pdf
- Skabelon til tegning af matrikler (12×6/9 m).pdf
- Godik tilbud 247741 (Jelling) + 247805 (Heartland) + 247806 (Syd For Solen).pdf
- Godik salgs/leverings- & lejebetingelser.pdf
- 2026 Stadeholdere skabelon til oprettelse af produkter.xlsx
- Fish Heatmap 2025.xlsx · Gaia heatmap 2025.xlsx
- Menu DK 2026.pdf · Menu EN 2026.pdf · Menu fall '25 Fish Bistro DK/EN.pdf
- TRUSS.pdf (facade truss option)

## ⚠️ Open Issues / Action Items
1. **Sortiment skabelon** return to okonomi@jellingmusikfestival.dk — deadline was 15 April
2. **Back-area tegning** — deadline was 15 March
3. **Teltfacade (URGENT 9 April email)** — BR18 certification path chosen? Truss order confirmed?
4. **Akkreditering** — submit staff list (4 invitations received 14 April)
5. **Godik payment** — net 7 days before 19 May = pay by 12 May 2026 (15,732.50 kr)
6. **Extra power** ordering — decide per booth if more than contract baseline needed
`,
  extraDocs: [
    { title: "📁 Google Drive — FESTIVALS 2026 / 01 Jelling", url: "https://drive.google.com/drive/folders/1C6xyUvondxS67EDcBbUPEyuXuJwgW4ky" },
    { title: "📄 Chicks & Buns kontrakt 2026 (FF)", url: "https://drive.google.com/drive/folders/1C6xyUvondxS67EDcBbUPEyuXuJwgW4ky" },
    { title: "📄 Gyros By Gaia kontrakt 2026 (FF)", url: "https://drive.google.com/drive/folders/1C6xyUvondxS67EDcBbUPEyuXuJwgW4ky" },
    { title: "📄 La Creperie kontrakt 2026 (FF)", url: "https://drive.google.com/drive/folders/1C6xyUvondxS67EDcBbUPEyuXuJwgW4ky" },
    { title: "📄 Facader på salgsboder 2026 (BR18 rules)", url: "https://drive.google.com/drive/folders/1C6xyUvondxS67EDcBbUPEyuXuJwgW4ky" },
    { title: "📐 Matrikel-tegning skabelon 12x6/9m", url: "https://drive.google.com/drive/folders/1C6xyUvondxS67EDcBbUPEyuXuJwgW4ky" },
    { title: "📄 Godik tilbud 247741 — Jelling køl (2×20ft)", url: "https://drive.google.com/drive/folders/1C6xyUvondxS67EDcBbUPEyuXuJwgW4ky" },
    { title: "📄 Godik salgs/leverings- & lejebetingelser", url: "https://drive.google.com/drive/folders/1C6xyUvondxS67EDcBbUPEyuXuJwgW4ky" },
    { title: "📊 Sortiment skabelon 2026 (xlsx)", url: "https://drive.google.com/drive/folders/1C6xyUvondxS67EDcBbUPEyuXuJwgW4ky" },
    { title: "📊 Fish heatmap 2025 (4,278 units total)", url: "https://drive.google.com/drive/folders/1C6xyUvondxS67EDcBbUPEyuXuJwgW4ky" },
    { title: "📊 Gaia heatmap 2025", url: "https://drive.google.com/drive/folders/1C6xyUvondxS67EDcBbUPEyuXuJwgW4ky" },
    { title: "🍽 Menu DK 2026", url: "https://drive.google.com/drive/folders/1C6xyUvondxS67EDcBbUPEyuXuJwgW4ky" },
    { title: "🍽 Menu EN 2026", url: "https://drive.google.com/drive/folders/1C6xyUvondxS67EDcBbUPEyuXuJwgW4ky" },
  ],
};

export const FESTIVAL_BRIEFINGS: Record<string, FestivalBriefing> = {
  jelling: JELLING_BRIEFING,
};

/**
 * Get a briefing by festival slug. Returns undefined if not present.
 */
export function getBriefing(slug: string): FestivalBriefing | undefined {
  return FESTIVAL_BRIEFINGS[slug];
}

/**
 * Compact briefing — strips the markdown back down to a dense prose block
 * suitable for injection into an LLM system prompt without blowing the budget.
 * (Currently a passthrough; keep the full notes — Claude handles long context fine.)
 */
export function getBriefingForPrompt(slug: string): string {
  const b = FESTIVAL_BRIEFINGS[slug];
  if (!b) return "";
  return b.notes;
}
