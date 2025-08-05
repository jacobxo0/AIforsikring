# Datakilder for AI Forsikringsguiden

## Offentlige Juridiske Kilder

### Retsinformation.dk
**Beskrivelse:** Danmarks officielle retskildesamling
**Indhold:** Love, bekendtgørelser, cirkulærer, vejledninger, domme
**Tilgængelighed:** 
- API: Ja (offentligt tilgængeligt)
- Format: XML/JSON
- Opdateringsfrekvens: Løbende
- Licens: Offentlig domain

### Ankenævnet for Forsikring
**Beskrivelse:** Afgørelser i forsikringssager
**Indhold:** Anonymiserede afgørelser, praksis, vejledninger
**Tilgængelighed:**
- API: Nej
- Scraping: Muligt (robots.txt tillader)
- Format: HTML/PDF
- Opdateringsfrekvens: Månedligt

## Forsikringsdata

### Standardpolicer
**Beskrivelse:** Eksemplar af standardforsikringspolicer
**Indhold:** Vilkår, betingelser, klausuler fra større selskaber
**Tilgængelighed:**
- Manuel upload: Ja
- Format: PDF
- Kilde: Offentligt tilgængelige standardvilkår

### Forsikring & Pension (brancheorganisation)
**Beskrivelse:** Statistik, vejledninger, standarder
**Indhold:** Markedsdata, forbrugervejledninger
**Tilgængelighed:**
- API: Nej
- Scraping: Begrænset
- Manuel indsamling: Ja

## Brugerdata

### Uploadede Dokumenter
**Beskrivelse:** Brugerens egne forsikringsdokumenter
**Indhold:** Policer, korrespondance, skadesmeldinger
**Tilgængelighed:**
- Upload: Ja (med samtykke)
- Format: PDF, billeder, tekst
- Lagring: Supabase med kryptering

### Chathistorik
**Beskrivelse:** Tidligere samtaler og spørgsmål
**Indhold:** Spørgsmål, svar, feedback
**Tilgængelighed:**
- Direkte adgang: Ja
- Format: JSON
- Retention: 2 år (GDPR-compliant)

## Implementeringsprioritet

1. **Høj prioritet:**
   - Retsinformation.dk API
   - Manuel upload af standardpolicer
   - Bruger dokumentupload

2. **Medium prioritet:**
   - Ankenævnet scraping
   - Forsikring & Pension data

3. **Lav prioritet:**
   - Realtidsintegration med forsikringsselskaber
   - Dynamiske prissystemer

## Databehandling og Compliance

### GDPR Krav
- Explicit consent til datalagring
- Right to deletion
- Data portability
- Audit logging

### Teknisk Implementation
- End-to-end kryptering af sensitive dokumenter
- Anonymisering af data til ML-training
- Secure API endpoints med rate limiting 