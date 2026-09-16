# TSIS 1 + TSIS 2 — Project Initiation and Idea List

**Course:** IT Project Management (PjM 101) · **Team:** house-app · **Date:** 2026-09-16
**Members:** Altair Zhambyl, Zere Bayzhan

## 1. Project / Idea Description

**Project name:** house-app

**Problem.** People in a residential building use a WhatsApp group to talk to the management
company. This does not work well.

A new resident cannot join alone. They must find a person and ask to be added. Important news is
lost between other messages. The company often does not say when water or power will be off.

When something breaks, many people report the same thing. For example, the lift stops working. Ten
neighbours write about it. The company reads the same problem ten times. Nobody can see if someone
is fixing it. Owners who rent out their flat pay the monthly fee, but they are not in the chat, so
they know nothing about their building.

**Solution.** We build a web platform for one building. It replaces the chat group.

A resident signs in and proves they live in a flat. Then they get access. A problem becomes a
request with a photo, a place and a short text. If ten people report the same lift, the system joins
these reports into one request. Everyone sees the status: new, in work, or done.

The company sends news and emergency alerts from one place, and it reaches every flat. The company
can also start a vote and collect money for agreed work.

**Target audience.** Management companies of residential buildings in Kazakhstan pay for the
product. Residents, owners, tenants and technicians use it.

**Expected deliverable (MVP).** A working web application. A resident can sign in, send a request
with a photo, and see its status. The company can send news to the whole building.

A project has three limits: time, cost and scope (Meredith & Mantel, ch. 1, pp. 4-6). We keep the
scope small to finish in one semester.

## 2. RACI Matrix

We use four letters from Meredith & Mantel, ch. 6, section 6.3, pp. 240-242. **R** (Responsible)
does the work. **A** (Accountable) approves it and answers for the result — only one A per task.
**C** (Consult) is asked before we start. **I** (Inform) is told about the result.

**Roles.** PM, BE (backend) and QA — Altair Zhambyl. FE (frontend) and UX — Zere Bayzhan.
SPON (sponsor) — course instructor. We are two people, so each person has more than one role.

| # | Task / Activity | PM | BE | FE | UX | QA | SPON |
|---|---|---|---|---|---|---|---|
| 1 | Define scope and MVP | **A** | C | C | C | I | C |
| 2 | Interview residents and staff | **A**/R | C | I | C | I | I |
| 3 | Study other products on the market | **A**/R | I | I | C | I | I |
| 4 | Write requirements and feature list | **A** | C | C | C | C | C |
| 5 | Design the database | C | **A**/R | C | I | C | I |
| 6 | Set up repository and task board | C | **A**/R | C | I | I | I |
| 7 | Make brand, colours and screens | I | I | C | **A**/R | I | C |
| 8 | Build sign-in and access rights | I | **A**/R | C | I | C | I |
| 9 | Build requests with photo and status | C | **A**/R | C | C | C | I |
| 10 | Build the request screens | C | C | **A**/R | C | C | I |
| 11 | Test the MVP and fix bugs | C | C | C | I | **A**/R | I |
| 12 | Prepare demo and course documents | **A**/R | C | C | C | I | I |

*A/R means the same role does the work and approves it.*

## 3. List of Stakeholder's Expectations

Meredith & Mantel, ch. 1, p. 13, name four groups: client, parent organization, project team and
the public. Each group sees success in its own way. For example, the company wants less work, but
residents want fast answers. So we also write how we will manage each expectation.

| Stakeholder | Group | Expectation | Priority | How we manage it |
|---|---|---|---|---|
| Management company | Client (buyer) | Get one report per problem, not ten. Have proof of the work | High | Same reports join into one request. Each request saves its history |
| Residents | Client (user) | Join without asking a person. See if someone is fixing the problem | High | Sign-in by flat. Status on every request |
| Owner-landlords | Client (user) | Know what happens in the building they pay for | Medium | Access belongs to the flat, not to the chat |
| Technicians | Client (user) | Fix the problem on the first visit | Medium | Photo, place and text come with the request |
| Course instructor | Parent org (sponsor) | Get documents on time. See that we use the method | High | Weekly plan and fact report. One-week sprints |
| Project team | Project team | Equal work. Clear owner for each task | High | One A per task in RACI. Planning every week |
| Utility providers | Public | Announce one outage and reach all residents | Low | One place to publish news per building |

## 4. Idea List

| # | Idea (direction) | Why |
|---|---|---|
| 1 | Official news channel, separate from chat, for daily news and planned work (water, power, gas) | News is lost in normal chat messages. People find out about outages too late |
| 2 | Fault reporting with photo, owner and status | Stops ten copies of one problem. Shows progress |
| 3 | Emergency alert to every flat | Gas, fire and water have no fast channel |
| 4 | Collective decisions without a meeting: online voting and money collection for agreed work | Few people come to a real meeting. Cash collection has no visible total |
| 5 | Problem history for each object (lift, pipe, entrance) | Nobody sees that one lift broke five times |
| 6 | Access for owners who rent out flats | They pay, but get nothing today |

## 5. Initial Features List

| Feature | Description | Why (user value) | Priority |
|---|---|---|---|
| Sign-in by flat | Prove you live in a flat | Join without asking a person | **Must** |
| Building channel | Messages only for one building | One place, not many chats | **Must** |
| Request with photo | Add image, place and text | The technician comes ready | **Must** |
| Request status | New, in work, done, with time | People see progress. Company has proof | **Must** |
| News | Posts about planned work | People know before the water stops | **Must** |
| Join same reports | Ten reports become one request | The company answers once | **Should** |
| Emergency alert | Fast message: gas, fire, water | People must not miss it | **Should** |
| Complaint about a neighbour | Only the company sees it | No direct conflict | **Should** |
| Online vote | Question, date and open result | Decide without a meeting | **Should** |
| Money collection | Ask and track payment | No cash. Sum is visible | **Should** |
| Object statistics | How often each object breaks | Shows what to change | **Could** |
| Owner access | Give access to a tenant, take it back | Owner stays informed | **Could** |

## 6. AI Disclosure

We used generative AI (Claude) for the structure of this document, for English wording, and to put
our list of problems into tables. We chose the project, the stakeholders, the features and their
priority ourselves. We also used AI to set up the code repository. That code is not part of this
document.
