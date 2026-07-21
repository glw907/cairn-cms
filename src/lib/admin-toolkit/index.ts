// cairn-cms: the `/admin-toolkit` public barrel. The toolkit's own general-purpose components and
// formatters, born in aksailingclub-org's theme layer and graduated here so a site building its own
// admin screens (or cairn's own admin screens) reaches for one shared vocabulary instead of a
// bespoke parallel. Re-expression, not a file copy: each export's contract stays general-purpose,
// never a domain assumption from its first consumer.
export {
  ageFromBirthdate,
  formatCivilDate,
  formatMoney,
  formatTimestamp,
  type FormatCivilDateOptions,
  type FormatMoneyOptions,
  type FormatTimestampOptions,
} from './format.js';
