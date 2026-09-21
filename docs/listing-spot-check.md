# Listing spot-check (independent audit)

Date: 2026-09-15 · Auditor: independent data check (read-only; no code, annotation or content file was changed).

## Method

1. **Sample.** 23 listings: the 20 required refs plus B304 (the only `warehouse`), B327 and B346 (duplicate pair). The sample covers every type in the collection (apartment, duplex, penthouse, house, land, commercial, office, warehouse, building) and both deals (16 sale, 7 rent).
2. **Field comparison.** For each listing I read `src/content/listings/<ref>.json` and compared every non-null structured field against `../instagram/listings/<date>_<REF>_<slug>/description.txt`. That covers the header, the primary caption and any extra captions. I also checked `deal`, `type`, `priceOnRequest`, `aiVisualisation` (true or false), `titleSq` and `titleEn`. Overrides in `data/listings/<REF>.json` were checked against their quoted evidence. Where the evidence was an image, I opened the image (B391 `01.jpg`, B397 `01.jpg`) or the contact sheet.
3. **Verdicts.**
   - **MATCH**: the value is stated in the caption, or on the agency's own listing graphic via an `image:` override.
   - **MISMATCH**: the value differs from the source.
   - **OVERREACH**: the source does not state the value, or the site adds a qualifier the source does not state.
   - **MISSED**: the caption states a fact but the field is null.
   - "MATCH (note)" means the value is correct but has a caveat.
4. **Display context.** I checked how fields reach readers in `src/views/ListingView.astro` and `src/i18n/*.ts`: `isNewBuild` shows as "New build: Yes", `minContractMonths` is labelled "Minimum contract", and the AI note only shows when disclaimer text exists.
5. **Translation.** I read every `descriptionEn` paragraph (and `extraCaptions[].en`) side by side with `descriptionSq`, looking for added or dropped facts and embellishment.
6. **Duplicates.** I read the captions of every pair flagged in `docs/listing-import-report.md`. I compared contact sheets (`data/import-draft/sheets/`). I computed MD5 hashes of every source image across all 76 folders, trigram similarity of all captions, and same-size pairs.
7. **Counts.** I compared folders, CSV rows, content files, annotation files and asset folders.

**Fields checked: 404** across 23 listings (the sum of per-listing rows below).
Result: **395 MATCH · 0 MISMATCH · 9 OVERREACH**, plus a small number of acceptable MISSED facts.

---

## Per-listing tables

### B301 · rent · duplex
| Field | Site value | Source quote | Verdict |
|---|---|---|---|
| deal / type | rent / duplex | "Lloji / Deal: Qira (rent)", "Prona / Property: Duplex" | MATCH |
| city / neighbourhood / country | Prishtinë / Pejton / XK | "në Pejton, Prishtinë" | MATCH |
| areaNet | 200 | "duplex me sipërfaqe 200m²" | MATCH |
| bedrooms | 3 | "tri dhoma gjumi" | MATCH |
| bathrooms | 3 | "tri banjo" | MATCH |
| features: garage | ✓ | "garazh apo parking të dedikuar" | MATCH (note: caption says garage *or* parking) |
| features: parking | ✓ | same | MATCH (note, same caveat) |
| priceOnRequest | true | "Çmimi sipas marrëveshjes." | MATCH |
| aiVisualisation | false | no disclaimer, no renders | MATCH |
| titleSq / titleEn | Duplex me qira në Pejton, Prishtinë / Duplex for rent in Pejton, Prishtina | title sentence | MATCH |

MISSED: none. Translation: faithful.

### B304 · rent · warehouse
| Field | Site value | Source quote | Verdict |
|---|---|---|---|
| deal / type | rent / warehouse | "Qira (rent)", "Depo/Showroom" | MATCH |
| city / neighbourhood / country | Prishtinë / Zona Industriale / XK | "në Zonën Industriale, Prishtinë" | MATCH |
| areaNet | 1360 | "sipërfaqe totale 1360m²" | MATCH |
| orientation | S | "Depoja ka orientim nga jugu" | MATCH |
| features: parking | ✓ | "hapësirë të mjaftueshme parkimi për 20 vetura" | MATCH |
| priceOnRequest | true | "Çmimi sipas marrëveshjes." | MATCH |
| aiVisualisation | false | — | MATCH |
| titleSq / titleEn | Depo dhe showroom me qira në Zonën Industriale, Prishtinë / Warehouse and showroom for rent in Zona Industriale, Prishtina | "hapësirë moderne për depo, showroom dhe administratë" | MATCH |

MISSED: none. Translation: faithful ("ferbeton" → "reinforced concrete" is correct).

### B305 · sale · penthouse
| Field | Site value | Source quote | Verdict |
|---|---|---|---|
| deal / type | sale / penthouse | "Shitje (sale)", "Penthouse" | MATCH |
| city / country | Fushë Kosovë / XK | "penthouse në Fushë Kosovë" | MATCH |
| street | Rruga Eqrem Qabej | "ndodhet në Rrugën “Eqrem Qabej”" | MATCH (caption spelling; B374 writes "Eqrem Çabej") |
| landmark | pranë Restaurant Nuari | "pranë Restaurant Nuari" | MATCH |
| areaNet | 96.67 | "sipërfaqe banimi 96.67m²" | MATCH |
| areaTerrace | 212.45 | "tarracë private 212.45m²" | MATCH |
| bedrooms / bathrooms | 3 / 2 | "tri dhoma gjumi, dy banjo" | MATCH |
| livingWithKitchen | true | "qëndrim ditor me kuzhinë" | MATCH |
| features: garage | ✓ | "Garazhi është i përfshirë në pronë." | MATCH |
| features: unfurnished | ✓ | "ofrohet pa mobilim" | MATCH |
| features: terrace | ✓ | "tarracë private" | MATCH |
| legal.notaryContract | true | "kontratë te noteri" | MATCH |
| price | 160000 | "Çmimi: 160,000 €" | MATCH |
| priceOnRequest | false | price stated | MATCH |
| extras.financing | BKT | "mundësi financimi përmes Bankës BKT" | MATCH |
| aiVisualisation | false | — | MATCH |
| titleSq / titleEn | Penthouse në shitje në Fushë Kosovë / Penthouse for sale in Fushë Kosovë | title | MATCH |

