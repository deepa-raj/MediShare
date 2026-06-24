# MediShare — The Complete Guide
### How it works, what every piece of tech does, what went wrong while building it, and how to talk about all of it in an interview.

This document assumes you are starting from zero. Every technical term gets explained in plain English before it gets used. Read it once start to finish, then come back to specific sections before an interview.

---

## Table of Contents

1. [What Is This Project, Really?](#1-what-is-this-project-really)
2. [How The Whole System Fits Together](#2-how-the-whole-system-fits-together)
3. [The Tech Stack, Explained Like You've Never Coded Before](#3-the-tech-stack-explained-like-youve-never-coded-before)
4. [Walking Through the App, Screen by Screen](#4-walking-through-the-app-screen-by-screen)
5. [Key Engineering Pieces, Explained Simply](#5-key-engineering-pieces-explained-simply)
6. [Real Challenges Faced (and How They Were Solved)](#6-real-challenges-faced-and-how-they-were-solved)
7. [Alternatives Considered, and Why](#7-alternatives-considered-and-why)
8. [Interview Questions You Should Be Ready For](#8-interview-questions-you-should-be-ready-for)
9. [Glossary](#9-glossary)
10. [How to Actually Use This Document](#10-how-to-actually-use-this-document)

---

## 1. What Is This Project, Really?

**The problem:** People throw away medicine that's still good. Someone's prescription changes, or they recover faster than expected, and they're left with sealed, unexpired medicine with nowhere to go. Meanwhile, NGOs and free clinics serving people who can't afford medicine are often short on exactly that kind of stock. The medicine and the need both exist — they just never meet each other in time, because there's no easy way to connect them before the expiry date passes.

**The solution:** MediShare is a website with two kinds of users:

- **Donors** — individuals who have unused medicine and want to give it away
- **NGOs/clinics** — organizations that can use that medicine for patients

A donor posts what they have ("4 strips of Paracetamol, expires in 90 days"). An NGO browses what's available, and if they want it, they **claim** it. The donor then knows to expect that NGO to reach out, hands the medicine over in person, and marks it as done.

**The core loop, as a diagram:**

```
 DONOR                                    NGO
   |                                       |
   |  1. Posts a medicine listing          |
   |--------------------------------------> |
   |                                  2. Browses, sees it,
   |                                     and claims it
   |  <------------------------------------ |
   |  3. Gets notified "X claimed it,      |
   |     reach out to arrange handover"    |
   |                                       |
   |  4. They meet in person, hand it over |
   |                                       |
   |  5. Donor marks it "completed"        |
   |  6. NGO gets notified "handover       |
   |     confirmed"                        |
```

Everything else in this project — accounts, logins, the database, the notifications, the admin panel — exists to support this one loop reliably.

---

## 2. How The Whole System Fits Together

If you've never built software before, here's the simplest possible mental model, using a restaurant as an analogy:

| Restaurant | This project | Technical name |
|---|---|---|
| The dining room — what you see, the menu, the tables | The web pages you click through in your browser | **Frontend** |
| The kitchen — where food actually gets cooked | The server that processes requests and makes decisions | **Backend** |
| The pantry — where ingredients are stored | Where all the data lives (users, medicines, claims) | **Database** |
| A waiter carrying your order to the kitchen and bringing food back | The communication between frontend and backend | **API (Application Programming Interface)** |

When you click "Claim for pickup" on a medicine listing, here's *exactly* what happens, step by step:

1. Your browser (**frontend**) sends a message to the server: "Hey, user #4 wants to claim medicine #7."
2. That message travels over the internet as an **HTTP request** — think of it as a sealed envelope with an address (the URL) and contents (the data).
3. The server (**backend**) receives it, and first checks: *is this person actually logged in? Are they actually an NGO, not a donor?* (This is called **authentication** and **authorization** — two different checks, explained later.)
4. If they pass those checks, the server asks the **database**: "Is medicine #7 still available?"
5. If yes, the server tells the database: "Update medicine #7's status to claimed, and create a new claim record."
6. The server also tells the database: "Add a notification for the donor saying their medicine was claimed."
7. The server sends a response back: "Success! Here's a confirmation message."
8. Your browser receives that response and updates the screen — the button changes, a success message appears.

All of that happens in well under a second. This entire round trip — browser asks, server thinks, database answers, server replies, browser updates — is the fundamental pattern behind almost every website you've ever used, not just this one.

---

## 3. The Tech Stack, Explained Like You've Never Coded Before

A "tech stack" is just the list of tools and languages used to build something. Here's every piece used in MediShare, what it actually does, and — critically — *why this one and not something else.*

### Backend pieces (the "kitchen")

**Node.js**
Node.js lets you run JavaScript outside of a web browser — on a server. Normally, JavaScript only runs *inside* a browser to make web pages interactive. Node.js takes that same language and lets it run as a standalone program, which is what makes it possible to write a backend in JavaScript instead of needing a totally different language. This matters because it means the same language (JavaScript) is used on both the frontend and backend of this project — one language to learn, not two.

**Express.js**
Express is a *framework* built on top of Node.js — think of it as a set of pre-built tools so you don't have to build a web server completely from scratch. Without Express, you'd have to manually write code to handle every possible type of incoming request, parse URLs, manage routing, and so on. Express gives you simple, readable patterns like:
```js
app.post('/api/medicines', (req, res) => { /* handle the request */ });
```
That one line says "when someone sends a POST request to `/api/medicines`, run this function." Express is the single most common way to build a backend in Node.js — almost every Node.js job posting assumes you know it.

**SQLite (via `node:sqlite`)**
This is the **database** — where all the actual data lives permanently (users, medicines, claims, notifications). SQLite is special because, unlike most databases, it isn't a separate program you install and run — it's just a single file on disk. That makes it perfect for small-to-medium projects: no server to configure, no separate service to keep running. `node:sqlite` specifically refers to the fact that recent versions of Node.js *ship with SQLite built in* — so there's nothing extra to install at all.

**Drizzle ORM**
"ORM" stands for **Object-Relational Mapper**. Without one, you'd write raw database commands as text strings, like:
```sql
SELECT * FROM medicines WHERE city = 'Chennai'
```
This works, but it's risky (easy to make typos, easy to accidentally allow malicious input) and doesn't get any help from your code editor. Drizzle lets you write the same query as actual JavaScript code:
```js
db.select().from(medicines).where(eq(medicines.city, 'Chennai'))
```
This is checked by the editor as you type, catches mistakes before you even run the code, and is much harder to accidentally break. *(See Section 7 for why Drizzle specifically, over its biggest competitor, Prisma.)*

**Zod**
Zod checks that incoming data actually looks the way it's supposed to before your code tries to use it. For example, when someone registers, Zod checks: is the email actually shaped like an email? Is the password at least 6 characters? Without this, a user could submit garbage data (or someone with bad intentions could submit deliberately broken data) and your code would either crash or silently store nonsense. Zod stops that at the door, with one clear, centralized definition of "what does valid data look like" instead of scattered manual checks everywhere.

**JWT (JSON Web Tokens) — via the `jsonwebtoken` package**
This is how the app remembers "this person is logged in" between requests. Here's the problem it solves: the web is *stateless* by default — the server doesn't naturally remember you between one click and the next. JWT solves this by giving the user a signed, tamper-proof "ticket" (the token) when they log in. The browser keeps this ticket and shows it with every future request, like a wristband at a concert — the server can glance at it and instantly know who you are without looking anything up, because the ticket itself is cryptographically signed and can't be faked.

**bcrypt — via the `bcryptjs` package**
This turns a plain-text password ("password123") into a scrambled, irreversible version before it's ever stored in the database. If the database were ever leaked or stolen, the actual passwords still couldn't be read — bcrypt is specifically designed so that going from the scrambled version back to the original is computationally infeasible. Storing real passwords in plain text is one of the most basic security mistakes a developer can make; bcrypt is the standard fix.

**Swagger / OpenAPI**
This automatically generates a webpage (`/api/docs`) that documents every single API endpoint — what it does, what data it expects, what it returns — directly from comments written in the code. This means the documentation can never go out of sync with the actual code, because it's generated *from* the code.

**express-async-errors**
A small utility that makes sure if something goes wrong inside an `async` function (a function that waits for something, like a database query), the error gets caught properly instead of silently crashing the server. Without it, certain errors in modern JavaScript can "fall through the cracks" of Express's older error-handling design.

### Frontend pieces (the "dining room")

**React**
React is a library for building user interfaces out of reusable pieces called **components**. Instead of writing one giant HTML page, you break the UI into small, focused pieces — a `MedicineCard`, a `Navbar`, an `ExpiryBar` — and React handles updating the screen efficiently whenever the underlying data changes. This is the most widely used frontend library in the industry, which is part of why it was chosen here — the skills transfer directly to almost any frontend job.

**Vite**
Vite is the tool that takes all your React code and turns it into the actual files a browser can run, and it's what runs the local development server you've been using (`npm run dev`). Its main selling point is speed — changes you make show up in the browser almost instantly, which makes development much less frustrating than older tools.

**React Router**
This lets the app have multiple "pages" (Browse, Login, Donor Dashboard, Admin) while still being what's called a **Single Page Application** — meaning the browser never actually reloads the whole page when you navigate. It just swaps out which component is showing, which feels instant.

**Tailwind CSS**
Tailwind is a way of styling things by adding small utility classes directly in your markup, like `className="bg-teal-600 text-white px-4 py-2 rounded-lg"`, instead of writing separate CSS files. Each class does one small thing (background color, padding, rounded corners), and you combine many of them to build a complete look. It trades "writing less CSS" for "writing more class names," which most teams find faster once you're used to the pattern.

**Axios**
A small library for actually sending those HTTP requests from the frontend to the backend (the "waiter" from the restaurant analogy). JavaScript has a built-in way to do this (`fetch`), but Axios adds convenient features on top — like automatically attaching the JWT token to every request, which this project uses (see `api/client.js`).

**React Context (`AuthContext.jsx`)**
This isn't a separate library — it's a built-in React feature for sharing data across many components without manually passing it down through every single one. In this project, it's used to make "who is currently logged in" available anywhere in the app — the Navbar, the dashboards, the protected routes — without re-fetching or re-passing that information constantly.

### Testing pieces

**Vitest**
A tool that runs your tests and tells you, clearly, what passed and what failed. A "test" is just a small piece of code that checks: "if I do X, do I actually get Y?" — e.g., "if an NGO tries to claim a medicine that's already claimed, do they get rejected?" Tests catch broken behavior *before* a real user does.

**Supertest**
Works alongside Vitest specifically for testing a backend API — it lets a test pretend to be a browser, sending real requests to the Express app and checking the real responses, without needing an actual running server or browser.

**React Testing Library**
The frontend equivalent — lets a test render a React component and check what actually shows up on screen, the way a real user would see it.

### Infrastructure pieces (deployment & reliability)

**Docker**
Docker packages an application together with everything it needs to run (the exact Node.js version, all dependencies) into a single unit called a **container**. The entire point is "works on my machine" stops being an excuse — a container runs identically on any computer that has Docker installed, because it's not relying on whatever happens to already be installed on that machine.

**GitHub Actions (CI — Continuous Integration)**
This automatically runs the test suite every time code is pushed to GitHub. If a change accidentally breaks something, you find out immediately (a red ✗ on GitHub) instead of finding out later, or never. "CI" is one of those terms that sounds intimidating but just means "tests run automatically, not manually."

---

## 4. Walking Through the App, Screen by Screen

**Registration.** A new user picks "I'm donating" or "We're receiving," fills in basic details, and optionally clicks "Share my location" — which triggers a browser permission popup. If they accept, their browser tells the app their GPS coordinates, which get saved. If they decline, that's a fully supported path too — the app just can't show them distance-based features later.

**Browsing.** Anyone (logged in or not) can see available medicine. Each listing shows an **expiry urgency bar** — a small colored progress bar showing "fresh" (green) through "expired" (gray), calculated fresh on every page load from the expiry date. If you're a logged-in NGO with a saved location, you also see "X km away" on each card and can sort by nearest-first.

**Posting (donor).** A donor fills in medicine name, category, quantity, and expiry date, and submits. Behind the scenes, this also triggers a check: are there any NGOs nearby (within 50km) who have a saved location? If so, they each get a notification.

**Claiming (NGO).** Clicking "Claim for pickup" sends a request that: checks the medicine is still available, checks it hasn't expired, updates its status to "claimed," creates a claim record, and sends the donor a notification.

**Notifications.** A bell icon in the navbar shows unread notifications, refreshing automatically every 15 seconds. Clicking one marks it read and jumps you to the relevant dashboard.

**Handover.** The donor and NGO arrange to meet in person (using the contact info now shown after a claim — name, email, phone). Once it's actually handed over, the donor clicks "Mark handed over," which updates the medicine's status to "completed" and notifies the NGO.

**Admin.** A separate role (not self-registrable) that can see every user, listing, and claim across the whole platform, and remove anything inappropriate.

---

## 5. Key Engineering Pieces, Explained Simply

### The expiry urgency calculation
Every time a medicine listing is fetched, the server calculates `days_left = expiry_date - today`. Based on that number, it labels the medicine `fresh`, `soon`, `critical`, or `expired`. This is **calculated fresh every single time**, not stored — because if it were stored, it would slowly become wrong as time passes (a medicine that was "fresh" yesterday might be "critical" today, and nothing would update that stored label unless something specifically re-ran the calculation). Calculating it on read instead of writing it once means it's always correct with zero extra effort.

### JWT authentication flow, step by step
1. User submits email + password to `/api/auth/login`
2. Server checks the password against the bcrypt-hashed version in the database
3. If it matches, server creates a JWT — a signed string containing the user's ID and role
4. Server sends that token back; the browser saves it
5. Every future request, the browser attaches that token in a header: `Authorization: Bearer <token>`
6. The server checks the token's signature is valid (meaning it definitely wasn't tampered with) before trusting any information inside it

### Role-based access control
Three roles exist: `donor`, `ngo`, `admin`. Certain actions are locked to certain roles — only a donor can post a listing, only an NGO can claim one, only an admin can delete other people's accounts. This is enforced with small reusable middleware functions like `requireRole('donor')` that run *before* the actual route logic, rejecting the request early if the role doesn't match.

### The Haversine formula (distance calculation)
Imagine the Earth as a giant ball, and you want to know the straight-line distance between two points on its surface, given only their latitude and longitude. You can't just use ordinary geometry, because the surface is curved, not flat. The Haversine formula is a well-known mathematical formula that solves exactly this — it's not something invented for this project, it's a standard piece of math used in GPS, mapping, and logistics software everywhere.

### Notifications — "pull" vs "push"
This app uses a **pull** model: notifications are stored in the database, and the frontend asks ("polls") "any new notifications for me?" every 15 seconds. The alternative — a **push** model — would mean the server actively sends something to you the instant it happens (like a real text message or push notification). Push requires a third-party service with its own account and cost (Twilio for SMS, SendGrid for email). Pull is simpler, free, and fully within the app's own control — a deliberate, explainable tradeoff.

### Why validation lives in one place
Instead of every route individually checking "is this field present, is it the right length, is it the right format," all of that logic lives in `validation/schemas.js` using Zod. One route just says `validate(createMedicineSchema)` and the rest happens automatically. This means if a rule needs to change, it changes in exactly one place instead of being hunted down across many files.

---

## 6. Real Challenges Faced (and How They Were Solved)

These are not hypothetical — every one of these actually happened while building this project, in this exact order.

### Challenge 1: A native dependency wouldn't install
**What happened:** The first choice for talking to the database was a popular package called `better-sqlite3`. It failed to install because it needs to *compile* a piece of low-level code specific to the exact computer it's running on, and that compilation step needs to download some files from the internet — which wasn't possible in the environment being used.
**The fix:** Switched to `node:sqlite`, the version of SQLite that ships *inside* Node.js itself, starting from Node version 22.5. No installation, no compilation, no internet dependency at all.
**What it demonstrates:** Recognizing when a dependency is fighting your environment, and knowing there's often a simpler built-in alternative.

### Challenge 2: Prisma's installer also failed
**What happened:** Prisma — probably the most commonly mentioned ORM in job postings — was tried next. It also failed to install, for a similar reason: it downloads a compiled "engine" file from the internet during setup, and that download was blocked.
**The fix:** Switched to **Drizzle ORM**, which is written entirely in JavaScript with no compiled engine to download.
**What it demonstrates:** Choosing tools based on real constraints (in this case, environment limitations), not just "what's most popular" — and being able to explain that tradeoff honestly instead of pretending it was the obvious first choice.

### Challenge 3: A real, confusing bug from combining two tools together
**What happened:** Drizzle and `node:sqlite` were wired together, and almost immediately, the browse page started showing the *donor's name* in the spot where the *medicine's name* should be. Both `medicines` and `users` tables have a column called `name`. Drizzle's SQL output didn't rename these to avoid the clash (it assumes you're getting results back as a plain ordered list, not as a named object). But the way `node:sqlite` was being used returned named objects — and a JavaScript object can't hold two keys with the same name, so the second `name` silently overwrote the first.
**The fix:** Told `node:sqlite` to return rows as plain ordered arrays (`setReturnArrays(true)`) instead of named objects, matching what Drizzle actually expects.
**What it demonstrates:** This is a genuinely good "tell me about a bug you fixed" story — it has a clear symptom, a non-obvious cause, and a one-line fix once correctly diagnosed.

### Challenge 4: A validation rule rejected valid input
**What happened:** A donor registering got an error — `"Too small: expected string to have >=2 characters"` — despite filling in the form correctly. The cause: the "organization name" field, which donors never see, still existed in the frontend's data as an empty string (`''`). The validation rule said "if this field is provided, it must be at least 2 characters" — but an empty string *is* "provided" from the rule's point of view; it's just provided-and-too-short, which is different from not-provided-at-all.
**The fix:** Added a step that treats an empty string the same as "not provided" before the length check runs, on both the frontend (don't send the field at all if it's empty) and backend (treat it as absent if it somehow arrives empty anyway).
**What it demonstrates:** The difference between "missing" and "present but empty" is a classic, easy-to-miss edge case — and fixing it in two places (defense in depth) instead of just patching the symptom.

### Challenge 5: A real product gap, found by actually using the app
**What happened:** After a medicine got claimed, the notification told the donor to "reach out to arrange handover" — but the donor's dashboard never actually showed *who* claimed it or *how* to contact them. The feature worked technically (the claim succeeded, the notification fired) but was useless in practice.
**The fix:** Added a query that fetches the claimant's name, organization, email, and phone whenever a listing is claimed, and displays it directly on the donor's dashboard.
**What it demonstrates:** Tests and types catch *technical* bugs; they don't catch *product* gaps. This one was only caught by actually using the app the way a real person would.

### Challenge 6: A database limitation forced an architectural choice
**What happened:** Adding an `admin` role meant the `role` column's list of allowed values needed to grow from `donor/ngo` to `donor/ngo/admin`. SQLite enforces this kind of rule with something called a `CHECK` constraint — but SQLite cannot modify a `CHECK` constraint on an existing table without completely rebuilding that table from scratch.
**The fix:** Removed the database-level constraint entirely and relied on the Zod validation (which already runs on every request) to enforce which roles are valid.
**What it demonstrates:** Sometimes the "more correct" textbook answer (enforce everything at the database level) isn't the practical answer for the tool you're actually using — being able to explain *why* you chose differently is more valuable than blindly following best practices.

---

## 7. Alternatives Considered, and Why

| Decision | Chosen | Alternative | Why |
|---|---|---|---|
| ORM | Drizzle | Prisma | Prisma needs a compiled binary downloaded at install time; Drizzle is pure JS, no install-time network dependency |
| Database driver | `node:sqlite` | `better-sqlite3` | `node:sqlite` ships inside Node.js itself — zero installation, zero native compilation |
| Database engine | SQLite | PostgreSQL / MySQL | SQLite is a single file, perfect at this scale; Postgres/MySQL need a separate running service, which is overkill for a project like this (but would be the right call at much larger scale) |
| Notifications | In-app (pull) | Email/SMS (push) | Email/SMS needs a third-party paid account (Twilio, SendGrid); in-app is free and fully self-contained |
| Auth | JWT | Session-based (server-stored sessions) | JWT doesn't require the server to remember anything between requests, which is simpler to reason about for an app this size |
| API style | REST | GraphQL | REST is simpler to learn, document, and test for a project with a fixed, well-known set of resources; GraphQL's flexibility matters more for large, evolving APIs with many different client needs |
| Styling | Tailwind CSS | Plain CSS / styled-components | Tailwind avoids context-switching between files and makes consistent spacing/color easy to enforce across many components |
| Frontend build tool | Vite | Create React App | Vite is faster in development and is now the more common modern choice; Create React App is effectively deprecated |

---

## 8. Interview Questions You Should Be Ready For

### About the project in general
- **"Walk me through this project."** → Lead with the problem (medicine wasted vs. needed), then the core loop (post → claim → handover), then one or two technical highlights (the expiry calculation, the geolocation feature).
- **"What was the hardest part?"** → Pick one from Section 6. The column-name-collision bug (Challenge 3) is the strongest story — it's specific, technical, and has a clean before/after.
- **"What would you do differently if you started over?"** → Honest answer: probably start with `node:sqlite` and Drizzle from day one instead of discovering the Prisma/better-sqlite3 issues partway through — but also note that hitting those walls is exactly how you learn the tradeoffs in the first place.
- **"What would you add if you had more time?"** → Real email/SMS notifications, photo uploads, ratings after handover (see the Roadmap in the README).

### Backend / API design
- **"What does Express actually do?"** → Routes incoming HTTP requests to the right function, based on the URL and method (GET/POST/PATCH/DELETE).
- **"What's the difference between authentication and authorization?"** → Authentication is "who are you" (logging in); authorization is "are you allowed to do this specific thing" (e.g., only donors can post listings).
- **"Why did you separate `app.js` from `server.js`?"** → So tests can import the Express app directly and test it with Supertest, without needing to actually start a real server on a real port.
- **"How do you handle errors?"** → A centralized error-handling middleware in `app.js` catches anything unexpected and returns a clean error message instead of leaking a stack trace; `express-async-errors` makes sure errors inside `async` functions get caught too.

### Database / ORM
- **"What is an ORM and why use one?"** → Lets you write database queries as normal code instead of raw SQL strings, catching mistakes earlier and reducing the risk of injection-style bugs.
- **"Why Drizzle over Prisma?"** → No native binary to download at install time (see Challenge 2) — be ready to explain this is an environment-driven tradeoff, not a claim that Drizzle is universally better.
- **"What's a foreign key, and where did you use one?"** → A column that points to another table's row, enforcing that the reference is valid. Used throughout — e.g., `medicines.donor_id` points to `users.id`, and `ON DELETE CASCADE` means deleting a user automatically deletes their listings too.
- **"What's a transaction, and why does it matter?"** → A group of database operations that either *all* succeed or *all* fail together. Used when claiming a medicine — updating its status and creating the claim record must happen together, or you'd end up with a medicine marked "claimed" with no actual claim on record.

### Authentication / security
- **"How does JWT work?"** → See Section 5's step-by-step.
- **"Why hash passwords instead of encrypting them?"** → Encryption is reversible (meant to be decrypted later); hashing is one-way by design, so even the developers can never see the original password.
- **"What stops someone from registering as an admin?"** → The public registration form's validation only allows `donor` or `ngo` as valid roles — `admin` isn't a reachable value through that form at all.

### Frontend / React
- **"What's the difference between props and state?"** → Props are data passed *into* a component from its parent; state is data a component manages *itself* and can change over time.
- **"Why use Context instead of passing props everywhere?"** → For data needed in many unrelated places (like "who's logged in"), passing it manually through every layer of components would be repetitive and fragile; Context makes it available directly wherever it's needed.
- **"How does the app know to show different content for donor vs NGO?"** → The logged-in user's `role` is checked, and components conditionally render different buttons/links/pages based on it.

### Testing
- **"What's the difference between unit tests and integration tests?"** → A unit test checks one small piece in isolation (e.g., the distance formula gives the right number for two known points); an integration test checks multiple pieces working together (e.g., an NGO claiming a medicine actually updates the database *and* sends a notification).
- **"Why mock or isolate the test database?"** → So tests don't depend on or corrupt real data, and so tests run the same way every time, regardless of what's currently in the real database.

### DevOps / Docker / CI
- **"What problem does Docker solve?"** → "Works on my machine" — Docker packages the exact environment an app needs so it behaves identically everywhere.
- **"What does your CI pipeline actually do?"** → Automatically runs the full test suite on every push to GitHub, so a broken change is caught immediately instead of being discovered later.

### Likely follow-up / "gotcha" questions
- **"What would break if you had 10,000 users instead of 10?"** → Honest answer: SQLite would likely become a bottleneck for heavy concurrent writes, and the in-JS distance calculation (looping over every listing) would get slow — at that scale, you'd move to PostgreSQL and push the distance calculation into the database with a geospatial extension or index.
- **"Why no refresh tokens?"** → Currently a single 7-day JWT for simplicity; a refresh-token system (short-lived access token + longer-lived refresh token) would be the more production-grade choice, and is explicitly listed in the project's roadmap as a known gap.

---

## 9. Glossary

| Term | Plain-English meaning |
|---|---|
| **API** | The set of rules for how frontend and backend talk to each other |
| **Backend** | The server-side code that handles logic, data, and decisions |
| **Frontend** | The part of the app that runs in the browser and that users see/click |
| **Database** | Where data is permanently stored |
| **ORM** | A tool that lets you write database queries as code instead of raw text |
| **Middleware** | A function that runs *before* the main logic of a request, often to check something (like "is this user logged in?") |
| **Endpoint / route** | A specific URL the backend listens for (e.g., `POST /api/medicines`) |
| **JWT** | A signed digital "ticket" that proves who a logged-in user is |
| **Hashing** | A one-way scrambling of data (like a password) that can't be reversed |
| **CI (Continuous Integration)** | Automatically running tests every time code changes |
| **Container (Docker)** | A packaged, portable bundle of an app and everything it needs to run |
| **CRUD** | Create, Read, Update, Delete — the four basic things you do to data |
| **REST** | A common style/convention for designing APIs |

---

## 10. How to Actually Use This Document

1. **Read it once, fully**, without trying to memorize anything.
2. **Re-read Section 6 (Challenges) and Section 7 (Alternatives)** two or three times — these are what actually make you sound experienced in an interview, far more than listing technologies.
3. **Practice saying the answers out loud**, not just reading them. Saying "Drizzle doesn't need a compiled binary at install time, unlike Prisma" out loud feels very different from reading it silently — out loud is what an interview actually requires.
4. **Ask me to run a mock interview** based on this document whenever you're ready — I can ask you these questions cold and give you honest feedback on your answers.
