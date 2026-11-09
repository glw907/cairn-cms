// Browser is the end-to-end harness's BROWSER: it walks a setup run's tab the way an owner who
// approves everything would, with no display and no JavaScript.
//
// Usage:
//
//	browser <url>
//
// It loads url and follows every redirect, through the faked dash.cloudflare.com and github.com
// when the harness's proxy is in the environment, holding cookies the way a browser does. On each
// page it acts on the first of these it finds: a form, which it submits with its hidden inputs;
// a button link, which it follows; the done page's poll of /next, which it repeats until /next
// names the next URL; and a meta refresh, which it reloads after the delay. A page with none of
// these ends the walk. It reads only cairn's tab pages and the pages a test's fakes serve,
// whose markup the harness controls, so a pattern match stands in for an HTML parser.
//
// Each request goes to the file CAIRN_E2E_BROWSER_LOG names, one "<method> <url>" line each,
// and a failed walk ends there with an "error: " line and exit status 1.
package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"
)

var (
	formRe    = regexp.MustCompile(`(?s)<form\b[^>]*\baction="([^"]*)"[^>]*>(.*?)</form>`)
	inputRe   = regexp.MustCompile(`<input\b[^>]*\bname="([^"]*)"[^>]*\bvalue="([^"]*)"`)
	buttonRe  = regexp.MustCompile(`<a\b[^>]*\bclass="button"[^>]*\bhref="([^"]*)"`)
	refreshRe = regexp.MustCompile(`<meta\b[^>]*\bhttp-equiv="refresh"[^>]*\bcontent="(\d+)"`)
)

// nextPoll is how the done page asks the tab what to open next.
const nextPoll = "fetch('/next'"

func main() {
	log := os.Getenv("CAIRN_E2E_BROWSER_LOG")
	if len(os.Args) != 2 || log == "" {
		fmt.Fprintln(os.Stderr, "usage: browser <url>, with CAIRN_E2E_BROWSER_LOG set")
		os.Exit(2)
	}
	w, err := newWalker(log)
	if err == nil {
		err = w.walk(os.Args[1])
		if err != nil {
			w.note("error: " + err.Error())
		}
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, "browser:", err)
		os.Exit(1)
	}
}

type walker struct {
	client *http.Client
	log    *os.File
}

func newWalker(path string) (*walker, error) {
	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return nil, err
	}
	jar, err := cookiejar.New(nil)
	if err != nil {
		return nil, err
	}
	w := &walker{log: f}
	w.client = &http.Client{
		Jar:     jar,
		Timeout: 30 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 10 {
				return errors.New("stopped after 10 redirects")
			}
			w.note(req.Method + " " + req.URL.String())
			return nil
		},
	}
	return w, nil
}

func (w *walker) note(line string) {
	_, _ = fmt.Fprintln(w.log, line)
}

// walk loads start and acts on each page until one offers nothing to do.
func (w *walker) walk(start string) error {
	page, body, err := w.load(http.MethodGet, start, nil)
	for err == nil {
		var next *url.URL
		var form url.Values
		switch {
		case formRe.MatchString(body):
			m := formRe.FindStringSubmatch(body)
			next, err = page.Parse(html.UnescapeString(m[1]))
			form = url.Values{}
			for _, in := range inputRe.FindAllStringSubmatch(m[2], -1) {
				form.Add(html.UnescapeString(in[1]), html.UnescapeString(in[2]))
			}
		case buttonRe.MatchString(body):
			next, err = page.Parse(html.UnescapeString(buttonRe.FindStringSubmatch(body)[1]))
		case strings.Contains(body, nextPoll):
			next, err = w.pollNext(page)
		case refreshRe.MatchString(body):
			delay, _ := strconv.Atoi(refreshRe.FindStringSubmatch(body)[1])
			time.Sleep(time.Duration(delay) * time.Second)
			next = page
		default:
			return nil
		}
		if err != nil {
			return err
		}
		if form != nil {
			page, body, err = w.load(http.MethodPost, next.String(), form)
		} else {
			page, body, err = w.load(http.MethodGet, next.String(), nil)
		}
	}
	return err
}

// load requests target, following redirects, and returns the final URL and its body. A status
// other than 200 ends the walk.
func (w *walker) load(method, target string, form url.Values) (*url.URL, string, error) {
	w.note(method + " " + target)
	var resp *http.Response
	var err error
	if form != nil {
		resp, err = w.client.PostForm(target, form)
	} else {
		resp, err = w.client.Get(target)
	}
	if err != nil {
		return nil, "", err
	}
	defer func() { _ = resp.Body.Close() }()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, "", err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("%s %s answered %d", method, resp.Request.URL, resp.StatusCode)
	}
	return resp.Request.URL, string(body), nil
}

// pollNext asks page's /next every two seconds, as the done page does, until it answers 200
// with the URL to open.
func (w *walker) pollNext(page *url.URL) (*url.URL, error) {
	next, err := page.Parse("/next")
	if err != nil {
		return nil, err
	}
	for {
		w.note("GET " + next.String())
		resp, err := w.client.Get(next.String())
		if err != nil {
			return nil, err
		}
		var answer struct {
			URL string `json:"url"`
		}
		status := resp.StatusCode
		if status == http.StatusOK {
			err = json.NewDecoder(resp.Body).Decode(&answer)
		}
		_ = resp.Body.Close()
		switch {
		case err != nil:
			return nil, fmt.Errorf("read /next: %w", err)
		case status == http.StatusOK:
			return page.Parse(answer.URL)
		case status != http.StatusNoContent:
			return nil, fmt.Errorf("/next answered %d", status)
		}
		time.Sleep(2 * time.Second)
	}
}
