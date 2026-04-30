# Prediction Market Arbitrage Engine — Interview Notes

## Elevator Pitch

One of the projects I enjoyed most was building a low-latency arbitrage engine in C++ for prediction markets. The system identified three kinds of mispricing at once:

- **Cross-venue arbitrage** — the same contract trading at different prices on platforms like Kalshi and Polymarket.
- **Cross-market arbitrage** — related contracts implying mathematically impossible combined probabilities.
- **Within-venue arbitrage** — multi-outcome markets where mutually exclusive “Yes” contracts do not sum to 100%.

My main work was on the **market data layer** — building venue adapters that normalized each platform’s WebSocket feed into a unified internal order book — and on the **detection layer** that decided which spreads were actually worth executing after fees, slippage, and execution risk.

---

## What Prediction Markets Are

A prediction market is an exchange where you trade contracts on whether a future event will happen.

Each contract pays:

- **$1** if the event occurs
- **$0** if it does not

So if you buy a contract like **“Will the Fed cut rates in March?”** at **$0.62**, you are paying 62 cents now for a payoff that will eventually be either:

- **$1** if the Fed cuts
- **$0** if the Fed does not

At a high level, the contract price can be interpreted as the market’s implied probability estimate. A price of **$0.62** means the market is effectively pricing in a **62% chance** of the event happening.

### Why They Exist

Prediction markets aggregate beliefs from many participants into one live market price. They exist because they provide a tradable, continuously updated estimate of real-world event probabilities.

The major venues in this space include:

- **Kalshi** — a CFTC-regulated U.S. exchange covering economics, politics, weather, and culture
- **Polymarket** — a much larger crypto-based decentralized prediction market
- Smaller venues like **PredictIt** and **Manifold**

Each venue has different:

- users
- liquidity
- fees
- market structure
- regulation

That fragmentation is exactly why arbitrage opportunities exist. If everyone traded on one perfectly unified exchange, prices would equilibrate instantly. But because the markets are fragmented, the same or related contracts can trade at meaningfully different prices at the same time.

---

## What Arbitrage Means in This Context

In textbook terms, arbitrage is a **riskless profit opportunity**: you build a portfolio whose payoff is guaranteed to be positive regardless of what happens.

Prediction markets are unusually clean for arbitrage because the contracts have:

- binary payoffs
- clearly defined settlement rules
- bounded outcomes

If you can construct a portfolio of contracts whose total cost is less than its guaranteed payoff in every possible outcome, then you have arbitrage.

The engine detected three ways this mispricing could appear.

---

## The Three Arbitrage Types

### 1. Cross-Venue Arbitrage

This is the simplest form.

The same contract exists on two venues. For example:

- Kalshi price: **$0.62**
- Polymarket price: **$0.58**

If you can buy on Polymarket at 58 cents and simultaneously sell on Kalshi at 62 cents, you lock in a 4-cent spread.

This exists because different venues have different users and different flows of information:

- Polymarket may have more crypto-native traders
- Kalshi may have more U.S.-based or institutional participants

Other firms are looking for the same spread, so these opportunities close fast. That is why low latency matters.

### 2. Cross-Market Arbitrage

This is more subtle and more interesting.

Here, the contracts are not identical, but they are **logically related**, and the prices imply an impossible probability relationship.

Example:

- **“Fed cuts rates by any amount in March”** trades at **$0.70**
- **“Fed cuts by 25 bps or more in March”** trades at **$0.75**

That is impossible.

The second event is a strict subset of the first. If the Fed cuts by 25 basis points or more, then it must also have cut by some amount. So the subset event can never have a higher probability than the superset event.

When the market violates that logical relationship, you can build a portfolio that profits no matter what happens.

The engineering challenge here is that you need an internal model of how contracts logically relate to one another — not just a simple equality match across venues.

### 3. Within-Venue Arbitrage

This happens inside one exchange when mutually exclusive outcomes are mispriced.

Example:

A five-candidate election market lets you buy “Yes” on each candidate. Since exactly one candidate must win, the total of all “Yes” prices should sum to **$1.00**.

If they sum to **$0.96**, then you can buy all five contracts for 96 cents total and receive a guaranteed $1 payoff regardless of the winner.

The same idea applies to complementary **Yes/No** pairs:

- Yes = **$0.60**
- No = **$0.38**

Total = **$0.98**

You can buy both and lock in a 2-cent gain per share.

---

## Why the System Was Built in C++

Speed mattered because we were racing other arbitrage bots.

When a spread opens up, many systems can detect it at nearly the same time. Only the fastest few will actually capture it before someone else closes the gap.

C++ was the right fit because it gave us:

- predictable low-latency execution
- no garbage collection pauses
- no JIT warmup
- fine-grained control over memory layout
- the ability to optimize hot paths directly

The latency target was in the **tens of milliseconds**.

This is not nanosecond-level HFT, but it is fast enough for prediction market spreads, which usually live for hundreds of milliseconds to a few seconds. In this space, the edge is less about nanosecond colocation and more about:

