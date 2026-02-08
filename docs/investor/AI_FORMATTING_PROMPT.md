# AI Formatting Prompt for BlockDrive Investor Documents

**Copy everything below the line to provide to Claude, Gemini, or other AI assistants.**

---

## PROMPT START

I need your help transforming markdown investor documents into professionally formatted, investor-ready documents suitable for a data room.

### CONTEXT: BlockDrive

**Tagline:** "Enterprise Cloud Storage for the New Internet"

**One-Liner:** The first cloud storage platform where breached data is worthless—files never exist in complete form at any single point. Bridging Web2 reliability with Web3 sovereignty.

**The Core Innovation: Programmed Incompleteness**

BlockDrive solves a fundamental problem that no other storage solution addresses: every existing system—centralized or decentralized, encrypted or not—stores complete files somewhere. This creates an irreducible attack surface.

BlockDrive's architecture ensures **files never exist in complete, usable form on any system**:
1. Files encrypted client-side with wallet-derived keys (AES-256-GCM)
2. First **16 bytes** extracted from the encrypted file before upload
3. Zero-knowledge proof generated (proves possession without revealing)
4. Incomplete file stored on Filebase/IPFS (bulk storage)
5. 16 bytes + ZK proof stored encrypted on Cloudflare R2 (reliability layer)
6. Commitment hash (SHA-256 of 16 bytes) stored on Solana blockchain (verification)

**Result:** Even if all storage providers are breached simultaneously, attackers get cryptographic garbage. Only the wallet holder can reconstruct files.

**The Hybrid Multi-Cloud Architecture:**
- **Filebase/IPFS** = Primary storage for encrypted file chunks (the bulk of data)
- **Cloudflare R2** = Stores ZK proofs and encrypted 16 bytes (critical recovery data)
- **Solana blockchain** = Commitment hashes and immutable verification
- **Arweave** = Optional permanence layer for critical documents

This bridges Web2 reliability (R2's 99.99% SLA) with Web3 sovereignty (decentralized storage, blockchain verification) without trusting either with complete data.

**Key Technical Details:**
- **Encryption:** AES-256-GCM with three-level wallet-derived keys
- **Scalability:** Multi-PDA sharding (25,500 files per user)
- **Gasless:** Session delegation system (users never pay gas)
- **True Deletion:** Invalidate on-chain commitment = file permanently irreconstructible
- **No Vendor Lock-in:** Open-source recovery SDK

**Payment Infrastructure:**
- Stripe for fiat (credit card)
- Crossmint stablecoin orchestration for crypto
- NFT Membership tokens on Solana (user owns their subscription)
- Gas credits system (USDC → SOL at time of use)

**Founder Background:** Former wealth manager at top-tier global financial institutions with deep network in institutional finance. Technical founder with blockchain architecture expertise.

**Stage:** Pre-revenue, seed fundraising.

---

### FORMATTING REQUIREMENTS

Transform the provided markdown document into a professionally formatted investor document with:

1. **Visual Design:**
   - Clean, modern typography (Inter, Helvetica, or similar professional sans-serif)
   - Consistent heading hierarchy with clear visual distinction
   - Strategic use of whitespace
   - Professional color palette (navy blue, white, subtle accent colors)
   - Page numbers and document title in footer

2. **Structural Elements:**
   - Executive summary or key takeaways at the top
   - Clear section headers with visual separators
   - Tables formatted with alternating row colors for readability
   - Callout boxes for key statistics or quotes
   - Flow diagrams or architecture visuals where appropriate

3. **Charts/Diagrams to Include:**
   - Programmed Incompleteness architecture diagram (the key visual)
   - Multi-provider storage distribution
   - Competitive positioning matrix
   - Timeline/roadmap visualization

4. **Professional Polish:**
   - Consistent terminology throughout
   - No typos or grammatical errors
   - Citations for market data where referenced
   - Confidentiality notice where appropriate
   - Contact information placeholder

5. **Output Format: DOCX (Microsoft Word)**
   - Generate a complete, professionally formatted .docx file
   - Use Word's built-in styles for consistent formatting
   - Include proper page breaks between major sections
   - Embed any diagrams/charts as editable elements where possible
   - Ensure the document prints cleanly on letter/A4 paper

---

### TONE & STYLE

- **Technical credibility first** — We're leading with a genuinely novel architecture
- **Data-driven** — Use specific numbers and specifications
- **Confident but not arrogant** — Let the innovation speak for itself
- **Enterprise-focused** — This is for institutional buyers and investors

---

### KEY MESSAGES TO EMPHASIZE

1. **"Files never exist in complete form—anywhere."** This is the core breakthrough.

2. **"Enterprise cloud storage for the new internet."** Bridging Web2 reliability with Web3 sovereignty.

3. **"Breached data is worthless by architecture."** Breaches can happen—but what attackers find is incomplete, useless data. No complete file exists at any single point of failure.

4. **"True deletion is possible."** Invalidate the commitment = file is permanently irreconstructible.

5. **Hybrid multi-cloud:** We use enterprise infrastructure (R2) without trusting it with complete data.

---

### DOCUMENT TO FORMAT:

[PASTE YOUR MARKDOWN DOCUMENT HERE]

---

### ADDITIONAL CONTEXT

**Key Terms:**
- **Programmed Incompleteness:** BlockDrive's core architecture where files never exist complete
- **16 bytes:** The critical bytes extracted from encrypted files, stored separately
- **ZK Proof:** Zero-knowledge proof demonstrating possession of 16 bytes without revealing them
- **Commitment:** SHA-256 hash of the 16 bytes, stored on-chain for verification
- **Filebase:** IPFS-compatible decentralized storage provider (bulk encrypted data)
- **PDA:** Program Derived Address - Solana's deterministic account derivation

**What NOT to over-emphasize:**
- The Crossmint neobank/embedded finance features are enabling infrastructure, not the core innovation
- Financial services expansion is a Phase 2 story, not the seed pitch
- The storage innovation (Programmed Incompleteness) is the primary moat

---

## PROMPT END

---

## USAGE NOTES

1. Copy everything between "PROMPT START" and "PROMPT END"
2. Paste the markdown document you want formatted where indicated
3. Add any specific requests (e.g., "Focus on technical sections")
4. The AI will produce a formatted .docx file

## DOCUMENTS AVAILABLE FOR FORMATTING

| Document | Location | Purpose |
|----------|----------|---------|
| Executive Summary | `docs/investor/EXECUTIVE_SUMMARY.md` | One-page overview |
| Investment Thesis | `docs/investor/INVESTMENT_THESIS.md` | Full investment case |
| Technical Architecture | `docs/investor/TECHNICAL_ARCHITECTURE.md` | Technical deep dive |
| Market Analysis | `docs/investor/MARKET_ANALYSIS.md` | Market sizing |
