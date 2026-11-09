package loopback

import (
	"errors"
	"time"
)

// ChainLimit is how long the owner has for the approvals, from the moment the tab first brings
// the key until done.html is shown.
const ChainLimit = 30 * time.Minute

// CountdownFrom is how far into the chain the views start showing the time left.
const CountdownFrom = 25 * time.Minute

// ErrChainTimeout reports that the approvals passed ChainLimit. The server then answers the root
// with 410 and a page that says setup stopped, and every other path with 404. Arm refuses, and
// Expired is closed, but the port stays bound until Close.
var ErrChainTimeout = errors.New("approvals passed the 30-minute limit")

// startClock starts the chain's clock when the key is spent. The caller holds s.mu.
func (s *Server) startClock() {
	s.started = s.cfg.Now()
	limit := s.cfg.After(ChainLimit)
	go func() {
		select {
		case <-limit:
			s.expire()
		case <-s.stopClock:
		case <-s.closed:
		}
	}()
}

func (s *Server) expire() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.clockStopped || s.isExpired() {
		return
	}
	for _, a := range s.routes {
		a.open = false
	}
	close(s.expired)
}

func (s *Server) isExpired() bool {
	select {
	case <-s.expired:
		return true
	default:
		return false
	}
}

// Expired is closed when the chain passes ChainLimit. It never closes once done.html is shown.
func (s *Server) Expired() <-chan struct{} {
	return s.expired
}

// Countdown reports the time left in the chain and whether the views should show it, which is
// from CountdownFrom until the limit. Before the tab opens, after done.html, and after the stop,
// it reports false.
func (s *Server) Countdown() (left time.Duration, show bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.started.IsZero() || s.clockStopped || s.isExpired() {
		return 0, false
	}
	elapsed := s.cfg.Now().Sub(s.started)
	if elapsed < CountdownFrom {
		return 0, false
	}
	return max(ChainLimit-elapsed, 0), true
}
