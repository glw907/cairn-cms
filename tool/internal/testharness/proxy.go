package testharness

import (
	"bufio"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"io"
	"log"
	"math/big"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"
)

// Request is one request the proxy served for a faked host.
type Request struct {
	Method string
	// Host is the faked host's name, without a port.
	Host string
	// Path is the request URI: the path and any query.
	Path string
}

// Proxy is an HTTPS proxy that fakes a fixed set of hosts. It answers CONNECT for a faked host by
// terminating TLS itself, with a leaf certificate the proxy's CA signs, and serves the tunnel's
// requests from that host's handler. CONNECT to any other host is refused with 403, so a run
// under the harness never reaches a real service. Its methods are safe for concurrent use.
type Proxy struct {
	// URL is the proxy's address, the value HTTPS_PROXY takes.
	URL string
	// CAFile is the PEM file holding the proxy's CA certificate, the value SSL_CERT_FILE takes.
	CAFile string

	hosts  map[string]http.Handler
	ca     *x509.Certificate
	caKey  *ecdsa.PrivateKey
	outer  *http.Server
	inner  *http.Server
	tunnel *tunnelListener

	mu       sync.Mutex
	certs    map[string]*tls.Certificate
	requests []Request
	refused  []string
}

// NewProxy starts a proxy on a loopback port that fakes each host in hosts, keyed by host name
// without a port, and stops it when the test ends. Its CA certificate is written under the
// test's temporary directory.
func NewProxy(t *testing.T, hosts map[string]http.Handler) *Proxy {
	t.Helper()
	p := &Proxy{hosts: hosts, certs: map[string]*tls.Certificate{}, tunnel: newTunnelListener()}
	p.newCA(t)

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen for the proxy: %v", err)
	}
	p.URL = "http://" + ln.Addr().String()
	// A client that refuses the test CA aborts its handshake, which the inner server would log to
	// the test's stderr on every removal case.
	quiet := log.New(io.Discard, "", 0)
	p.outer = &http.Server{Handler: http.HandlerFunc(p.connect), ErrorLog: quiet}
	p.inner = &http.Server{Handler: http.HandlerFunc(p.serve), ErrorLog: quiet}
	go func() { _ = p.outer.Serve(ln) }()
	go func() { _ = p.inner.Serve(p.tunnel) }()
	t.Cleanup(func() {
		_ = p.outer.Close()
		_ = p.inner.Close()
	})
	return p
}

// Requests returns every request served so far, in arrival order.
func (p *Proxy) Requests() []Request {
	p.mu.Lock()
	defer p.mu.Unlock()
	return append([]Request(nil), p.requests...)
}

// Refused returns the host:port of every CONNECT the proxy refused, and the URL of every plain
// proxy request, which it refuses the same way.
func (p *Proxy) Refused() []string {
	p.mu.Lock()
	defer p.mu.Unlock()
	return append([]string(nil), p.refused...)
}

func (p *Proxy) connect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodConnect {
		p.refuse(r.URL.String())
		http.Error(w, "the test proxy carries only CONNECT", http.StatusForbidden)
		return
	}
	host, _, err := net.SplitHostPort(r.Host)
	if err != nil || p.hosts[host] == nil {
		p.refuse(r.Host)
		http.Error(w, "the test proxy fakes no such host", http.StatusForbidden)
		return
	}
	cert, err := p.leaf(host)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	conn, buf, err := http.NewResponseController(w).Hijack()
	if err != nil {
		return
	}
	if _, err := io.WriteString(conn, "HTTP/1.1 200 Connection established\r\n\r\n"); err != nil {
		_ = conn.Close()
		return
	}
	// The leaf is chosen from the CONNECT line, not from SNI, so a client that sends no server
	// name still gets the faked host's certificate.
	p.tunnel.push(tls.Server(&bufferedConn{Conn: conn, r: buf.Reader}, &tls.Config{Certificates: []tls.Certificate{*cert}}))
}