MISSED: floor (not stated). Translation: faithful.

### B307 · sale · apartment (multiple units, Ulcinj)
| Field | Site value | Source quote | Verdict |
|---|---|---|---|
| deal / type | sale / apartment | "Shitje (sale)", "Banese (apartment)" | MATCH |
| multipleUnits | true | "Ofrohet për shitje banesa", "Banesat kanë sipërfaqe nga 47m² deri në 75m²" | MATCH |
| city / country | Ulqin / ME | "banesa në Ulqin" | MATCH |
| street (override) | Boulevard Teuta | "përgjatë Boulevard Teuta" | MATCH |
| developer | ACE Group | "në kompleksin e ndërtuar nga ACE Group" | MATCH |
| features: terrace | ✓ | "tarraca të hapura" | MATCH |
| pricePerM2 | 2100 | "Çmimi: 2,100 €/m²." | MATCH |
| priceOnRequest | false | — | MATCH |
| **aiVisualisation** | **true** | no AI disclaimer anywhere; set only because 01/06/07.jpg are annotated `kind: render` (architectural renders) | **OVERREACH** |
| titleSq / titleEn | Banesa në shitje në Ulqin / Apartments for sale in Ulcinj | title | MATCH (the country is shown in the spec row) |

MISSED: none. areaNet and bedrooms are ranges, so null is correct. Translation: faithful, including the "potencial kthimi të garantuar" claim flagged in the annotator's notes.

### B313 · rent · apartment (3.5 bedrooms)
| Field | Site value | Source quote | Verdict |
|---|---|---|---|
| deal / type | rent / apartment | "Qira (rent)" | MATCH |
| city / neighbourhood / country | Prishtinë / Lakrishte / XK | "në Lakrishte, … Prishtinë" | MATCH |
| complex | BeniDona | "në objektin “BeniDona”" | MATCH |
| floor | 10 | "në katin e 10-të" | MATCH |
| bedrooms | 3.5 | "3.5 dhoma gjumi" | MATCH |
| livingWithKitchen | true | "sallon të gjerë me kuzhinë të integruar" | MATCH |
| balcony | true | "ballkon me pamje të hapur" | MATCH |
| features: electric-heating | ✓ | "ngrohje me rrymë/radiator" | MATCH |
| features: air-conditioning | ✓ | "dhe klimë" | MATCH |
| features: elevator | ✓ | "dy ashensorë" | MATCH |
| priceOnRequest | true | "Çmimi sipas marrëveshjes." | MATCH |
| **aiVisualisation** | **true** | no disclaimer; 01.jpg annotated "architectural visualisation" | **OVERREACH** |
| titleSq / titleEn | Banesë me qira në Lakrishte, Prishtinë / Apartment for rent in Lakrishte, Prishtina | title | MATCH |

MISSED: bathrooms and wc ("banjo dhe WC"). Acceptable: there are no numerals, and "banjo" is the same word in singular and plural. Translation: faithful ("qipave" → "key fobs").

### B320 · sale · house (plot)
| Field | Site value | Source quote | Verdict |
|---|---|---|---|
| deal / type | sale / house | "Shtepi (house)" | MATCH |
| city / country | Fushë Kosovë / XK | "në qendër të Fushë Kosovës" | MATCH |
| street (override) | Rruga Shefki Kuleta | "rrugët Shefki Kuleta dhe Xhemajl Mustafa" + image 01 label | MATCH (corner plot; the cover graphic names Shefki Kuleta) |
| landmark | afër Albi Market | "afër Albi Market" | MATCH |
| plotAres | 5 | "truall prej 5 ari" | MATCH |
| features: garage | ✓ | "garazh 200 m²" | MATCH |
| features: yard | ✓ | "oborr të sistemuar" | MATCH |
| legal.ownershipCertificate | true | "dokumentacion të rregullt me fletë poseduse" | MATCH |
| priceOnRequest | true | "Çmimi sipas marrëveshjes." | MATCH |
| aiVisualisation | false | — | MATCH |
| titleSq / titleEn | Shtëpi në shitje në Fushë Kosovë / House for sale in Fushë Kosovë | title | MATCH |

MISSED: totalFloors ("dy kate + kat përdhes", which could be 2 or 3) and areaNet (areas are given per use). Leaving both null is acceptable. Translation: faithful.

