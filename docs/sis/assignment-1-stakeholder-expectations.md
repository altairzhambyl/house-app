# Assignment 1. List of Stakeholder Expectations

**Project:** house-app — resident-to-management platform for residential complexes in Kazakhstan
**Team:** Altair Zhambyl (backend, testing, analysis) · Zere Bayzhan (frontend, design)
**Date:** 2026-09-16 · **Sprint:** week 3, one-week sprints, Agile

## 1. Problem context

A residential complex today is coordinated through an ad-hoc messaging group. Joining requires
finding a person and asking permission, announcements are lost among unrelated conversation,
requests reach the management company several times over from different neighbours, and nobody can
see whether anything is being done. house-app replaces that group with a structured channel in which
every request has an owner, a status and a history.

**Commercial model: B2B.** The product is sold to the management organisation (S4), which pays for
it per building. Residents are users, not customers — they never pay. This distinction governs the
whole document: a resident expectation is only worth building when satisfying it also serves the
organisation that signs the contract. Section 5 prioritises on exactly that basis.

> **Status of the statements below.** These are the team's working assumptions, formed from the
> team's own experience of living in such complexes. They have not yet been validated through
> interviews. Assignment 4 onward will test them; nothing here should be read as a measured finding.

## 2. Stakeholders

| ID | Stakeholder | Relationship to the product |
|---|---|---|
| S1 | Resident-owner | Lives in the unit, pays the service fee. Primary daily user. |
| S2 | Owner-landlord | Owns and pays, but does not live there. Rents the unit out. |
| S3 | Tenant | Lives there, owns nothing, currently has no standing in any process. |
| S4 | Management organisation | Operates the building. **The paying customer.** |
| S5 | Chair / building manager | Decision-maker inside S4; signs the contract. |
| S6 | Technician | Plumber, electrician, lift engineer. Executes requests. |
| S7 | Concierge / security | Front desk; first to see incidents. |
| S8 | Developer | Hands over new complexes; a possible distribution channel. |
| S9 | Utility providers | Source of planned-outage information. |

## 3. Expectations

| ID | Stakeholder | Expectation | Satisfied when |
|---|---|---|---|
| E1 | S1 | Reach the management organisation without asking anyone for permission first | A resident verified against a unit gets access unaided |
| E2 | S1 | See whether a reported problem is being worked on | Every request exposes a status and a timestamped history |
| E3 | S1 | Learn about planned water, power and gas outages before they happen | Announcements are delivered and separated from general conversation |
| E4 | S1 | Be warned immediately in an emergency | An alert reaches every unit in the building at once |
| E5 | S1 | Raise a complaint about a neighbour without a personal confrontation | Complaints can be filed through the management organisation |
| E6 | S2 | See what happens in a building they pay for but do not live in | Remote owners receive the same announcements and request history |
| E7 | S2 | Hand access to a tenant and withdraw it later | Access is tied to the unit and can be reassigned |
| E8 | S3 | Report a fault in the unit they occupy | Tenants may file requests within a scope the owner permits |
| E9 | S4 | Stop receiving the same problem from ten people | Duplicate reports attach to one request |
| E10 | S4 | Prove what was done, and when | Every request retains an immutable history |
| E11 | S4 | See which assets fail repeatedly | Faults aggregate per asset over time |
| E12 | S5 | Show residents that the organisation is working | Statistics are reportable to owners |
| E13 | S6 | Receive work with enough context to arrive prepared | Requests carry photographs, location and description |
| E14 | S7 | Record an incident so it is not lost at shift change | Incidents are logged against the building |
| E15 | S9 | Publish an outage once and have it reach every resident | Announcements are issued from a single entry point |

## 4. Conflicts between expectations

Expectations that pull against each other, and the position taken:

| Conflict | Position |
|---|---|
| S1 wants to report anything instantly; S4 wants fewer duplicate requests (E1 vs E9) | Keep reporting frictionless, deduplicate afterwards. The cost of a duplicate is lower than the cost of a resident who gives up. |
| S4 wants an evidence trail; S1 may want a complaint about a neighbour kept private (E10 vs E5) | Complaints about people are visible to management only, never to other residents. |
| S3 wants to act; S2 owns the unit and carries the liability (E8 vs E7) | The owner grants the tenant a limited scope and can revoke it. |
| S4 wants reporting; S1 wants transparency about money (E12) | Out of scope for the MVP. Recorded in Assignment 2 as a deliberate exclusion, not an oversight. |

## 5. Priority

| Priority | Expectations | Reasoning |
|---|---|---|
| Must have | E1, E2, E3, E9, E10, E13 | Without these the product does not replace the messaging group it is meant to replace. E9, E10 and E13 are also the three that the buyer feels directly: fewer duplicate requests, a defensible record, and technicians who arrive prepared. |
| Should have | E4, E6, E11, E14 | Strong differentiators; none is required for a first usable release. |
| Could have | E5, E7, E8, E12, E15 | Valuable, but each introduces a new role or permission model. |
