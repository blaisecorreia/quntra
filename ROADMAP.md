# Quntra: 28-Week Feature & AI Integration Roadmap

**Duration:** 28 weeks | **Phases:** 3 major phases | **Focus:** AI-powered stock trading platform

---

## Current State

### ✅ Already Implemented
- Email/password authentication with Better-auth
- User onboarding with preference collection (country, investment goals, risk tolerance, industry)
- Dashboard with TradingView market widgets
- Inngest + Gemini AI infrastructure
- MongoDB with Mongoose connection pooling
- Email system via Nodemailer

### 🚧 Ready to Activate (Commented Out)
- Personalized welcome emails (Inngest event in auth.actions.ts)
- Search functionality (nav item exists)
- Watchlist routes (nav item exists)
- Stock heatmap widget

---

## Phase 1: Foundation Features (Weeks 1-8)

**Goal:** Core trading features users expect. No AI yet—just solid UX.

### 1.1 Watchlist Management
- **Purpose:** Allow users to save and track favorite stocks
- **Features:** Add/remove stocks, display current prices and daily changes, quick access from dashboard
- **Effort:** 1-2 weeks
- **Database:** New `watchlist` collection

### 1.2 Stock Search & Details Page
- **Purpose:** Discover and research stocks
- **Features:** 
  - Real-time stock search with symbol autocomplete
  - Detailed stock page with TradingView charts
  - Company profile, key financials, recent news
  - Quick add to watchlist
- **Effort:** 1.5-2 weeks per feature
- **External API:** Finnhub (recommended - free tier available)

### 1.3 Price Alerts (Early Introduction)
- **Purpose:** Notify users when stocks hit target prices
- **Features:** Upper/lower bounds, email notifications, pause/delete alerts
- **Effort:** 2-2.5 weeks
- **Inngest:** 1 function (checkPriceAlerts) running every 1 minute

### Phase 1 Deliverables
- ✅ Users can search for stocks and view details
- ✅ Watchlist persists to database
- ✅ Dashboard shows watchlist preview
- ✅ All data validated via external APIs (no user input)
- ✅ Price alerts working and sending emails

---

## Phase 2: Tracking & Alerts (Weeks 9-16)

**Goal:** Enable portfolio tracking and automated alerts. First production Inngest workflows.

### 2.1 Portfolio Tracking
- **Purpose:** Users track stocks they own
- **Features:**
  - Add positions (symbol, quantity, purchase price, date)
  - Real-time portfolio value calculation
  - Gain/loss tracking (total and %)
  - Diversification by sector/industry
  - Cost basis management
- **Effort:** 2-3 weeks
- **Database:** New `portfolio` collection

