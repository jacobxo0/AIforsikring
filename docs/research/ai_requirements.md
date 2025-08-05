# AI Krav og Roller for Forsikringsguiden

## AI-Roller Definition

### 1. Forsikringsrådgiver (Primary Agent)
**Formål:** Primær brugerinteraktion og generel forsikringsvejledning

**Kernekompetencer:**
- Forklare forsikringskoncepter på simpelt dansk
- Analysere brugerens specifikke situation
- Anbefale passende forsikringsprodukter
- Sammenligne policer og vilkår

**Tekniske krav:**
- GPT-4 med custom system prompt
- Adgang til standardpolicer database
- Context window: 32k tokens
- Temperature: 0.3 (konsistent, faktuel)

**Input/Output:**
- Input: Naturligt sprog, brugerdata, uploadede dokumenter
- Output: Strukturerede anbefalinger, forklaringer, handlingsplaner

### 2. Paragraf-Navigator (Legal Agent)
**Formål:** Præcis juridisk fortolkning og lovgivningsnavigation

**Kernekompetencer:**
- Parse komplekse policetekster
- Identificere relevante lovparagraffer
- Sammenligne med retspraksis
- Fremhæve vigtige klausuler og undtagelser

**Tekniske krav:**
- Finetuned model på dansk forsikringsret
- Vector embeddings af Retsinformation.dk
- Semantic search i juridiske tekster
- Højere præcision end generel model

**Input/Output:**
- Input: Juridiske spørgsmål, policetekster, sagsbeskrivelser
- Output: Citater med paragrafhenvisninger, fortolkninger, risikovurderinger

### 3. Dokumenttolker (Document Analyzer)
**Formål:** Automatisk analyse og kategorisering af uploadede dokumenter

**Kernekompetencer:**
- OCR og tekstekstraktion fra PDF/billeder
- Identificere dokumenttype (police, skadeanmeldelse, korrespondance)
- Udtrække nøgledata (dækningssum, selvrisiko, datoer)
- Sammenfatte lange dokumenter

**Tekniske krav:**
- PDF.js til frontendparsing
- Tesseract.js til OCR
- Custom NER model til forsikringsdata
- Document classification pipeline

**Input/Output:**
- Input: PDF, billeder, scannede dokumenter
- Output: Struktureret metadata, resumé, fremhævede nøglepunkter

## AI-Arkitektur

### Agent Coordination
```
Bruger Input → Primary Agent (Rådgiver)
                ↓
           Routing Logic
          ↓            ↓
Legal Agent    Document Analyzer
          ↓            ↓
      Response Synthesis
          ↓
    Formateret Svar til Bruger
```

### Context Management
- **Session Context:** Bevarer samtalehistorik og brugerens situation
- **Document Context:** Loader relevante uploadede dokumenter
- **Legal Context:** Injicerer relevante lovparagraffer og afgørelser

### Response Quality Assurance
- **Fact Checking:** Cross-reference med autoritative kilder
- **Compliance Check:** Sikrer GDPR og juridisk compliance
- **Clarity Scoring:** Vurderer svarets forståelighed

## Prompt Engineering

### System Prompts Structure
```
/**
 * Rolle: [Agent type]
 * Formål: [Specifik opgave]
 * Tone: Professionel, hjælpsom, forståelig
 * Kilder: Kun autoritative danske kilder
 * Output Format: [JSON/Markdown/Structured]
 * Begrænsninger: [Juridiske og etiske]
 */
```

### Dynamic Context Injection
- Brugerens uploadede dokumenter
- Relevant lovgivning fra retsinformation.dk
- Tidligere samtalehistorik
- Personalisering baseret på brugerens behov

## Kvalitetssikring

### Metrics og Monitoring
- **Response Accuracy:** Manuelt review af juridiske svar
- **User Satisfaction:** Feedback scoring efter hver interaction
- **Hallucination Detection:** Automated fact-checking mod kilder
- **Response Time:** Target < 3 sekunder for standard queries

### Continuous Learning
- Fine-tuning baseret på bruger feedback
- Regular update af juridisk knowledge base
- A/B testing af forskellige prompt variations
- Expert review af edge cases

## Sikkerhed og Begrænsninger

### Ethical Guidelines
- Aldrig give definitiv juridisk rådgivning
- Altid anbefal professionel hjælp ved komplekse sager
- Transparent om AI-begrænsninger
- Bevare brugerens autonomi i beslutninger

### Technical Safeguards
- Rate limiting på API calls
- Input sanitization mod prompt injection
- Output filtering for sensitive information
- Audit logging af alle AI-responses 