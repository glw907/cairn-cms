// Command mangen writes cairn's man pages with cobra's own doc generator
// (github.com/spf13/cobra/doc). It is a second command, never a package cmd/cairn imports from
// or is imported by, because Go forbids importing a package main: cmd/cairn cannot hand this
// command a live *cobra.Command, so mangen rebuilds one from the real binary's own --help text,
// the same workaround cmd/copylist already uses for cmd/cairn's messages table, ported from a
// source parse to a text harvest because a man page's content (the agents page most of all) is
// prose too long to duplicate safely as a second literal.
//
// Rebuilding from --help text also means the generated pages can never drift structurally from
// the shipped binary: whatever cairn prints is what a page describes, discovered fresh on every
// run rather than read from a static definition. `make man` runs this against the tree it just
// built; main_test.go runs it the same way and asserts the result.
package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/spf13/cobra"
	"github.com/spf13/cobra/doc"
)

// rootShort is cairn's own Short line. It is the one field this command cannot harvest: a root
// command's --help output carries its Long alone, since nothing lists a root's own Short the way
// a parent's listing names each child's. TestRootShortMatchesMessagesSource pins it against
// cmd/cairn/messages.go's own shortRoot constant so the two cannot drift unnoticed.
const rootShort = "Operate a cairn-cms production site"

// skipRecursion is cobra's own generated command trees, whose children this command has no
// grammar interest in enumerating: their own man pages still get generated as leaves.
var skipRecursion = map[string]bool{"completion": true, "help": true}

// flagLinePattern matches one flag's own line under a "Flags:" block: an optional
// "-x, " shorthand, "--name", an optional type placeholder pflag prints for a non-bool flag
// (one word, a single space before it and two or more before the description that follows), and
// the usage text itself, which sometimes carries a trailing "(default ...)" pflag appended.
// The placeholder is captured rather than discarded: it is the only statement of a flag's type
// the harvest gets, and a page that documents --quiet as taking a string misstates the CLI.
var flagLinePattern = regexp.MustCompile(`^\s+(?:-(\w), )?--([a-zA-Z][a-zA-Z0-9-]*)(?: ([a-zA-Z]+))?\s{2,}(.*)$`)

// angleEscaper escapes "<" and ">" before a harvested string reaches cobra/doc: its man renderer
// pipes every field through a Markdown parser, which reads an unescaped "<site>" as an HTML tag
// and drops it silently. cairn's own --help text uses angle brackets for a placeholder
// (health's "<site>", the ack flag's "<check-id>=<YYYY-MM-DD>"), so every harvested field that
// reaches a Command needs this before construction, not only the ones this file happens to quote.
var angleEscaper = strings.NewReplacer("<", `\<`, ">", `\>`)

// listLinePattern matches one entry under a command-listing block ("Site commands:", "Other
// commands:", "Additional help topics:", ...): a name column, then two or more spaces, then its
// Short. The name column is non-greedy up to the first such gap because "Additional help
// topics:" prints a topic's full CommandPath ("cairn agents"), not its bare Name; the caller
// takes the column's last whitespace-separated token as the name either way.
var listLinePattern = regexp.MustCompile(`^\s*(.+?)\s{2,}(.*)$`)

// listedName returns column's own command name, the last of its whitespace-separated tokens:
// bare for a regular listing entry ("adopt"), and just the leaf for a topic's full CommandPath
// ("cairn agents" -> "agents").
func listedName(column string) string {
	fields := strings.Fields(column)
	if len(fields) == 0 {
		return column
	}
	return fields[len(fields)-1]
}

// flagDef is one flag harvested from a "Flags:" block.
type flagDef struct {
	shorthand string
	name      string
	// valueType is pflag's own type placeholder, empty for a bool, which prints none.
	valueType string
	usage     string
}

// register declares f on cmd's persistent flags in the type pflag's own placeholder names, so a
// generated page prints a switch as a switch and a duration as a duration. An unrecognised
// placeholder falls to a string flag, which is how pflag prints any type it has no short name
// for and the shape that misstates the least.
func (f flagDef) register(cmd *cobra.Command, usage string) {
	flags := cmd.PersistentFlags()
	switch f.valueType {
	case "":
		flags.BoolP(f.name, f.shorthand, false, usage)
	case "duration":
		flags.DurationP(f.name, f.shorthand, 0, usage)
	case "int":
		flags.IntP(f.name, f.shorthand, 0, usage)
	case "stringArray":
		flags.StringArrayP(f.name, f.shorthand, nil, usage)
	default:
		flags.StringP(f.name, f.shorthand, "", usage)
	}
}

// child is one entry from a command-listing block: a subcommand's own name and Short, harvested
// from its parent's --help rather than its own, since a command's own --help prints its Long,
// never its Short.
type child struct {
	name  string
	short string
}

// node is one command harvested from the real binary's own --help output.
type node struct {
	path    []string
	short   string
	long    string
	use     string // the Use line's own tail: past "cairn <path...> ", with the [flags]/[command] suffixes stripped
	example string
	flags   []flagDef
	kids    []child
}

