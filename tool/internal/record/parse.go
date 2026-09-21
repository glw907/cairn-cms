package record

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
)

// Parse reads a site record, recording the key order it observed at every
// level so Marshal can reproduce it. A key Parse does not recognize, at any
// level, is kept as an ExtraField rather than decoded. Parse has no switch
// over key names of its own: recordFields is the only place a key becomes
// recognized, so a key the field table does not name can never reach a
// typed field, and a key it does name can never be missing from Marshal's
// own table, closing the gap where Pass A's guard could miss a key added
// to a switch alone.
func Parse(data []byte) (Record, error) {
	r, err := parseObject[Record](data, recordFields)
	if err != nil {
		return Record{}, fmt.Errorf("record: parse: %w", err)
	}
	return r, nil
}

// parseObject decodes data as a JSON object into a value of type T, using fields as the single
// source of which keys are recognized: a key fields names is decoded through that field's parse
// function, and any other key is captured as an ExtraField, in the order Parse observed them. PT
// constrains *T to satisfy ordered, so parseObject can record the observed order and append Extra
// without every typed object repeating that bookkeeping.
func parseObject[T any, PT interface {
	*T
	ordered
}](data []byte, fields []field[T]) (T, error) {
	var zero T
	order, values, err := decodeObject(data)
	if err != nil {
		return zero, err
	}

	var t T
	PT(&t).setOrder(order)
	fm := fieldMap(fields)
	for _, key := range order {
		raw := values[key]
		f, ok := fm[key]
		if !ok {
			PT(&t).addExtra(ExtraField{Key: key, Value: raw})
			continue
		}
		if err := f.parse(&t, raw); err != nil {
			return zero, fmt.Errorf("field %q: %w", key, err)
		}
	}
	return t, nil
}

// decodeObject walks a JSON object's top-level keys in document order,
// returning the order alongside each key's raw value. A nested object's own
// keys are left encoded in its raw value, for the caller to walk in turn.
func decodeObject(data []byte) ([]string, map[string]json.RawMessage, error) {
	dec := json.NewDecoder(bytes.NewReader(data))
	tok, err := dec.Token()
	if err != nil {
		return nil, nil, err
	}
	if delim, ok := tok.(json.Delim); !ok || delim != '{' {
		return nil, nil, fmt.Errorf("record: expected a JSON object, got %v", tok)
	}

	// Non-nil on purpose, at every nesting level: a nil order is Marshal's
	// "never parsed" sentinel, so a parsed-but-empty object must come back
	// with an empty order rather than a nil one, or Marshal would replay the
	// struct's own field order over it and break the byte-for-byte round trip.
	order := []string{}
	values := make(map[string]json.RawMessage)
	for dec.More() {
		keyTok, err := dec.Token()
		if err != nil {
			return nil, nil, err
		}
		key, ok := keyTok.(string)
		if !ok {
			return nil, nil, fmt.Errorf("record: expected a string key, got %v", keyTok)
		}
		var raw json.RawMessage
		if err := dec.Decode(&raw); err != nil {
			return nil, nil, fmt.Errorf("record: field %q: %w", key, err)
		}
		if _, dup := values[key]; !dup {
			order = append(order, key)
		}
		values[key] = raw
	}
	if _, err := dec.Token(); err != nil {
		return nil, nil, err
	}
	if tok, err := dec.Token(); err != io.EOF {
		if err == nil {
			return nil, nil, fmt.Errorf("record: trailing data after the closing brace: %v", tok)
		}
		return nil, nil, fmt.Errorf("record: trailing data after the closing brace: %w", err)
	}
	return order, values, nil
}
