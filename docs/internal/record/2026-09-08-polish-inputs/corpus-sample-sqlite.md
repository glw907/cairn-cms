SQLite is not directly comparable to client/server SQL database engines such as MySQL, Oracle, PostgreSQL, or SQL Server since SQLite is trying to solve a different problem. Client/server SQL database engines strive to implement a shared repository of enterprise data. They emphasize scalability, concurrency, centralization, and control. SQLite strives to provide local data storage for individual applications and devices. Because this problem results from bugs in the underlying filesystem implementation, there is nothing SQLite can do to prevent it. A good rule of thumb is to avoid using SQLite in situations where the same database will be accessed directly (without an intervening application server) and simultaneously from many computers over a network.

## Source

SQLite, Appropriate Uses For SQLite, https://www.sqlite.org/whentouse.html, public domain,
fetched 2026-09-08 by the round-2 comparison. A proposed corpus entry, not yet approved. The
paragraph above is the excerpt the proposal's receipt measures against; measure it with
`--until "## Source"`.
