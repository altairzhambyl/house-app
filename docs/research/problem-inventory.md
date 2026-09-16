# Problem inventory — house-app

Working document for Assignment 1 (stakeholder expectations) and Assignment 2 (idea / feature list).
Created 2026-09-16.

> **Status: HYPOTHESES, not findings.** Everything below was produced by the team from intuition, not
> from user research. None of it is sourced yet. Before any of this goes into a submission as a claim
> about the market, see §6. Problem statements are safe to submit as *assumptions we set out to test*;
> they are not safe to submit as *facts about Kazakhstani residents*.

## 1. Stakeholders

| ID | Stakeholder | Note |
|---|---|---|
| S1 | Resident-owner (lives in the unit) | primary user |
| S2 | Owner-landlord (does not live there, rents it out) | pays fees, absent — named by the team in P1 |
| S3 | Tenant (lives there, owns nothing) | no standing in current processes |
| S4 | Management organisation (УК / ОСИ / КСК) | **the buyer** |
| S5 | Chair / building manager | decision-maker inside S4 |
| S6 | Technician (plumber, electrician, lift engineer) | executes requests |
| S7 | Concierge / security | front line, logs incidents |
| S8 | Developer (застройщик) | for new complexes; possible channel |
| S9 | Utility providers | source of planned-outage information |

## 2. The team's original six

Kept verbatim (Russian) alongside the English statement so nothing is lost in translation.

| ID | Original (RU) | Problem statement (EN) | Who hurts |
|---|---|---|---|
| P1 | нет централизованного метода общения (каждый ЖК — новый чат) | No single communication channel; every complex is another ad-hoc chat, which is unmanageable for owners who rent out units in several buildings | S1 S2 |
| P2 | надо проситься в ватсап — искать контакты ЖКХ | Joining requires finding a person and asking permission; management contacts are not discoverable | S1 S3 |
| P3 | ЖКХ не сразу реагирует, может не получить уведомление | Management responds late or never sees the message at all | S1 S4 |
| P4 | нет прозрачности в решении вопросов (лифт / чистота / площадка) | No visibility into whether an issue is being worked on | S1 S2 |
| P5 | ЖКХ получают дубликаты запросов, тратят силы и время | Management receives the same issue many times and burns effort triaging duplicates | S4 S6 |
| P6 | нет чётких уведомлений по плановым работам | Planned outages (power, gas, water) are announced badly or not at all — sometimes management itself is not informed | S1 S4 S9 |

## 3. Additional problems, by theme

### A. Communication (extends P1–P3)
| ID | Problem | Who |
|---|---|---|
| P7 | Important announcements drown in chat noise — no separation between official notices and neighbour chatter | S1 S4 |
| P8 | New residents have no onboarding path; they do not know the channel exists | S1 S3 |
| P9 | No history — a new resident cannot see what was already decided or discussed | S1 |
| P10 | No Kazakh/Russian language separation in a mixed-language building | S1 |

### B. Requests and transparency (extends P4–P5)
| ID | Problem | Who |
|---|---|---|
| P11 | Cannot attach photo/video to a request — the technician arrives without context | S1 S6 |
| P12 | No stated deadline or SLA; nobody knows when it will be fixed | S1 S4 |
| P13 | No completion confirmation — management marks it done, the resident disagrees, no evidence either way | S1 S4 |
| P14 | No per-asset history — a lift failing for the fifth time this month is invisible | S4 S5 |
| P15 | No way to rate the work performed | S1 S5 |
| P16 | Technicians receive work verbally or by phone and lose it | S6 |
| P17 | Responsibility boundary is unclear — inside-the-flat vs common property | S1 S4 |

### C. Planned works (extends P6)
| ID | Problem | Who |
|---|---|---|
| P18 | Management itself learns of an outage late, or not at all, from the provider | S4 S9 |
| P19 | No forward calendar of planned works residents can check | S1 |

### D. Emergencies (F5 exists, but no problem was written for it)
| ID | Problem | Who |
|---|---|---|
| P20 | No instant way to reach every resident at once during a gas leak, fire or flood | S1 S4 |
| P21 | A flood from upstairs cannot be stopped because the owner of that unit is unreachable | S1 S2 |
| P22 | Incidents are not recorded anywhere, so there is no record afterwards | S4 S7 |

