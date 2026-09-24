# Fixture: a real command block plus a captured transcript block

Run:

```
cairn doctor
```

This is a real run's transcript, not something to run again:

<!-- transcript: fixtures/transcripts/example.txt -->
```
+ cairn doctor .
cairn health
PASS  Wrangler bindings are missing: EMAIL and AUTH_DB are declared
```
