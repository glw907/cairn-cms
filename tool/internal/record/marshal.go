package record

import (
	"bytes"
	"encoding/json"
	"fmt"
)

// Marshal emits the record as two-space-indented JSON with a trailing
// newline and no HTML escaping. A key Parse observed is emitted in the
// position Parse observed it. A Record with no observed order, because it
// was built directly rather than by Parse, emits every typed field first,
// in table order, followed by Extra. Either way, an Extra entry whose key
// was never observed is appended last.
func (r Record) Marshal() ([]byte, error) {
	keys, values, err := orderedFields(r.order, recordFields, r, r.Extra)
	if err != nil {
		return nil, fmt.Errorf("record: marshal: %w", err)
	}
	var compact bytes.Buffer
	if err := writeObject(&compact, keys, values); err != nil {
		return nil, fmt.Errorf("record: marshal: %w", err)
	}
	var pretty bytes.Buffer
	if err := json.Indent(&pretty, compact.Bytes(), "", "  "); err != nil {
		return nil, fmt.Errorf("record: marshal: %w", err)
	}
	pretty.WriteByte('\n')
	return pretty.Bytes(), nil
}

// orderedFields replays observedOrder against fields and extra, then appends any field key
// observedOrder never named whose current value is non-zero (a field a caller set after Parse, on
// a record whose source document never carried that key), in fields' own order, and finally any
// extra entry neither observedOrder nor that append step named. A key observedOrder names that is
// neither in fields nor present in extra was removed from the record after Parse and is dropped
// rather than re-emitted with a stale value. A nil observedOrder means the value was built
// directly rather than by Parse, so fields' own key order stands in for it.
func orderedFields[T any](observedOrder []string, fields []field[T], t T, extra []ExtraField) ([]string, []json.RawMessage, error) {
	replayOrder := observedOrder
	if replayOrder == nil {
		replayOrder = keysOf(fields)
	}
	fm := fieldMap(fields)

	extraByKey := make(map[string]json.RawMessage, len(extra))
	for _, e := range extra {
		extraByKey[e.Key] = e.Value
	}

	seen := make(map[string]bool, len(replayOrder)+len(fields)+len(extra))
	var keys []string
	var values []json.RawMessage
	emit := func(key string, raw json.RawMessage) {
		seen[key] = true
		keys = append(keys, key)
		values = append(values, raw)
	}

	for _, key := range replayOrder {
		if seen[key] {
			continue
		}
		if f, ok := fm[key]; ok {
			raw, err := f.marshal(t)
			if err != nil {
				return nil, nil, fmt.Errorf("field %q: %w", key, err)
			}
			emit(key, raw)
			continue
		}
		if raw, ok := extraByKey[key]; ok {
			emit(key, raw)
		}
	}
	for _, f := range fields {
		if seen[f.key] || !f.nonZero(t) {
			continue
		}
		raw, err := f.marshal(t)
		if err != nil {
			return nil, nil, fmt.Errorf("field %q: %w", f.key, err)
		}
		emit(f.key, raw)
	}
	for _, e := range extra {
		if seen[e.Key] {
			continue
		}
		emit(e.Key, e.Value)
	}
	return keys, values, nil
}

// marshalObject orders a nested object's fields with orderedFields and
// encodes the result as a compact JSON object.
func marshalObject[T any](observedOrder []string, fields []field[T], t T, extra []ExtraField) (json.RawMessage, error) {
	keys, values, err := orderedFields(observedOrder, fields, t, extra)
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	if err := writeObject(&buf, keys, values); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// rawOf encodes v as JSON with HTML escaping disabled, matching the byte
// contract JSON.stringify(data, null, 2) sets for a Node-written record.
func rawOf(v any) (json.RawMessage, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return nil, err
	}
	return bytes.TrimRight(buf.Bytes(), "\n"), nil
}

// writeObject appends a compact JSON object built from keys and values, in
// order, to buf.
func writeObject(buf *bytes.Buffer, keys []string, values []json.RawMessage) error {
	buf.WriteByte('{')
	for i, key := range keys {
		if i > 0 {
			buf.WriteByte(',')
		}
		keyRaw, err := rawOf(key)
		if err != nil {
			return err
		}
		buf.Write(keyRaw)
		buf.WriteByte(':')
		buf.Write(values[i])
	}
	buf.WriteByte('}')
	return nil
}
