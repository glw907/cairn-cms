#!/usr/bin/env python3
"""Record one command's output on a pseudo-terminal pinned to 100 columns by 40 rows.

Usage: python3 -I ptycapture.py [--answer 'PROMPT=REPLY']... OUT -- COMMAND [ARG...]

The pty bytes go to OUT unmodified, so a fixture holds what a reader's terminal received. Util-linux
`script -q` is not a substitute: it still writes its start and done banners into the log. Each
`--answer` waits for PROMPT to appear in the output, then sends REPLY and a carriage return, so a
slow step delays the next answer instead of desynchronising the run. Progress goes to stderr.
Exits with the command's status.
"""

import argparse
import fcntl
import os
import pty
import select
import struct
import sys
import termios

COLS, ROWS = 100, 40


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--answer", action="append", default=[], metavar="PROMPT=REPLY")
    parser.add_argument("out")
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command[1:] if args.command[:1] == ["--"] else args.command
    if not command:
        parser.error("no command given")
    answers = [tuple(a.split("=", 1)) for a in args.answer]

    pid, fd = pty.fork()
    if pid == 0:
        os.execvp(command[0], command)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", ROWS, COLS, 0, 0))

    seen = b""
    with open(args.out, "wb") as out:
        while True:
            ready, _, _ = select.select([fd], [], [], 1.0)
            if not ready:
                continue
            try:
                chunk = os.read(fd, 4096)
            except OSError:
                break
            if not chunk:
                break
            out.write(chunk)
            out.flush()
            seen += chunk
            while answers and answers[0][0].encode() in seen:
                prompt, reply = answers.pop(0)
                print(f"matched {prompt!r}", file=sys.stderr)
                os.write(fd, reply.encode() + b"\r")
                seen = seen[seen.index(prompt.encode()) + len(prompt) :]
    _, status = os.waitpid(pid, 0)
    return os.waitstatus_to_exitcode(status)


if __name__ == "__main__":
    sys.exit(main())