### B327 · sale · apartment
| Field | Site value | Source quote | Verdict |
|---|---|---|---|
| deal / type | sale / apartment | — | MATCH |
| city / country | Fushë Kosovë / XK | "me lokacion në Fushë Kosovë" | MATCH |
| street | Rruga Hajrullah Zymi | "Rruga Hajrullah Zymi" | MATCH |
| complex | Aron Bau Residence | "në Aron Bau Residence" | MATCH |
| landmark | afër Euro Store | "afër Euro Store" | MATCH |
| developer | Aron Bau | "ndërtim nga Aron Bau" | MATCH |
| areaNet | 64.2 | "sipërfaqe 64.2 m²" | MATCH |
| floor | 7 | "në katin e 7-të" | MATCH |
| bedrooms / bathrooms | 1 / 1 | "një dhomë gjumi, një banjo" | MATCH |
| livingWithKitchen | true | "sallon me kuzhinë" | MATCH |
| balcony | true | "një ballkon" | MATCH |
| features: electric-heating / air-conditioning / elevator / parking | ✓ ✓ ✓ ✓ | "me energji elektrike", "kondicioner", "ashensor", "vendparkim" | MATCH ×4 |
| legal.ownershipCertificate / notaryContract | true / true | "fletë poseduese … realizohet te noteri" | MATCH ×2 |
| priceOnRequest | true | "Çmimi sipas marrëveshjes." | MATCH |
| aiVisualisation | false | — | MATCH |
| titleSq / titleEn | Banesë në shitje në Fushë Kosovë / Apartment for sale in Fushë Kosovë | — | MATCH |

MISSED: none. Translation: faithful.

### B330 · sale · land with business
| Field | Site value | Source quote | Verdict |
|---|---|---|---|
| deal / type | sale / land | "Truall (land)" | MATCH |
| city / neighbourhood / country | Obiliq / Milloshevë / XK | "në Milloshevë, Obiliq" | MATCH |
| plotAres | 42 | "parcelë prej 42 ari" | MATCH |
| features: green-areas | ✓ | "e rrethuar me gjelbërim" | MATCH (note: the parcel is surrounded by greenery, not a complex park) |
| priceOnRequest | true | "Çmimi sipas marrëveshjes." | MATCH |
| aiVisualisation | false | — | MATCH |
| titleSq / titleEn | Tokë në shitje në Milloshevë, Obiliq / Land for sale in Milloshevë, Obiliq | "truall me biznes" | MATCH (note: the title drops "me biznes") |

MISSED: legal fields. Acceptable: the caption says only "Pronësia është private me dokumentacion të rregullt", with no certificate named. Bedrooms (5 bungalows × 2) and areas (370 + 260 m²) are correctly not summed. Translation: faithful.

### B337 · sale · duplex (new build)
| Field | Site value | Source quote | Verdict |
|---|---|---|---|
| deal / type | sale / duplex | "Duplex" | MATCH |
| city / neighbourhood / country | Prishtinë / Mati 1 / XK | "lagjen Kodrina, Mati 1, Prishtine" | MATCH |
| complex | Izzy | "Kompleksi Izzy" | MATCH |
| developer (override) | Izzy SH.P.K. | "ndertues Izzy SH.P.K." | MATCH |
| **isNewBuild** | **true** (shown as "New build: Yes") | nothing about construction or completion; derived from "Kontrata behet tek noteri direkt me kompanine ndertuese" | **OVERREACH** |
| areaNet | 112.86 | "siperfaqe 112.86 m²" | MATCH |
| floor / floorTo | 1 / 2 | "Ndodhet ne katin e 1 & 2." | MATCH |
| orientation | SE | "orientim Jug-Lindje" | MATCH |
| bedrooms / bathrooms | 2 / 3 | "dy dhoma gjumi, 3 banjo" | MATCH |
| storage / balcony | true / true | "depo dhe nje ballkon" | MATCH |
| features: electric-heating | ✓ | "ngrohjes eshte me rryme elektrike" | MATCH |
| features: garage | ✓ | "ne cmim perfshihet edhe nje garazhe private" | MATCH |
| legal.notaryContract / contractWithDeveloper | true / true | "tek noteri direkt me kompanine ndertuese" | MATCH ×2 |
| pricePerM2 | 1500 | "Cmimi: 1500 €/m²" | MATCH |
| priceOnRequest | false | — | MATCH |
| **aiVisualisation** | **true** | no disclaimer; renders only | **OVERREACH** |
| titleSq / titleEn | Duplex në shitje në Mati 1, Prishtinë / Duplex for sale in Mati 1, Prishtina | title | MATCH |

MISSED: sub-area "Kodrina" (no field for it; acceptable). livingWithKitchen ("qendrim ditor, kuzhine" is listed without "me", so it is ambiguous; null is correct). Translation: faithful.

### B345 · rent · commercial building
| Field | Site value | Source quote | Verdict |
|---|---|---|---|
| deal / type | rent / building | "Objekt afarist" | MATCH |
| city / neighbourhood / country | Prishtinë / Aktash / XK | "ne Aktash, Prishtine" | MATCH |
| areaNet | 3034 | "siperfaqe 3034 m²" | MATCH |
| features: basement | ✓ | "Bodrum + Suterine + Perdhes + 5 kate" | MATCH |
| priceOnRequest | true | "Qiraja: sipas marreveshjes." | MATCH |
| aiVisualisation | false | — | MATCH |
| titleSq / titleEn | Objekt afarist me qira në Aktash, Prishtinë / Commercial building for rent in Aktash, Prishtina | title | MATCH |

MISSED: totalFloors. Acceptable: the count depends on whether basement levels are counted. Translation: faithful.