### E. Money and financial transparency — **no feature covers this at all**
| ID | Problem | Who |
|---|---|---|
| P23 | Residents do not know what the tariff pays for or where the money went | S1 S2 |
| P24 | Budgets, estimates and annual reports are not accessible | S1 S5 |
| P25 | Meter readings are submitted by phone or on paper, with transcription errors | S1 S4 |
| P26 | Invoices are paper or scattered across channels | S1 S2 |
| P27 | Debtors are invisible; paying neighbours effectively subsidise them | S1 S4 |
| P28 | Payment is split across several unconnected places | S1 |

### F. Meetings and collective decisions — **no feature covers this at all**
| ID | Problem | Who |
|---|---|---|
| P29 | A general meeting cannot reach quorum because people will not physically attend | S4 S5 |
| P30 | Paper voting is disputable and the count is not transparent | S1 S5 |
| P31 | Minutes and decisions are not published anywhere residents can find | S1 |

### G. Access and physical infrastructure — **no feature covers this**
| ID | Problem | Who |
|---|---|---|
| P32 | Guest passes / barrier access handled by phone calls to a guard | S1 S7 |
| P33 | Parking-space conflicts have no arbitration record | S1 S5 |

### H. Neighbour-to-neighbour
| ID | Problem | Who |
|---|---|---|
| P34 | Night noise has no channel — the only option is a face-to-face confrontation | S1 |
| P35 | No neighbour directory, so you cannot reach the flat that is flooding yours | S1 |
| P36 | No place for lost-and-found, local classifieds, shared services | S1 |

### I. Management as a business — **no feature covers this**
| ID | Problem | Who |
|---|---|---|
| P37 | A company managing several complexes has no consolidated view | S4 S5 |
| P38 | No reporting to owners, so trust has nothing to rest on | S4 S5 |
| P39 | Staff turnover takes the institutional knowledge with it | S4 |
| P40 | No evidence trail when a resident dispute escalates | S4 |

### J. The landlord case (the team named this in P1 but built nothing for it)
| ID | Problem | Who |
|---|---|---|
| P41 | The owner pays the fees but sees nothing that happens in the building | S2 |
| P42 | Changing tenant means re-doing access by hand every time | S2 S4 |
| P43 | A tenant cannot act on the owner's behalf, so everything stalls | S2 S3 |

## 4. Coverage against the current MVP

| Feature | Covers | Verdict |
|---|---|---|
| F1 chats | P1 P2 P7 P8 P9 P10 P34 P36 | solid |
| F2 violations / complaints | P4 P5 P11 P13 P15 P34 | solid |
| F3 technical faults + statistics | P3 P12 P14 P16 P17 | solid |
| F4 announcements | P6 P18 P19 | solid |
| F5 emergency alerts | P20 P21 P22 | solid |
| **— none —** | **P23–P28 (money), P29–P31 (voting), P32–P33 (access), P37–P40 (management ops), P41–P43 (landlord)** | **gap** |

**The gap is the finding.** F1–F5 is a complete communication product and an empty
property-management product. Five themes with eighteen problems have no feature at all — and two of
them (money, collective decisions) are where the buyer's own obligations sit.

## 5. Questions this raises for the product

| # | Question |
|---|---|
| G1 | Is this a communication tool or a management platform? F1–F5 answers "communication"; §E/§F suggest the money is elsewhere. |
| G2 | Who actually signs — the management company (S4), the chair (S5), or the developer (S8)? Pricing and the whole pitch follow from this. |
| G3 | The landlord (S2) was the first pain named and is the least served. Is that the wedge, or a distraction? |
| G4 | Does the product touch payments? Still unanswered from the planning session. §E says the pain is real. |

## 6. Before any of this is submitted as fact

| # | Action | Why |
|---|---|---|
| V1 | Interview 5–10 residents and at least 2 management staff | Turns this list from assumption into evidence. Cheapest possible validation, and Assignment 1 is far stronger with "we asked N people" than with "we think". |
| V2 | **Check for existing Kazakhstani ЖКХ/ОСИ apps** | `UNVERIFIED` — the team pivoted into this space with zero competitor research, having done it thoroughly for the previous idea. Existing local products are likely. Discovering one after submitting is worse than finding it now. |
| V3 | Verify the legal form of the buyer | `UNVERIFIED` — Kazakhstan reformed residential management (КСК → ОСИ) and the resulting obligations around general meetings and reporting may be statutory. If so, §F is not a nice-to-have, it is a compliance feature, and it changes who signs (G2). Needs a primary legal source, not a blog post. |
| V4 | Read reviews of whatever V2 turns up | Free, sourced, quotable evidence of real pain — exactly the kind of citation the course requires. |