func (p *Proxy) refuse(target string) {
	p.mu.Lock()
	p.refused = append(p.refused, target)
	p.mu.Unlock()
}

func (p *Proxy) serve(w http.ResponseWriter, r *http.Request) {
	host := r.Host
	if h, _, err := net.SplitHostPort(r.Host); err == nil {
		host = h
	}
	handler := p.hosts[host]
	if handler == nil {
		http.Error(w, "the tunnel names a host the proxy does not fake", http.StatusMisdirectedRequest)
		return
	}
	p.mu.Lock()
	p.requests = append(p.requests, Request{Method: r.Method, Host: host, Path: r.URL.RequestURI()})
	p.mu.Unlock()
	handler.ServeHTTP(w, r)
}

func (p *Proxy) newCA(t *testing.T) {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatalf("generate the test CA key: %v", err)
	}
	tmpl := &x509.Certificate{
		SerialNumber:          big.NewInt(1),
		Subject:               pkix.Name{CommonName: "cairn end-to-end test CA"},
		NotBefore:             time.Now().Add(-time.Hour),
		NotAfter:              time.Now().Add(24 * time.Hour),
		IsCA:                  true,
		BasicConstraintsValid: true,
		KeyUsage:              x509.KeyUsageCertSign,
	}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &key.PublicKey, key)
	if err != nil {
		t.Fatalf("sign the test CA: %v", err)
	}
	ca, err := x509.ParseCertificate(der)
	if err != nil {
		t.Fatalf("parse the test CA: %v", err)
	}
	p.ca, p.caKey = ca, key
	p.CAFile = filepath.Join(t.TempDir(), "ca.pem")
	if err := os.WriteFile(p.CAFile, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}), 0o644); err != nil {
		t.Fatalf("write the test CA: %v", err)
	}
}

// leaf returns host's certificate, issuing it on the first CONNECT to host.
func (p *Proxy) leaf(host string) (*tls.Certificate, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if cert := p.certs[host]; cert != nil {
		return cert, nil
	}
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, err
	}
	tmpl := &x509.Certificate{
		SerialNumber: big.NewInt(int64(len(p.certs) + 2)),
		Subject:      pkix.Name{CommonName: host},
		NotBefore:    time.Now().Add(-time.Hour),
		NotAfter:     time.Now().Add(24 * time.Hour),
		KeyUsage:     x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
	}
	if ip := net.ParseIP(host); ip != nil {
		tmpl.IPAddresses = []net.IP{ip}
	} else {
		tmpl.DNSNames = []string{host}
	}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, p.ca, &key.PublicKey, p.caKey)
	if err != nil {
		return nil, err
	}
	cert := &tls.Certificate{Certificate: [][]byte{der}, PrivateKey: key}
	p.certs[host] = cert
	return cert, nil
}

// bufferedConn reads through the bufio.Reader a hijack hands back, which may already hold the
// first bytes of the client's handshake.
type bufferedConn struct {
	net.Conn
	r *bufio.Reader
}

func (c *bufferedConn) Read(b []byte) (int, error) { return c.r.Read(b) }

// tunnelListener hands the inner server each tunnel the outer server accepts, so one http.Server
// serves every faked host's requests.
type tunnelListener struct {
	conns     chan net.Conn
	closed    chan struct{}
	closeOnce sync.Once
}

func newTunnelListener() *tunnelListener {
	return &tunnelListener{conns: make(chan net.Conn), closed: make(chan struct{})}
}

func (l *tunnelListener) push(c net.Conn) {
	select {
	case l.conns <- c:
	case <-l.closed:
		_ = c.Close()
	}
}

func (l *tunnelListener) Accept() (net.Conn, error) {
	select {
	case c := <-l.conns:
		return c, nil
	case <-l.closed:
		return nil, net.ErrClosed
	}
}

func (l *tunnelListener) Close() error {
	l.closeOnce.Do(func() { close(l.closed) })
	return nil
}

func (l *tunnelListener) Addr() net.Addr { return &net.TCPAddr{IP: net.IPv4(127, 0, 0, 1)} }