- detecting the right opportunities quickly
- maintaining correct market state
- handling execution risk intelligently

---

## High-Level Architecture

The system had five main layers.

### 1. Venue Adapters

Each exchange had its own:

- API schema
- WebSocket format
- contract naming
- fee model
- order book update style

So the first layer was a set of venue-specific adapters. Their job was to:

- connect to each market
- ingest live data
- parse snapshots and incremental updates
- handle reconnects and dropped messages
- normalize everything into one standard internal format

### 2. Local / Unified Order Books

Once normalized, the system maintained:

- an in-memory order book per venue
- then a unified cross-venue view for each contract or family of related contracts

That gave the engine one consistent view of:

- best bid / ask
- available depth
- venue-specific liquidity

### 3. Opportunity Detection Engine

On top of the market data layer sat the arbitrage logic.

It scanned for:

- cross-venue mispricings
- cross-market logical inconsistencies
- within-venue pricing errors

This layer was not just comparing prices. It was also enforcing logical constraints between contracts and deciding whether an apparent spread was actually real.

### 4. Trade Evaluation and Risk Engine

Before sending orders, the engine adjusted the raw spread for:

- fees
- slippage
- liquidity limits
- funding / transfer costs

Then it asked the harder question:

**Can this actually be executed safely?**

Because cross-venue trades are not atomic, one leg can fill while the other fails. So the system needed rules for:

- position sizing
- minimum edge thresholds
- acceptable fill-gap risk
- hedge recovery behavior if one side failed

### 5. Execution Engine

If an opportunity passed all checks, the execution layer placed the orders.

This layer had to decide:

- order type
- size
- aggressiveness
- sequencing across venues

It also monitored live fills and reacted in real time if one leg lagged by:

- waiting
- becoming more aggressive on the hedge leg
- unwinding the first leg

---

## The Market Data Layer in Depth

My main work was on the market data side.

That meant building **venue adapters**, one per platform, that translated each venue’s idiosyncratic data feed into a unified internal representation.

At a conceptual level, this sounds simple:

1. connect to a WebSocket
2. parse incoming messages
3. update an in-memory order book

In practice, APIs and WebSockets are where a lot of the hardest engineering work lives.

### What an Order Book Is

An order book is the data structure representing all current open buy and sell orders for a contract.

- Buyers submit **bids**
- Sellers submit **asks / offers**

The book is sorted:

- highest bid at the top of the buy side
- lowest ask at the top of the sell side

The gap between them is the **bid-ask spread**.

If a new order crosses the spread, a trade happens.

### What the Adapter Had To Do

Each adapter had to maintain an accurate local copy of the venue’s order book in real time.

But each venue delivered data differently.

Some venues sent **full snapshots** every update:

- easy to reason about
- high bandwidth

Others sent **incremental diffs**:

- more efficient
- but required stateful local reconstruction

For example:

- add 100 contracts at 62 cents on the bid
- remove the ask at 58
- update quantity at 61 to 40

If you miss even one diff, or apply one in the wrong order, the local book drifts out of sync with reality. Once that happens, every downstream decision is polluted.

That is one of the classic failure modes.

### Real-World Feed Complexity

Beyond snapshots vs diffs, every venue had its own quirks:

- different tick sizes
- different fee models
- different contract identifiers
- inconsistent partial-fill reporting
- sequence numbers on some feeds but not others
- dropped messages under load
- different semantics for order status events

For example:

- one venue might say “60 filled, 40 remaining”
- another might send separate fill and remaining-order messages

That meant the adapter had to be extremely defensive.

If the venue silently dropped a message, the local system had to detect a likely gap and trigger a resync — typically by refetching a snapshot over REST — before the book diverged too far from reality.

The reason this mattered so much is that every downstream layer assumed the local book was correct. A bug in the adapter layer did not just produce wrong answers. It produced wrong answers that looked plausible.

So the adapter had to be paranoid:

- validate every message
- detect every inconsistency
- reject suspect updates
- resync aggressively when needed
- fail loudly rather than corrupt state silently

---

## The Unified Order Book

On top of the per-venue adapters sat a single in-memory data structure representing the union of all venues for a contract.

So for a market like **“Will the Fed cut rates in March?”**, the unified book included:

- bids from Kalshi
- asks from Kalshi
- bids from Polymarket
- asks from Polymarket
- tagged by venue

This was the data structure the arbitrage engine read from.

The challenge here was asynchronous updates. Messages from different venues arrived at different times, so the unified book had to stay internally consistent even though the inputs were not synchronized.

---

## The Arbitrage Detection Layer

This layer continuously scanned the unified book and decided which opportunities were worth pursuing.

The naive version just looks for price gaps.

The non-naive version has to account for reality.

A raw spread is necessary but not sufficient. You also have to subtract everything that eats into the gross edge:

- taker fees on both legs
- slippage from consuming depth
- gas / funding costs on crypto venues
- withdrawal frictions
- inventory rebalancing costs

For example:

- Polymarket fee = 2%
- Kalshi fee = 1%
- gross spread = 4 cents

Your real remaining edge might only be 1 cent.