// name returns the node's own command name: cairn for the root, the path's last element
// otherwise.
func (n node) name() string {
	if len(n.path) == 0 {
		return "cairn"
	}
	return n.path[len(n.path)-1]
}

// discover runs bin at path (empty for root) and parses its --help text into a node.
func discover(bin string, path []string, short string) (node, error) {
	args := append(append([]string{}, path...), "--help")
	out, err := exec.Command(bin, args...).CombinedOutput()
	if err != nil {
		return node{}, fmt.Errorf("%s: %w: %s", strings.Join(args, " "), err, out)
	}

	n := node{path: path, short: short}
	text := string(out)

	usageAt := strings.Index(text, "\nUsage:\n")
	if usageAt < 0 {
		// No Usage: block means a help topic (cairn agents): the whole output is its Long, and
		// it carries no flags, no example, and no children.
		n.long = strings.TrimSpace(text)
		return n, nil
	}
	n.long = strings.TrimSpace(text[:usageAt])

	for block := range strings.SplitSeq(text[usageAt+1:], "\n\n") {
		lines := strings.Split(strings.TrimRight(block, "\n"), "\n")
		if len(lines) == 0 || lines[0] == "" {
			continue
		}
		header := strings.TrimSpace(lines[0])
		body := lines
		if strings.HasSuffix(header, ":") {
			body = lines[1:]
		}

		switch {
		case header == "Usage:":
			n.use = useTail(body, path)
		case header == "Examples:":
			n.example = strings.Join(body, "\n")
		case header == "Flags:":
			for _, line := range body {
				if m := flagLinePattern.FindStringSubmatch(line); m != nil {
					n.flags = append(n.flags, flagDef{
						shorthand: m[1], name: m[2], valueType: m[3], usage: strings.TrimSpace(m[4]),
					})
				}
			}
		case header == "Global Flags:":
			// Inherited from a parent this reconstruction already gave PersistentFlags to;
			// re-adding them here would double-register the same name.
		case strings.HasSuffix(strings.ToLower(header), "commands:") || header == "Additional help topics:":
			for _, line := range body {
				if m := listLinePattern.FindStringSubmatch(line); m != nil {
					n.kids = append(n.kids, child{name: listedName(m[1]), short: m[2]})
				}
			}
		}
	}

	return n, nil
}

// useTail returns cobra's own UseLine tail for a command at path, from the harvested "Usage:"
// block's first line (the bare form, "cairn <path...> [<args>] [flags]"). Stripping the leading
// "cairn <path...> " and the trailing "[flags]"/"[command]" cobra's own UseLine adds back is what
// lets the reconstructed Command's Use round-trip through UseLine() unchanged: setting Use to the
// full harvested line would double both.
func useTail(usageLines []string, path []string) string {
	if len(usageLines) == 0 {
		return ""
	}
	line := strings.TrimSpace(usageLines[0])
	prefix := "cairn"
	if len(path) > 0 {
		prefix += " " + strings.Join(path, " ")
	}
	line = strings.TrimPrefix(line, prefix)
	line = strings.TrimSpace(line)
	line = strings.TrimSuffix(line, "[flags]")
	line = strings.TrimSuffix(line, "[command]")
	name := "cairn"
	if len(path) > 0 {
		name = path[len(path)-1]
	}
	return strings.TrimSpace(name + " " + strings.TrimSpace(line))
}

// build walks path recursively over bin, returning every discovered node keyed by its own dashed
// CommandPath ("cairn-auth-set"), plus a slice of the same keys in discovery order.
func build(bin string, path []string, short string, into map[string]node, order *[]string) error {
	n, err := discover(bin, path, short)
	if err != nil {
		return err
	}
	key := dashed(path)
	into[key] = n
	*order = append(*order, key)

	if len(path) > 0 && skipRecursion[path[len(path)-1]] {
		return nil
	}
	for _, k := range n.kids {
		if err := build(bin, append(append([]string{}, path...), k.name), k.short, into, order); err != nil {
			return err
		}
	}
	return nil
}

// dashed renders path the way cobra's own GenManTree names a file: the command path, spaces
// replaced with dashes, "cairn" alone for the root.
func dashed(path []string) string {
	if len(path) == 0 {
		return "cairn"
	}
	return "cairn-" + strings.Join(path, "-")
}

