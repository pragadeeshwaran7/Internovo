# AuraTriage // Creative Agency Auto-Intake MVP

An interactive, premium dashboard prototype designed to solve the agency intake bottleneck by automating client communication, project extraction, and routing using the **Groq Llama 3.1 8B LLM API**.

---

## 🚀 How to Run the MVP

1. Clone or download the files (`index.html`, `styles.css`, `app.js`) to a folder on your machine.
2. Open `index.html` directly in any web browser.
3. No build steps, dependencies, or server setup required!

---

## 🎯 What the MVP Does

This MVP demonstrates the complete end-to-end automation of the creative agency's intake pipeline:

1. **Simulated Inbox Thread**: 
   - Pre-seeds the exact client request: *"Hey, we need a logo for our new coffee brand..."*
   - Shows the AI Triage Bot reading this request and instantly calling the **Groq API** to extract **Design Type (Logo)** and **References (Earthy tones, minimal, modern)**.

2. **Smart Extraction & Follow-up**:
   - The AI identifies that **Purpose**, **Deadline**, and **Budget** are missing.
   - It automatically generates a reply asking *only* for these missing fields.
   - You can type replies in real-time or click the preset buttons to test the auto-triage.

3. **Dynamic Groq API Parsing**:
   - Integrates the **Groq Llama 3.1 8B Model** (`llama-3.1-8b-instant`) with your custom key.
   - Sends the conversational thread to Groq and retrieves a structured JSON payload representing the intake status.

4. **Robust Heuristic Fallback**:
   - If the browser blocks direct connection to Groq due to CORS policies (common when opening local `file://` files), the app gracefully falls back to a built-in **heuristic regex parser**.
   - This ensures the dashboard remains 100% functional and interactive in any local testing environment.

5. **Automated Skill-Based Routing**:
   - As soon as the last missing field is provided, the system assigns a status of **Routed** and moves the ticket into the correct designer's queue:
     - **Priya** (Brand Identity) for Logos, style guides, etc.
     - **Sameer** (Decks & Presentations) for decks, presentation slides, etc.
     - **Riya** (Social Media / Marketing) for marketing creatives, social ads, etc.
   - The UI plays a glowing animation, increments the designer's queue count, and renders a detailed project metadata card in their inbox column.

6. **Developer Live-JSON Explorer**:
   - Displays the exact JSON payload the LLM parses behind the scenes. Includes status, extraction engine details, extracted values, missing fields, completeness percent, and routed destination.

---

## 🛠️ What We Chose NOT to Build (and Why)

To maintain focus on the core workflow and user experience within the 30-minute timeframe, we prioritized client-side execution:

### 1. Database Persistence & Conversational Memory
* **Why**: Creating databases (e.g. SQLite, PostgreSQL) and configuring session tokens to track client threads over days would add boilerplate overhead. Storing thread details in active browser memory is sufficient to demonstrate the interactive intake-and-routing flow.

### 2. CRM & Project Management Integrations (HubSpot, Monday.com, Slack)
* **Why**: Connecting to third-party APIs is a secondary automation step. The immediate pain point is the manual triage bottleneck. Proving the *extraction and routing logic* first validates the business value before committing to API integration costs.

### 3. Advanced Workload Balancing
* **Why**: The problem specifies direct ownership (Priya = Brand, Sameer = Decks, Riya = Social). Advanced heuristics like workload checks, holiday calendars, or auto-reassignments would add unnecessary complexity at this stage. Fixed routing rules are clean and deterministic.

### 4. Multi-format File Parsing (Figma links, PDFs, Images)
* **Why**: Clients often send design references as attachments. Building a pipeline to read Figma files or extract colors from attachments is highly complex. Restricting the MVP intake to plain-text messages verifies the primary triage funnel first.
