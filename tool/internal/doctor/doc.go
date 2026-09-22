// Package doctor is the record-less, credential-less directory preflight cairn doctor runs: it
// examines a candidate site directory on disk directly, rather than a registered site record,
// and it holds no Cloudflare or GitHub client, distinct from internal/health, which measures a
// record's own site through both. A doctor Check is a pure function over one Snapshot; the
// command layer gathers every input a check might need, network and clock included, before any
// check runs.
package doctor