// buildTree turns every discovered node into a live *cobra.Command tree, wired the same way the
// real one is: PersistentFlags on the node that owns them, so a descendant inherits them the same
// way cairn's own does, and a no-op RunE on every command except the root's own bare help path
// and the agents topic, so cobra's Runnable()/IsAdditionalHelpTopicCommand() classify each node
// the way the real tree does.
func buildTree(nodes map[string]node, order []string) *cobra.Command {
	commands := map[string]*cobra.Command{}

	for _, key := range order {
		n := nodes[key]
		use := n.use
		if use == "" {
			// A topic's own Use still has to carry its bare name: cobra derives Name() (and
			// so every Find/AddCommand lookup) from Use's first word, and an empty Use makes
			// the command unreachable by name even though it still renders.
			use = n.name()
		}
		cmd := &cobra.Command{
			Use:     angleEscaper.Replace(use),
			Short:   angleEscaper.Replace(n.short),
			Long:    angleEscaper.Replace(n.long),
			Example: angleEscaper.Replace(n.example),
		}
		if len(n.path) == 0 {
			cmd.Use = "cairn"
			cmd.Short = rootShort
		}
		// A topic (no Usage: block, so no flags, no example, and no children) is left with no
		// RunE, matching cairn's own agents command: cobra's IsAdditionalHelpTopicCommand()
		// then reports true, and GenManTree skips generating its page on its own, the same
		// behaviour the real binary's tree has for it.
		if n.use != "" || len(n.kids) > 0 {
			cmd.RunE = func(*cobra.Command, []string) error { return nil }
		}
		for _, f := range n.flags {
			if f.name == "help" {
				continue
			}
			f.register(cmd, angleEscaper.Replace(f.usage))
		}
		commands[key] = cmd

		if len(n.path) == 0 {
			continue
		}
		parentKey := dashed(n.path[:len(n.path)-1])
		commands[parentKey].AddCommand(cmd)
	}

	return commands[dashed(nil)]
}

// run harvests cairn's own command tree from bin and writes every non-hidden command's man page
// to dir.
func run(bin, dir string) error {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("create %s: %w", dir, err)
	}

	nodes := map[string]node{}
	var order []string
	if err := build(bin, nil, rootShort, nodes, &order); err != nil {
		return err
	}
	root := buildTree(nodes, order)

	now := time.Now()
	header := &doc.GenManHeader{
		Title:   "CAIRN",
		Section: "1",
		Source:  "cairn",
		Manual:  "cairn Manual",
		Date:    &now,
	}
	if err := doc.GenManTree(root, header, dir); err != nil {
		return fmt.Errorf("generate man tree: %w", err)
	}

	// GenManTree skips every additional-help-topic command by design (it prints no usage or
	// flags to document), which drops cairn's own agents page: its whole point is being reached
	// through cairn help agents rather than through a subcommand's own flags. Its page is
	// generated here, directly, so an operator's man(1) still finds it.
	if agents, _, err := root.Find([]string{"agents"}); err == nil {
		if err := writeAgentsPage(agents, header, dir); err != nil {
			return err
		}
	}

	return nil
}

// writeAgentsPage renders agents' own man page directly, the one command GenManTree's own walk
// skips (see run's own comment).
func writeAgentsPage(agents *cobra.Command, header *doc.GenManHeader, dir string) error {
	f, err := os.Create(filepath.Join(dir, "cairn-agents.1"))
	if err != nil {
		return fmt.Errorf("create cairn-agents.1: %w", err)
	}
	defer func() { _ = f.Close() }()

	headerCopy := *header
	if err := doc.GenMan(agents, &headerCopy, f); err != nil {
		return fmt.Errorf("generate cairn-agents.1: %w", err)
	}
	return nil
}

func main() {
	dir := "man"
	if len(os.Args) > 1 {
		dir = os.Args[1]
	}

	bin, cleanup, err := buildCairn()
	if err != nil {
		fmt.Fprintln(os.Stderr, "mangen:", err)
		os.Exit(1)
	}
	defer cleanup()

	if err := run(bin, dir); err != nil {
		fmt.Fprintln(os.Stderr, "mangen:", err)
		os.Exit(1)
	}
}

// buildCairn compiles the real cairn binary into a fresh temp directory, so the harvested tree
// always describes the code at HEAD rather than a stale build a caller happened to leave lying
// around, and returns a cleanup function that removes it.
func buildCairn() (bin string, cleanup func(), err error) {
	tmp, err := os.MkdirTemp("", "mangen")
	if err != nil {
		return "", nil, fmt.Errorf("create temp dir: %w", err)
	}
	cleanup = func() { _ = os.RemoveAll(tmp) }

	bin = filepath.Join(tmp, "cairn")
	build := exec.Command("go", "build", "-o", bin, "./cmd/cairn")
	build.Dir = moduleRoot()
	if out, err := build.CombinedOutput(); err != nil {
		cleanup()
		return "", nil, fmt.Errorf("go build: %w: %s", err, out)
	}
	return bin, cleanup, nil
}

// moduleRoot resolves this module's own root, one directory above cmd/mangen, so buildCairn
// works whether it is run as `go run ./cmd/mangen` from tool/ (the Makefile's own cwd) or as
// `go test ./cmd/mangen` from cmd/mangen itself.
func moduleRoot() string {
	wd, err := os.Getwd()
	if err != nil {
		return "."
	}
	if filepath.Base(wd) == "mangen" {
		return filepath.Join(wd, "..", "..")
	}
	return wd
}
