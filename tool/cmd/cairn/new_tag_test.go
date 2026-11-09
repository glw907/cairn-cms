package main

import (
	"context"
	"strings"
	"testing"
)

// TestNewTagDefaultsToNpmsOwnSetting pins the tag the template is fetched at: --tag wins, then
// npm's tag setting from the environment in either spelling, then latest. The fake registry
// publishes only the dist-tag the run should take, so a fetch at any other tag fails.
func TestNewTagDefaultsToNpmsOwnSetting(t *testing.T) {
	tests := []struct {
		name string
		args []string
		env  map[string]string
		want string
	}{
		{"neither set", nil, nil, "latest"},
		{"lower-case npm setting", nil, map[string]string{"npm_config_tag": "gate"}, "gate"},
		{"upper-case npm setting", nil, map[string]string{"NPM_CONFIG_TAG": "gate"}, "gate"},
		{"flag beats both", []string{"--tag", "latest"}, map[string]string{"npm_config_tag": "gate", "NPM_CONFIG_TAG": "gate"}, "latest"},
		{"flag beats the setting", []string{"--tag", "next"}, map[string]string{"npm_config_tag": "gate"}, "next"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d := mustDeps(t)
			d.env = fakeEnv(tt.env)
			d.transport = routeRoundTripper{"/@glw907/cairn-cms": {status: 200, body: []byte(
				`{"dist-tags":{"` + tt.want + `":"9.9.9"},"versions":{}}`)}}
			cmd := newNewCmd(d, &rootFlags{})
			if err := cmd.ParseFlags(tt.args); err != nil {
				t.Fatalf("ParseFlags: %v", err)
			}
			flag, _ := cmd.Flags().GetString("tag")
			tag := newTag(cmd, flag, d.env)
			if tag != tt.want {
				t.Fatalf("tag = %q, want %q", tag, tt.want)
			}
			_, err := tagFetch(d, tag)(context.Background())
			if err == nil || strings.Contains(err.Error(), "no dist-tag") {
				t.Errorf("fetch at %q = %v, want it to find the dist-tag", tag, err)
			}
		})
	}
}