### 2.2 Portfolio Dashboard & Analytics
- **Purpose:** Visual overview of investments
- **Features:**
  - Portfolio allocation pie chart
  - Sector breakdown
  - Performance table
  - Quick stats cards (total value, today's gain/loss, allocation %)
- **Effort:** 1.5-2 weeks

### 2.3 Background Price Updates
- **Purpose:** Keep portfolio prices current
- **Features:** Inngest job runs every 30 minutes during market hours
- **Effort:** 1 week
- **Inngest:** `updatePriceCache` function

### Phase 2 Deliverables
- ✅ Users can manage stock positions
- ✅ Real-time portfolio value calculations
- ✅ Price alerts checked every minute
- ✅ Sector allocation visualizations
- ✅ Inngest workflows running reliably in production

---

## Phase 3: AI Intelligence & Insights (Weeks 17-28)

**Goal:** Differentiate with Gemini-powered insights. Position as premium features.

### 3.1 Market Digest Email
- **Purpose:** Personalized market summary
- **Features:**
  - Daily/weekly digest filtered by user's watchlist
  - AI-generated summaries of market moves
  - How market affects user's portfolio
  - Actionable insights tailored to user
- **Effort:** 1.5-2 weeks
- **Inngest:** `sendMarketDigest` (daily at 8am)
- **AI Calls:** 1 per email via Gemini

### 3.2 Stock Recommendations
- **Purpose:** AI-driven personalized stock suggestions
- **Features:**
  - Recommend stocks matching investment goals & risk tolerance
  - "Why this is for you" explanation
  - Price targets and catalysts
  - Monthly recommendation newsletter
- **Effort:** 2-3 weeks
- **Inngest:** `generateRecommendations` (monthly)
- **AI Calls:** 1 per month per user

### 3.3 AI Stock Insights
- **Purpose:** Intelligent company analysis
- **Features:**
  - AI-generated company summary on stock page
  - Investment thesis based on profile
  - Key risks identification
  - Cached for 1 hour to control costs
- **Effort:** 1.5-2 weeks
- **AI Calls:** On-demand, cached

### 3.4 Portfolio Analysis
- **Purpose:** Deep insights into portfolio health
- **Features:**
  - Risk assessment of current portfolio
  - Concentration risk analysis
  - Correlation analysis between holdings
  - Rebalancing recommendations
  - Tax-loss harvesting candidates
- **Effort:** 2-3 weeks
- **AI Calls:** On-demand analysis

### Phase 3 Deliverables
- ✅ Users receive personalized market summaries
- ✅ Monthly AI-generated stock recommendations
- ✅ Stock pages show AI insights
- ✅ Portfolio page displays AI analysis
- ✅ Track recommendation engagement metrics

---

## AI Features & Gemini Integration

You have Inngest + Gemini already configured. Here's how to use them:

### Email-Based AI (Highest Priority)

#### A. Personalized Market Summary
- **Trigger:** Daily/weekly via Inngest cron
- **Input:** Market news, user's watchlist, user's goals
- **Output:** Personalized digest email
- **Why?** Keeps users informed without overwhelming
- **Cost:** 1 API call per email (batch to control costs)

#### B. Portfolio Health Digest
- **Trigger:** Weekly
- **Input:** Portfolio performance, sector allocation, user risk tolerance
- **Output:** Health check email with suggestions
- **Example:** "Your portfolio is 80% tech. You said 'Medium' risk. Consider diversifying."

#### C. Stock Recommendation Email
- **Trigger:** Monthly + on-demand
- **Input:** User profile (goals, risk, industries), watchlist history
- **Output:** 2-3 personalized stock picks with thesis
- **Example:** "Based on your interest in healthcare and medium risk tolerance..."

### Real-Time AI Features

#### A. Stock Details AI Summary
- **Location:** Stock details page
- **Trigger:** On page load
- **Input:** Company data, recent earnings, recent news
- **Output:** 2-3 sentence company summary + investment thesis + key risks
- **Performance:** <2s response (cache for 1 hour)

#### B. News Impact Analysis
- **Location:** News cards on dashboard/watchlist
- **Trigger:** On-demand click to expand
- **Input:** News headline, company data, user's portfolio
- **Output:** "What this means" + "Expected impact" + "Should I care?"

#### C. Portfolio Analysis
- **Location:** Portfolio page
- **Trigger:** On-demand or daily
- **Input:** All holdings, user investment goals, risk tolerance
- **Output:** Risk level, concentration analysis, rebalancing suggestions

### Smart Alert Emails

**When price alert triggers:**
- Don't just say "AAPL hit $200"
- Add context: Why it happened, is this a buy/sell opportunity, how it affects their portfolio
- Use Gemini to generate contextual insights

### Cost Optimization

**Problem:** Gemini API calls add up quickly with emails
**Solution:**
- Batch requests via Inngest
- Cache AI responses for 24 hours
- Reuse summaries across similar user profiles
- Store generated text in `aiCache` collection with TTL

---

## Database Schema

### New Collections to Create

```javascript
// Watchlist
{
  _id: ObjectId,
  userId: string,
  symbol: string,
  company: string,
  exchange: string,
  addedAt: Date,
  priceAtAdd?: number,
  notes?: string,
  tags?: [string] // e.g., ["dividend", "growth"]
}

// Portfolio
{
  _id: ObjectId,
  userId: string,
  symbol: string,
  company: string,
  quantity: number,
  purchasePrice: number,
  purchaseDate: Date,
  costBasis: number,
  currentPrice?: number, // cached, updated periodically
  sector?: string,
  notes?: string,
  createdAt: Date,
  updatedAt: Date
}

// Alerts
{
  _id: ObjectId,
  userId: string,
  symbol: string,
  company: string,
  alertType: "upper" | "lower", // upper = above threshold, lower = below
  threshold: number,
  currentPrice?: number,
  triggered: boolean,
  triggeredAt?: Date,
  alertName?: string,
  isActive: boolean,
  createdAt: Date,
  emailOnTrigger: boolean
}

// User Preferences
{
  _id: ObjectId,
  userId: string,
  country: string,
  investmentGoals: string,
  riskTolerance: string,
  preferredIndustry: string,
  preferredCommunication: "daily" | "weekly" | "never",
  newsFrequency: "daily" | "weekly" | "never",
  dashboardLayout?: object, // custom widget positions
  createdAt: Date,
  updatedAt: Date
}

// AI Recommendations
{
  _id: ObjectId,
  userId: string,
  symbol: string,
  company: string,
  reason: string, // why recommended for this user
  targetPrice?: number,
  catalysts?: [string],
  confidence: "high" | "medium" | "low",
  generatedAt: Date,
  userInteracted: boolean,
  userAction?: "bought" | "added_to_watchlist" | "ignored"
}

// Market News (cached)
{
  _id: ObjectId,
  headline: string,
  summary: string,
  source: string,
  url: string,
  datetime: Date,
  category: string,
  relatedSymbols: [string],
  aiSummary?: string, // generated by Gemini
  createdAt: Date,
  expiresAt: Date // TTL index for auto-deletion
}

// Earnings Events
{
  _id: ObjectId,
  symbol: string,
  company: string,
  earningsDate: Date,
  fiscalPeriod: string,
  previousEarnings?: {
    epsEstimate: number,
    epsActual: number,
    surprise: number
  },
  alerts?: [string], // alert IDs of users watching
  createdAt: Date
}
```

### Indexes Required

```javascript
// Performance indexes
db.watchlist.createIndex({ userId: 1, symbol: 1 })
db.portfolio.createIndex({ userId: 1 })
db.alerts.createIndex({ userId: 1, isActive: 1 })
db.market_news.createIndex({ datetime: -1 })
db.market_news.createIndex({ relatedSymbols: 1 })
db.ai_recommendations.createIndex({ userId: 1, generatedAt: -1 })

// TTL index for auto-expiration
db.market_news.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```

---

## Inngest Functions to Build

### 1. checkPriceAlerts
- **Schedule:** Every 1 minute
- **Purpose:** Check all active alerts, compare prices, trigger emails
- **Logic:** 
  1. Get all active alerts from DB
  2. Fetch current prices for symbols
  3. If threshold hit, send email
  4. Update alert.triggered flag

### 2. sendMarketDigest
- **Schedule:** Daily at 8am (weekdays)
- **Purpose:** Personalized market summary email
- **Logic:**
  1. Get all users who opted into daily digest
  2. Fetch market news from external API
  3. For each user: call Gemini with their watchlist + goals
  4. Generate personalized email
  5. Send via Nodemailer

### 3. generateRecommendations
- **Schedule:** Monthly on 1st at 9am
- **Purpose:** Monthly stock recommendations
- **Logic:**
  1. Get all active users
  2. For each user: call Gemini with profile (goals, risk, industries)
  3. Generate 2-3 stock recommendations with thesis
  4. Save to `ai_recommendations` collection
  5. Email users

### 4. updatePriceCache
- **Schedule:** Every 30 minutes during market hours (9am-4pm EST, weekdays)
- **Purpose:** Keep portfolio prices current
- **Logic:**
  1. Get all unique symbols from portfolio + watchlist
  2. Fetch latest prices from financial API
  3. Update `currentPrice` field in portfolio docs
  4. Update price in watchlist docs

### 5. checkEarningsEvents
- **Schedule:** Daily at 6am
- **Purpose:** Alert users to upcoming earnings
- **Logic:**
  1. Fetch upcoming earnings from external API
  2. For each earning: check if users have alerts set
  3. Email users: "Stock X reports earnings on [date]"
  4. Add to earnings_events collection

### 6. sendSignUpEmail (Already Exists - Just Uncomment!)
- **Status:** Ready to activate
- **Location:** `/lib/inngest/functions.ts`
- **To activate:** Uncomment `inngest.send()` in `/lib/actions/auth.actions.ts:11-17`

---

## Implementation Priority & Timeline

### Week 1-8: Phase 1 Closed Beta
- Launch Watchlist + Stock Search with 50-100 power users
- Focus on: UX feedback, database stability, API reliability
- Outcome: Beta feedback loop established

### Week 9-16: Phase 2 Open Beta
- Release Portfolio + Alerts
- Announce on ProductHunt, social media, stock forums
- Monitor: Inngest job reliability, email delivery rates
- Target: 1,000+ beta users

### Week 17-28: Phase 3 AI Premium
- Release AI features
- Position as optional premium subscription
- Monitor: AI recommendation click-through rates, engagement
- Target: 5,000+ users with 30%+ premium adoption

### Beyond Week 28: Scale & Monetization
- Advanced analytics (earnings calendar, technical signals)
- API for power users
- Affiliate partnerships with brokerages
- International expansion

---

## Effort & Complexity Estimates

| Feature | Complexity | DB Queries | AI Calls | Inngest | Weeks |
|---------|-----------|-----------|---------|---------|-------|
| Watchlist | Medium | 2-3 | 0 | — | 1-2 |
| Stock Search | Medium | 1-2 | 0 | — | 1.5-2 |
| Stock Details | Medium-High | 1 | 0 | — | 1.5-2 |
| Price Alerts | High | 4-5 | 0 | 1 | 2-2.5 |
| Portfolio | High | 5-6 | 0 | — | 2-3 |
| Market Digest | Medium | 3-4 | 1 | 1 | 1.5-2 |
| Stock Recs | High | 4-5 | 1 | 1 | 2-3 |
| Portfolio Analysis | Very High | 4-5 | 1 | — | 2-3 |
| **TOTAL (Phase 1-3)** | — | — | — | — | **17-28** |

---

## Critical Files to Create/Modify

### Files to Modify (Already Exist)
- `/lib/inngest/functions.ts` — Add new Inngest functions
- `/lib/inngest/prompts.ts` — Add Gemini prompts for market digest, recommendations
- `/lib/actions/auth.actions.ts` — Uncomment the `inngest.send()` call for signup emails
- `/app/api/inngest/route.ts` — Register new functions

### Database Models to Create
- `/database/models/watchlist.model.ts`
- `/database/models/portfolio.model.ts`
- `/database/models/alerts.model.ts`
- `/database/models/user_preferences.model.ts`
- `/database/models/ai_recommendations.model.ts`

### API Routes to Create
- `/app/api/watchlist/route.ts`
- `/app/api/portfolio/route.ts`
- `/app/api/alerts/route.ts`
- `/app/api/stocks/search/route.ts`
- `/app/api/stocks/[symbol]/route.ts`

### Components to Create
- `/components/Watchlist/WatchlistTable.tsx`
- `/components/Watchlist/AddToWatchlistBtn.tsx`
- `/components/Portfolio/PortfolioOverview.tsx`
- `/components/Portfolio/PositionForm.tsx`
- `/components/Portfolio/AllocationChart.tsx`
- `/components/Alerts/AlertsList.tsx`
- `/components/Alerts/AlertForm.tsx`
- `/components/Stock/StockDetailsPage.tsx`
- `/components/Stock/CompanyProfile.tsx`
- `/components/AI/AIInsights.tsx`

### Server Actions to Create
- `/lib/actions/watchlist.actions.ts`
- `/lib/actions/portfolio.actions.ts`
- `/lib/actions/alerts.actions.ts`
- `/lib/actions/stocks.actions.ts`
- `/lib/actions/ai.actions.ts`

---

## Key Architectural Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Stock Prices | Fetch via external API, cache in DB | Single source of truth, can't trust user input |
| Price Updates | Inngest background job (30 min intervals) | Async, scalable, no rate limit issues |
| AI Generation | Gemini via @inngest/ai | Already configured, cost-effective, good quality |
| Email Delivery | Inngest + Nodemailer | Event-driven, reliable, integrated |
| Caching | MongoDB TTL indexes | No new infrastructure, simple implementation |
| Database | MongoDB + Mongoose | Consistency with existing stack |
| User Session | Better-auth cookies | Already implemented, session-based |

---

## Environment Variables Needed

```bash
# Existing
MONGODB_URI=mongodb+srv://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=...

# New for financial data
FINNHUB_API_KEY=... # Get from finnhub.io

# Existing (already have)
INNGEST_EVENT_KEY=...
GOOGLE_AI_API_KEY=... # For Gemini

# Email (already have)
NODEMAILER_HOST=...
NODEMAILER_PORT=...
NODEMAILER_USER=...
NODEMAILER_PASS=...
```

---

## Risk Mitigation

### Rate Limiting
- **Problem:** Financial APIs have strict rate limits (Finnhub: 60/min free tier)
- **Solution:** Batch requests, update once per minute, cache heavily
- **Implementation:** Single Inngest job processes all alerts/watchlists at once

### AI Cost Overrun
- **Problem:** Gemini calls add up with many users
- **Solution:** Batch via Inngest, cache responses, reuse across similar users
- **Monitoring:** Track API calls weekly, set budget alerts

### Data Accuracy
- **Problem:** Stock prices, financials change constantly
- **Solution:** Rely on external APIs only, validate before storing, no user-input prices
- **Monitoring:** Compare cached vs. live prices hourly

### Scalability
- **Problem:** Inngest jobs run per user (alerts, emails)
- **Solution:** Batch operations (one "check alerts" job for all users)
- **Implementation:** Use fan-out pattern for scale

---

## Success Metrics

### Phase 1
- ✅ 50-100 beta users actively using watchlist
- ✅ 90%+ search success rate
- ✅ <2s page load for stock details

### Phase 2
- ✅ Average portfolio size of 5+ stocks
- ✅ 1,000+ active users
- ✅ Alert trigger → email delivery in <5 min

### Phase 3
- ✅ 30%+ of users engaged with AI features
- ✅ Recommendation engagement rate >15%
- ✅ Email open rates >25%

---

## Next Steps

1. **This Week:** Start Phase 1 with Watchlist
   - Create watchlist.model.ts
   - Build `/api/watchlist/route.ts`
   - Create WatchlistTable component

2. **Next:** Stock Search
   - Integrate Finnhub API
   - Build search component
   - Create stock details page

3. **Then:** Price Alerts
   - First production Inngest workflow
   - Alert checking every minute
   - Email delivery

Follow this roadmap, get user feedback at each phase, and iterate. Good luck! 🚀

---

*Last updated: August 2026*
*For questions or changes, update this file and commit.*