### B346 · sale · apartment
| Field | Site value | Source quote | Verdict |
|---|---|---|---|
| deal / type | sale / apartment | — | MATCH |
| city / country | Fushë Kosovë / XK | "Rrugen Hajrullah Zymi, Fushe Kosove" | MATCH |
| street | Rruga Hajrullah Zymi | same | MATCH (note: cover 01.jpg says "RRUGA DARDANIA"; conflict within the agency's own post) |
| developer | Aron Bau Residence | "Ndertim nga Aron Bau Residence." | MATCH (literal; B327 names "Aron Bau" as builder) |
| areaNet | 64.2 | "siperfaqe 64.2 m²" | MATCH |
| floor | 7 | "Ndodhet ne katin e 7." | MATCH |
| orientation | W | "orientim nga Perendimi" | MATCH |
| bedrooms / bathrooms | 1 / 1 | "nje dhome gjumi, nje banjo" | MATCH |
| storage / balcony | true / true | "nje depo dhe nje ballkon" | MATCH |
| features: underfloor-heating / electric-heating | ✓ ✓ | "elektrik nen dysheme" | MATCH ×2 |
| legal.notaryContract | true | "Kontrata behet tek noteri." | MATCH |
| priceOnRequest | true | "Cmimi: sipas marreveshjes." | MATCH |
| aiVisualisation | false | — | MATCH |
| titleSq / titleEn | Banesë në shitje në Fushë Kosovë / Apartment for sale in Fushë Kosovë | — | MATCH |

MISSED: none. Translation: faithful.

### B349 · rent · office
| Field | Site value | Source quote | Verdict |
|---|---|---|---|
| deal / type | rent / office | "Zyre (office)" | MATCH |
| city / country | Prishtinë / XK | "Rrugen A, Prishtine" | MATCH |
| street | Rruga A | "ne Rrugen A" | MATCH |
| developer | ACG Construction | "ndertim nga ACG Construction" | MATCH |
| areaNet / areaTerrace | 340 / 120 | "340 m² + 120 m²", "tarrace me siperfaqe 120 m²" | MATCH ×2 |
| orientation | NE | "orientim Veri–Lindje" | MATCH |
| wc | 4 | "4 tualete" | MATCH |
| balcony | true | "2 ballkone" | MATCH |
| features: electric-heating / air-conditioning / elevator / parking / terrace | ✓×5 | "me energji elektrike", "4 kondicionere", "2 ashensore", "hapesire publike per vendparkim", "tarrace" | MATCH ×5 (parking is public) |
| priceOnRequest | true | "Cmimi me marrveshje" | MATCH |
| **aiVisualisation** | **true** | no disclaimer; 01.jpg is an architectural visualisation | **OVERREACH** |
| titleSq / titleEn (annotation) | Zyrë/penthouse me qira në Prishtinë / Office/penthouse for rent in Prishtina | "zyre/penthouse" | MATCH |

MISSED: livingWithKitchen=false ("kuzhine te ndare"). Acceptable: the parser only fills this for residential types. Translation: faithful ("ordinanca private" → "private medical practices").

### B353 · sale · commercial (tenanted, instalments)
| Field | Site value | Source quote | Verdict |
|---|---|---|---|
| deal / type | sale / commercial | "Lokal (commercial)" | MATCH |
| city / country | Fushë Kosovë / XK | "Rrugen Dardania, Fushe Kosove" | MATCH |
| street | Rruga Dardania | same | MATCH |
| developer | Model Slovenia | "Ndertim nga Model Slovenia." | MATCH |
| areaNet | 177.37 | "siperfaqe 177.37 m²" | MATCH |
| floor | 0 | "ne katin perdhese" | MATCH |
| legal.ownershipCertificate / notaryContract | true / true | "flete poseduese dhe kontrata behet tek noteri" | MATCH ×2 |
| priceOnRequest | true | "Cmimi sipas marreveshjes." | MATCH |
| extras.installments | true | "mundesi pagese me keste" | MATCH |
| extras.tenanted | true | "ka qira aktive me kontrate afatgjate" | MATCH |
| aiVisualisation | false | — | MATCH |
| titleSq / titleEn | Lokal në shitje në Fushë Kosovë / Commercial unit for sale in Fushë Kosovë | — | MATCH |

MISSED: none. Translation: faithful.

### B355 · sale · commercial (tenant income)
| Field | Site value | Source quote | Verdict |
|---|---|---|---|
| deal / type | sale / commercial | — | MATCH |
| city / country / street | Fushë Kosovë / XK / Rruga Nene Tereza | "Rrugen Nene Tereza, Fushe Kosove" | MATCH |
| areaNet / areaApprox | 500 / true | "siperfaqe rreth 500 m²" | MATCH ×2 |
| floor | 0 | "ne katin perdhese" | MATCH |
| legal.ownershipCertificate / notaryContract | true / true | "flete poseduese … tek noteri" | MATCH ×2 |
| priceOnRequest | true | "Cmimi: sipas marreveshjes." | MATCH |
| extras.tenanted | true | "qira aktive me kontrate afatgjate" | MATCH |
| extras.rentalIncome | 3500 | "te ardhura mujore 3500 Euro" | MATCH |
| aiVisualisation | false | — | MATCH |
| titleSq / titleEn | Lokal në shitje në Fushë Kosovë / Commercial unit for sale in Fushë Kosovë | — | MATCH |

MISSED: none. Translation: faithful.

### B375 · sale · house (trade-in)
| Field | Site value | Source quote | Verdict |
|---|---|---|---|
| deal / type | sale / house | "Shtepi (house)" | MATCH |
| city / neighbourhood / country | Prishtinë / Taslixhe / XK | "në Taslixhe, Prishtinë" | MATCH |
| street | Rruga Sali Butka | "Rrugën Sali Butka" | MATCH |
| areaNet | 400 | "sipërfaqe prej 400m²" | MATCH |
| plotAres | 2 | "truall prej 2 ari" | MATCH |
| bedrooms / bathrooms | 5 / 2 | "Në total, … pesë dhoma gjumi, dy banjo" | MATCH (a stated total, not summed) |
| livingWithKitchen | false | "kuzhinë të ndarë" | MATCH |
| balcony | true | "pesë ballkone" | MATCH |
| features: basement / yard | ✓ ✓ | "podrum", "oborr" | MATCH ×2 |
| legal.ownershipCertificate | true | "posedon fletë poseduese" | MATCH |
| price / pricePerM2 | 270000 / 675 | "270,000€, apo 675€/m²" | MATCH ×2 |
| priceOnRequest | false | — | MATCH |
| extras.tradeIn | veturë ose banesë në Prishtinë | "kompensim me veturë ose banesë në Prishtinë" | MATCH |
| aiVisualisation | false | — | MATCH |
| titleSq / titleEn | Shtëpi në shitje në Taslixhe, Prishtinë / House for sale in Taslixhe, Prishtina | title | MATCH |

MISSED: totalFloors ("katër kate banimi, si dhe podrumi"). Acceptable. Translation: faithful.

### B378 · sale · apartment (city from company profile)
| Field | Site value | Source quote | Verdict |
|---|---|---|---|
| deal / type | sale / apartment | — | MATCH |
| **city** | **Fushë Kosovë** | not in the caption and not on any image; taken from the parser's company-profile street list (`PROFILE_STREET_CITY`) | **OVERREACH** (corroborated by other agency captions: B328, B347, B348, B376 place Rruga Hysen Xhakolli in Fushë Kosovë) |
| **country** | **XK** | follows from the city above | **OVERREACH** (same cause) |
| street | Rruga Hysen Xhakolli | "në Rrugën Hysen Xhakolli" | MATCH |
| complex | Apolonia A19 | "kompleksin Apolonia A19" | MATCH |
| landmark | pranë Kafe Plus Minus | "pranë Kafe Plus Minus" | MATCH |
| developer | Tregtia | "ndërtim nga “Tregtia”" | MATCH |
| areaNet | 76 | "76m² neto" | MATCH |
| floor | 2 | "në katin e 2-të" | MATCH |
| bedrooms / bathrooms / wc | 1 / 1 / 1 | "rikonceptuar në 1+1", "një dhomë gjumi kryesore", "një banjo, një WC" | MATCH ×3 |
| livingWithKitchen / balcony | true / true | "qëndrimi ditor me kuzhinë", "ballkon" | MATCH ×2 |
| features: furnished | ✓ | "komplet e mobiluar" | MATCH |
| legal.notaryContract | true | "bartjes së pronës realizohet te noteri" | MATCH |
| price | 91200 | "Çmimi i pronës është 91,200€." | MATCH |
| priceOnRequest / aiVisualisation | false / false | — | MATCH ×2 |
| titleSq / titleEn | Banesë në shitje në Fushë Kosovë / Apartment for sale in Fushë Kosovë | the city in the title depends on the profile inference | MATCH (depends on the city decision) |

MISSED: none. Translation: faithful.

### B382 · sale · land (Albania)
| Field | Site value | Source quote | Verdict |
|---|---|---|---|
| deal / type | sale / land | "Toke (land)" | MATCH |
| city / country | Tale / AL | "Tokë në shitje në Tale, Shqipëri" | MATCH |
| plotAres | 40 | "40 ari tokë" | MATCH |
| price / pricePerAre | 140000 / 3500 | "3,500€ për ari", "Çmimi total për 40 ari: 140,000€" | MATCH ×2 |
| priceOnRequest / aiVisualisation | false / false | — | MATCH ×2 |
| titleSq / titleEn | Tokë në shitje në Tale / Land for sale in Tale | "… Tale, Shqipëri" | MATCH (note: the title drops the country, but the spec row shows Albania) |

MISSED: none. Translation: faithful.

### B384 · sale · land (AI disclaimer)
| Field | Site value | Source quote | Verdict |
|---|---|---|---|
| deal / type | sale / land | — | MATCH |
| city / neighbourhood / country | Lipjan / Poturoc / XK | "Poturoc, Lipjan" | MATCH |
| plotAres | 118 | "sipërfaqe prej 118 ari" | MATCH |
| legal.ownershipCertificate | true | "posedon fletë poseduese" | MATCH |
| price / pricePerAre | 236000 / 2000 | "2,000€/ari", "Çmimi total: 236,000€" | MATCH ×2 |
| priceOnRequest | false | — | MATCH |
| aiVisualisation + aiDisclaimerSq/En | true + disclaimer | "Shënim: Ky imazh është gjeneruar me inteligjencë artificiale (AI)…" | MATCH |
| titleSq / titleEn | Tokë në shitje në Poturoc, Lipjan / Land for sale in Poturoc, Lipjan | title | MATCH |

MISSED: none. The duplicated caption was correctly de-duplicated. Translation: faithful, and the disclaimer translation is complete.

### B388 · sale · apartment (legalisation / lawyer)
| Field | Site value | Source quote | Verdict |
|---|---|---|---|
| deal / type | sale / apartment | — | MATCH |
| city / neighbourhood / country | Prishtinë / Aktash / XK | "në Aktash, Prishtinë" | MATCH |
| street | Rruga Abdyl Frashëri | "Rrugën Abdyl Frashëri" | MATCH |
| areaNet | 72 | "sipërfaqe prej 72m²" | MATCH |
| floor | 10 | "në katin e 10-të" | MATCH |
| bedrooms / bathrooms | 1 / 1 | "1+1", "një dhomë gjumi, një banjo" | MATCH ×2 |
| livingWithKitchen | true | "qëndrimi ditor me kuzhinë" | MATCH |
| features: elevator / garage / terrace | ✓ ✓ ✓ | "objekt me ashensor", "garazh privat", "tarracë" | MATCH ×3 |
| legal.inLegalisation | true | "në proces të legalizimit" | MATCH |
| legal.contractViaLawyer | true | "realizohet përmes avokatit" | MATCH |
| price | 125000 | "125,000€" | MATCH |
| priceOnRequest / aiVisualisation | false / false | — | MATCH ×2 |
| titleSq / titleEn | Banesë në shitje në Aktash, Prishtinë / Apartment for sale in Aktash, Prishtina | title | MATCH |

MISSED: none. The legal fields correctly do not claim an ownership certificate or a notary contract. Translation: faithful.

### B391 · sale · apartment (city from image)
| Field | Site value | Source quote | Verdict |
|---|---|---|---|
| deal / type | sale / apartment | — | MATCH |
| city (override) / country (override) | Fushë Kosovë / XK | image:01.jpg label "Rruga Abedin Sogojeva, Fushë Kosovë" (verified by opening the image) | MATCH |
| street | Rruga Abedin Sogojeva | "Rrugën Abedin Sogojeva" | MATCH |
| areaNet | 109 | "sipërfaqe prej 109m²" | MATCH |
| floor | 8 | "në katin e 8-të" | MATCH |
| bedrooms / bathrooms | 2 / 1 | "dy dhoma gjumi, një banjo" | MATCH ×2 |
| livingWithKitchen | true | "qëndrimi ditor me kuzhinë" | MATCH |
| features: terrace | ✓ | "dy tarraca" | MATCH |
| legal.ownershipCertificate | true | "Prona posedon fletë poseduese." | MATCH |
| price / pricePerM2 | 76300 / 700 | "700€/m²", "Çmimi total: 76,300€" | MATCH ×2 |
| priceOnRequest / aiVisualisation | false / false | — | MATCH ×2 |
| titleSq / titleEn | Banesë në shitje në Fushë Kosovë / Apartment for sale in Fushë Kosovë | caption title names the street, image names the city | MATCH |

MISSED: none. Publication issue: the last `descriptionSq` / `descriptionEn` paragraph ends in a colon ("…na kontaktoni në WhatsApp ose Viber:") because the phone line was stripped.

### B394 · rent · apartment (rent terms)
| Field | Site value | Source quote | Verdict |
|---|---|---|---|
| deal / type | rent / apartment | — | MATCH |
| city / neighbourhood / country | Prishtinë / Aktash / XK | "Banesë me qira në Aktash, Prishtinë" | MATCH |
| street | Rruga Abdyl Frashëri | "Rrugën Abdyl Frashëri" | MATCH |
| areaNet | 60 | "sipërfaqe prej 60m²" | MATCH |
| floor | 2 | "në katin e 2-të" | MATCH |
| features: elevator | ✓ | "përfshirë liftin" | MATCH |
| features: furnished (override) | ✓ | extra caption: "e mobiluar dhe komplet e gatshme për banim" | MATCH |
| rentMonthly | 500 | "Qiraja mujore: 500€" | MATCH |
| deposit | 500 | "Depozita: 500€" | MATCH |
| **minContractMonths** | **12, shown as "Minimum contract: 12 months" / "Kontrata minimale"** | "Kontrata: 1-vjeçare" / "Kontrata: 1 vit" (a one-year contract; "minimum" is never stated) | **OVERREACH** (the qualifier is not in the source) |
| priceOnRequest / aiVisualisation | false / false | — | MATCH ×2 |
| titleSq / titleEn | Banesë me qira në Aktash, Prishtinë / Apartment for rent in Aktash, Prishtina | title | MATCH |

MISSED: none (room counts are not stated). Translation: faithful.

### B396 · rent · house
| Field | Site value | Source quote | Verdict |
|---|---|---|---|
| deal / type | rent / house | "Shtepi (house)" | MATCH |
| city / neighbourhood / country | Prishtinë / Lagjja Ndërkombëtare / XK | "Lagjen Ndërkombëtare, Prishtinë" | MATCH |
| street | Rruga Nekibe Kelmendi | "Rrugën Nekibe Kelmendi" | MATCH |
| bedrooms | 3 | "tri dhoma gjumi" | MATCH |
| livingWithKitchen | false | "Kuzhina është e ndarë" | MATCH |
| balcony | true | "dy ballkone" | MATCH |
| features: heat-pump | ✓ | "pompës termike nga brendi Vaillant" | MATCH |
| features: garage / parking | ✓ ✓ | "posedon garazh, parking shtesë para garazhit" | MATCH ×2 |
| features: security-24-7 / gated-community | ✓ ✓ | "lagje private me kontroll të hyrjes përmes rampës dhe sigurim 24/7" | MATCH ×2 |
| features: basement / yard | ✓ ✓ | "një podrum", "oborrin e pasmë" | MATCH ×2 |
| rentMonthly / deposit | 2300 / 2300 | "Qiraja mujore: 2,300€", "Depozita: 2,300€" | MATCH ×2 |
| minContractMonths | 12 | "Kontrata minimale: 1 vit" | MATCH |
| priceOnRequest / aiVisualisation | false / false | — | MATCH ×2 |
| titleSq / titleEn | Shtëpi me qira në Lagjen Ndërkombëtare, Prishtinë / House for rent in Lagjja Ndërkombëtare, Prishtina | title | MATCH |

MISSED: bathrooms. The caption says "banjo private, si dhe dy banjo të tjera", which means 3, but that is 1 + 2 arithmetic; null is acceptable under the no-summing rule. Annotation housekeeping: `data/listings/B396.json` notes contradict themselves ("set to 3 …" and later "Bathrooms left null"); the published value is null.

### B397 · sale · apartment (price from image)
| Field | Site value | Source quote | Verdict |
|---|---|---|---|
| deal / type | sale / apartment | — | MATCH |
| city / country | Fushë Kosovë / XK | "Kompleksin Eliza C në Fushë Kosovë" | MATCH |
| complex | Eliza C | same | MATCH |
| developer | Cima Construction | "ndërtim nga Cima Construction" | MATCH |
| isNewBuild | true | "Kompleksi aktualisht është në fazën e përfundimit" | MATCH |
| completion / completionEn | gjatë vitit 2026 / during 2026 | "dorëzimi i banesës pritet gjatë vitit 2026" | MATCH |
| areaNet | 133.03 | "sipërfaqe prej 133.03m²" | MATCH |
| floor | 8 | "në katin e 8-të" | MATCH |
| bedrooms / bathrooms | 3 / 2 | "tri dhoma gjumi, dy banjo" | MATCH ×2 |
| livingWithKitchen / storage / balcony | true / true / true | "qëndrimi ditor me kuzhinë", "një depo dhe një ballkon" | MATCH ×3 |
| features: elevator / parking / green-areas | ✓ ✓ ✓ | "dy ashensorë", "parking të bollshëm", "hapësira të gjelbëruara" | MATCH ×3 |
| pricePerM2 (override) | 870 | image:01.jpg "870€/m²" (verified by opening the image) | MATCH |
| priceOnRequest | false | follows from the image price | MATCH |
| **aiVisualisation** | **true** | no disclaimer; 01/02.jpg are 3D architectural visualisations | **OVERREACH** |
| titleSq / titleEn | Banesë në shitje në Fushë Kosovë / Apartment for sale in Fushë Kosovë | "…Kompleksin Eliza C, Fushë Kosovë" | MATCH |

MISSED: none. Translation: faithful. The parenthetical "(Kompleksi Eliza C)" in EN0 is a harmless gloss, not a fact.

---

## Summary of MISMATCH / OVERREACH items and recommended fixes

No MISMATCH was found. There are 9 OVERREACH fields in the sample, grouped into 4 fixes, plus 1 incidental item outside the sample.

| # | Listing(s) | Field | Site value | Problem | Recommended fix |
|---|---|---|---|---|---|
| 1 | B337 | `isNewBuild` | true ("New build: Yes", also counted by the new-build filter) | The caption only says the contract is signed "direkt me kompanine ndertuese"; it says nothing about construction stage or completion. | Annotation: in `data/listings/B337.json` add override `"isNewBuild": { "value": null, "evidence": ["Kontrata behet tek noteri direkt me kompanine ndertuese"], "note": "developer sale only; construction stage not stated" }`. Parser: in `scripts/lib/parse-listing.ts` line 245, stop deriving `isNewBuild` from `contractWithDeveloper` alone (keep `completion` and `ne faze ndertimi` / `fazen e perfundimit`). B335 and B339 keep `true` through their stated completion. |
| 2 | B307, B313, B337, B349, B397 (also, outside the sample, B321, B322, B334, B335, B339, B387) | `aiVisualisation` | true | No AI disclaimer in the caption or on any image. The flag is set only because an image is annotated `kind: "render"` (ordinary architectural renders). There is no visible text today, because `ListingView` also requires disclaimer text, but the published JSON asserts AI generation. | `scripts/import-listings.ts` line 214: change to `aiVisualisation: Boolean(aiSq)`. If a render flag is wanted, add a separate `hasRenders` field. |
| 3 | B378 | `city`, `country` | Fushë Kosovë, XK | Not stated in this caption or its images. Inferred from `PROFILE_STREET_CITY` (parse-listing.ts line 199). The fact itself is corroborated by B328, B347, B348 and B376. | No value change needed if the company-profile rule stays accepted. Record the corroboration in `data/listings/B378.json` `notes`, or confirm with the agency. If a strict caption-only policy is required, drop the `PROFILE_STREET_CITY` fallback; the title would then read "…në Rrugën Hysen Xhakolli". |
| 4 | B394 | `minContractMonths` | 12, labelled "Minimum contract" / "Kontrata minimale" | The source says "Kontrata: 1-vjeçare", a one-year term that is not called a minimum (only B396 says "minimale"). | Parser line 404: record whether `minimale` matched (e.g. `contractIsMinimum`). `ListingView.astro` line 66: use label "Contract term" / "Kontrata" when it is not minimum. The simpler alternative is to rename the label globally to "Contract term" / "Kontrata". |
| 5 (incidental, outside sample) | B322 | `legal.notaryContract` | true | Source: "Dokumentacioni është i rregullt me fletë poseduse tek noteri." That places the ownership certificate at the notary; it does not say the contract is signed there. Ambiguous, so null per the guide. The annotator already raised it in notes. | Override `legal.notaryContract` to null with that sentence as evidence, or have the parser ignore `tek noteri` when it directly follows `flete poseduse`. |

Other items (not field verdicts):
- **B346**: the caption street (Rruga Hajrullah Zymi) conflicts with the cover graphic (RRUGA DARDANIA). The site follows the caption; confirm with the agency (already in the annotator's notes).
- **B391**: the published last paragraph ends in a dangling colon because the phone number was stripped. Either drop that paragraph (a parser CONTACT_LINE rule for `^Për fotografi të brendshme`) or keep the number.
- **B396**: the contradictory annotation note on bathrooms should be cleaned up. The published data is correct (null).
- **Titles (optional)**: B330's generated title drops "me biznes". A `titleSq` / `titleEn` override ("Truall me biznes në shitje në Milloshevë, Obiliq" / "Plot with business for sale in Milloshevë, Obiliq") would be more faithful. B382 and B307 titles omit the country, which the spec row already shows.
- **Import report completeness**: the `fields` list in `scripts/import-listings.ts` line 246 omits `floorTo`, `totalFloors`, `areaApprox`, `country`, `extras.installments` and `extras.garageOptional`. As a result `docs/listing-import-report.md` does not show B337 `floorTo=2`, B352 `totalFloors=2`, B353 `installments=true` or B355 `areaApprox=true`, even though they are published. Add them to the list.

## Translation issues

| Listing | Paragraph | Albanian | English | Issue | Fix |
|---|---|---|---|---|---|
| B396 | EN1 | "dhomë gjumi kryesore (Master Bedroom) me garderobë të veçantë dhe banjo private" | "…with a separate walk-in wardrobe and a private bathroom" | "walk-in" is added; the caption only says a separate wardrobe or dressing room. (B378 legitimately says "Walk-in Closet"; B396 does not.) | "…with a separate wardrobe and a private bathroom" |
| B391 | EN2 / SQ2 | "Për fotografi të brendshme të banesës, na kontaktoni në WhatsApp ose Viber:" | "…contact us on WhatsApp or Viber:" | Not a translation error. Both languages publish a sentence ending in a colon with nothing after it. | See "Other items" |

All other sampled translations (23 listings, all `descriptionEn` paragraphs, and extra captions for B307, B313 and B394) keep the same facts, order and line structure, with no omissions or marketing additions. Borderline but correct renderings: "qipave" → key fobs; "ferbeton" → reinforced concrete; "ordinanca private" → private medical practices; "rampës" → barrier; "magjistralen" → highway.

## Duplicate findings

Checked by reading captions, comparing contact sheets and hashing every source image (MD5 across all 76 folders).

| Pair | Flagged reason | Finding | Verdict |
|---|---|---|---|
| B347 / B348 | same street, identical description | The captions are character-identical apart from the ID. The photos are different: the kitchens are mirror layouts (tall units right vs left, different oven position), and the balcony views differ (a construction site vs a yellow façade). No image is byte-identical. | **Identical text confirmed, not a repost**: two mirror units in the same Arditi Group building. Keep both. |
| B327 / B346 | same size 64.2 m² | Both are 64.2 m², floor 7, 1 bedroom, 1 bathroom, on Hajrullah Zymi, Aron Bau. But the interiors are completely different (B327: occupied, orange sofa, older kitchen; B346: new beige furnishings, lit kitchen). B327 lists AC and no storage; B346 lists storage, west orientation and underfloor heating, and its cover says Rruga Dardania. | **Not a repost**: same unit type, different apartments. B346 street conflict remains open. |
| B323 / B324 / B326 (and each with B327) | same street, 0–1 days apart | Different unit types: 86.65 m² on floors 1/3/6/7 facing NW; 84.85 m² on floors 3/4/5 facing NE with 2 terraces; 63.37 m² on floor 3 facing NW. They share the byte-identical cover `01.jpg` and template text (Qami Construction project). B327 is a different building (Aron Bau). | **Not reposts**: distinct units in one project. |
| B317 / B378 | same size 76 m² | B317: Rruga Dardania, floor 1, 2 bedrooms. B378: Hysen Xhakolli, Apolonia A19, floor 2, 1+1. | **Not a repost** |
| B322 / B374 | same size 60 m² | B322: Naim Syla, Bresje, Alfest Holding, floor 5, terrace. B374: Eqrem Çabej, Hira Residence, ACE Group, separate kitchen, basement storage, €55,000. | **Not a repost** |
| B333 / B347, B333 / B348 | same street | Apollonia A20 / Tregtia vs Arditi Group; different buildings. | **Not reposts** |
| **B328 / B333 (NOT flagged)** | — | 9 byte-identical photos (B328 `02–10.jpg` = B333 `02–10.jpg`). Same complex (Apollonia A20) and builder (Tregtia). Same layout: "sallon, kuzhinë, dy dhoma gjumi, banjo + WC dhe ballkon të mbyllur me xhama palosës", dedicated parking, secured corridor. B328 is a **sale** (2025-12-13); B333 is a **rent** (2026-01-06). | **Likely the same apartment**, offered for sale and then for rent. Confirm with the agency which offer is current. The detector missed it because it only compares listings with the same deal (`import-listings.ts` line 255). |
| B334 / B335 (not flagged) | — | 3 byte-identical images (B334 `02/03/04` = B335 `04/02/03`, Tehno Home renders). The streets (Pajazit Islami vs Zahir Pajaziti), sizes (92.85 vs 94.35 m²) and floors (6 vs 4) differ. | **Not a repost**: shared project visuals. |

Detector recommendation: add an image-hash comparison, and allow cross-deal matches when images coincide; this would have caught B328/B333. Drop "same street within 14 days" as a standalone reason, since it produced 8 of the 12 flags and all were false positives.

## Counts

| Check | Result |
|---|---|
| Listing folders in `../instagram/listings/` | 76 |
| `listings/` rows in `../instagram/index.csv` | 76 |
| Content files in `src/content/listings/` | 76 (refs match folder refs 1:1; 76 unique refs) |
| Annotation files in `data/listings/` | 76 |
| Image asset folders in `src/assets/listings/` | 76 |
| Deals (content) | 55 sale · 21 rent (matches the import report) |

## Final verdict

**PASS WITH FIXES.** 404 fields checked across 23 listings: 395 MATCH, 0 MISMATCH, 9 OVERREACH (4 fixes: B337 `isNewBuild`, `aiVisualisation` set from renders, B378 profile-derived city/country, B394 "minimum" contract label). No price, area, room count, legal status or location conflicts with a caption. The main unflagged data risk is B328/B333, which look like the same apartment offered for sale and for rent.
