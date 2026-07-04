# Research: tags for AI consumption and human browsing (2026-06-29, SEO excluded)

Reference for the tag-management design. Distilled from a deep-research run (fan-out web search, adversarial
3-vote verification: 25 claims verified, 18 confirmed, 7 killed). The RAG claims rest on primary academic
papers (arXiv, ECIR 2026); the AI-readability claims rest on dev/SEO blogs corroborated by primary-adjacent
statements; the human-browsing claims are top-tier (NN/g plus peer-reviewed studies).

**Question.** Do tags help (1) AI systems read and organize a site and (2) humans browse archives, judged
independent of SEO (the operating premise: AI-mediated discovery is displacing search)?

## Confirmed

- **Author-assigned tags/metadata improve RAG retrieval** over pure embedding similarity; the consensus
  architecture is metadata-filter plus semantic search (one configuration 33%→63% Context@5). CAVEAT: the
  gains come from large, repetitive corpora (SEC filings) and transfer **weakly** to a small, topically
  diverse editorial archive, which is cairn's shape.
- **The AI-facing value is structured data, not styled HTML tag pages.** Serving markdown to agents via HTTP
  content negotiation (Cloudflare "Markdown for Agents"; markdown is ~80% fewer tokens than HTML, corroborated
  by Firecrawl and Jina) is the validated, low-cost win, and cairn already has the markdown.
- **llms.txt is a non-starter.** No major provider supports it as of mid-2026; an Ahrefs study found 97% of
  files got zero bot requests; Google's Illyes said "no plans to support LLMs.txt."
- **schema.org / JSON-LD for AI is unproven for cairn's crawlers.** Only a narrow Microsoft-Bing-specific
  confirmation; broad "schema helps LLMs reason" claims were refuted 0-3.
- **Faceted/filtered navigation is a genuine human findability win** (NN/g), but its value scales with size
  and is documented on large catalogs, with no evidence of payoff at small-to-medium archive scale.

## Refuted

Broad "schema.org/structured data generally helps LLMs reason"; "structured tags give large, statistically
robust RAG gains."

## Caveats

The RAG magnitude transfers weakly from repetitive corpora to a small editorial archive. AI-readability
sources are blogs (survived verification as conservative consensus). The human-browsing evidence base is large
ecommerce/travel catalogs with no post-count threshold.

## Net for cairn

Keep tags as machine-readable data (cairn already has it). Do not build llms.txt. The real "feeds AIs" win is
markdown-for-agents (its own follow-on). Tag filtering is a size-gated template option, not an engine default.
The tag-admin is justified by editor autonomy, not by AI or browsing payoff, neither of which is evidenced at
this scale.