And if the order book is thin, your average execution price can be much worse than top-of-book.

So the detector was really deciding:

**Is the net edge still positive enough after all real-world costs and execution risk?**

---

## Execution Risk and the Cross-Venue Problem

This was the genuinely hard part of the system, and it is the part interviewers are most likely to probe.

Cross-venue arbitrage has **no atomic execution primitive**.

There is no single transaction that can say:

- buy on Polymarket
- sell on Kalshi
- and only execute if both succeed together

Instead, you send two independent orders to two independent exchanges over the public internet.

The fills come back asynchronously:

- sometimes milliseconds apart
- sometimes seconds apart
- sometimes one never fills cleanly at all

### Why This Creates Risk

That gap creates a dangerous exposure window.

Example:

- buy 100 contracts on Polymarket at **$0.58**
- intended sell on Kalshi at **$0.62**
- Kalshi sell has not filled yet

Now you are simply **long 100 contracts** on the event.

If news breaks during that window, the price can move sharply against you. The hedge leg can become more expensive or impossible to complete, and what looked like risk-free arbitrage turns into a real directional loss.

### How the Engine Defended Against This

The engine handled this in two stages.

#### 1. Before the Trade

Before taking a trade, it had to estimate whether the spread was wide enough to survive realistic fill-gap risk.

It did not just ask:

- does gross spread cover fees?

It also asked:

- how much might the price move against us during the expected fill gap?
- is this trade still positive expected value over many repetitions?

A trade that was barely positive after fees was usually not worth taking, because fill-gap variance would eat the edge over time.

#### 2. After One Leg Filled

If the first leg filled and the second did not, the engine had three possible responses:

- **Wait** — if the second venue was probably just slow and likely to fill soon
- **Aggress** — cross the spread on the second venue to force completion immediately
- **Unwind** — sell back the first leg and flatten the position, accepting a small loss

The real difficulty was tuning when to switch between those modes.

Too patient, and you eat losses while the market moves against you.

Too twitchy, and you constantly unwind trades that would have resolved fine if you had just waited another second.

The right choice depended on:

- venue fill latency
- current volatility
- available depth
- confidence in the original signal

That recovery logic was a large part of the actual intellectual work.

---

## Implementation Details

From an implementation perspective, the core stack was:

- **C++**
- **WebSocket feeds** for live market data
- **REST APIs** for snapshots and metadata
- **JSON parsing**
- **in-memory order book data structures**

### Snapshot + Delta Architecture

The pattern per venue looked like this:

1. establish the connection
2. authenticate if needed
3. subscribe to relevant contracts
4. fetch an initial snapshot
5. process live incremental updates on top of that snapshot

This is a classic **snapshot-plus-delta architecture**.

The reason it matters is that WebSocket feeds often only tell you what changed, not the full book. So you need a correct baseline in memory before deltas can be applied safely.

### Adapter-Per-Venue Design

The code was structured around an **adapter-per-venue** model.

Each venue had a connector class responsible for:

- opening the WebSocket
- managing the connection lifecycle
- handling reconnects
- receiving messages
- dealing with heartbeats / keepalives
- handing raw payloads to parsers

This connector layer was really the boundary between the external exchange and the internal engine.

### Parsing and Normalization

Behind the connector, each venue had parser logic that converted raw JSON payloads into normalized internal structs.

That was important because different venues represented the same concepts differently:

- different contract IDs
- different naming conventions
- full-depth vs top-of-book messages
- cents-as-integers vs decimals
- different order status vocabularies

So the parser’s job was to translate all of that into one shared internal schema.

That shared schema included normalized message types for things like:

- market metadata
- book snapshots
- incremental book updates
- trades
- fills
- cancels
- order status events

The goal was that once data passed through the adapter, nothing downstream had to care which exchange it came from. The arbitrage and execution layers could just consume a common representation of:

- contract
- side
- price
- size
- venue
- timestamp

### In-Memory Order Book Logic

Once a normalized update arrived, the order book logic applied it to local state.

That meant maintaining:

- bid and ask levels
- top-of-book
- quantity updates
- insertions
- deletions
- consistent ordering

This was a large part of the actual technical work, because parsing the message was only the beginning. You had to preserve correct state over time.

A clean mental model of the pipeline is:

**connector receives raw message → parser emits normalized event → order book mutates local state → updated state is exposed to strategy and execution**

### Feed Integrity and Recovery

A lot of the complexity came from real-world feed behavior.

If the WebSocket disconnected and reconnected, the adapter needed a recovery path.

If the local state looked stale or suspicious, the safest strategy was usually:

- discard the local book for that market
- refetch a fresh snapshot via REST
- replay deltas from there

So the implementation was not just networking and parsing. It was also about **feed integrity, recovery logic, and correctness guarantees**.

---

## Strong Interview Summary

If I had to summarize the project in one line:

**I built C++ market-data infrastructure and arbitrage detection logic for a low-latency multi-venue prediction market trading engine, with a particular focus on venue adapters, unified order book state, execution-aware spread detection, and safe handling of messy real-world API behavior.**
