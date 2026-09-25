import numpy as np
from scipy.special import betaln, comb
from scipy.stats import chi2, binom
for data in [{2:9,1:2,0:6},{2:4,1:2,0:11}]:
    def ll(mu,rho):
        s=(1-rho)/rho; a=mu*s; b=(1-mu)*s
        return sum(c*(np.log(comb(2,k))+betaln(k+a,2-k+b)-betaln(a,b)) for k,c in data.items())
    M=np.linspace(0.05,0.95,361); R=np.linspace(0.005,0.995,397)
    G=np.array([[ll(m,r) for m in M] for r in R])
    i,j=np.unravel_index(G.argmax(),G.shape)
    prof=G.max(1); ok=R[prof>=G.max()-chi2.ppf(.95,1)/2]
    print(data,"mu",round(M[j],3),"rho",round(R[i],3),"CI",round(ok.min(),3),round(ok.max(),3))
# thin-map recompute: thresholds by plant count at ICC .76
def q(mu,rho):
    s=(1-rho)/rho; a=mu*s;b=(1-mu)*s
    return sum(comb(3,j)*np.exp(betaln(j+a,3-j+b)-betaln(a,b)) for j in (2,3))
for n in [24,28,30,32,34,35,36]:
    t=min(t for t in range(n+1) if binom.sf(t-1,n,q(0.6,0.76))<=0.1)
    print(n,t,"P(pass|0.8)",round(binom.sf(t-1,n,q(0.8,0.76)),3))
