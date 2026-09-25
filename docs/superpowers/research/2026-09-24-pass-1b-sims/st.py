import numpy as np, itertools
from scipy.special import betaln, comb
from scipy.stats import binom
def q(mu,rho,n=3,k=2):
    s=(1-rho)/rho; a=mu*s;b=(1-mu)*s
    return sum(comb(n,j)*np.exp(betaln(j+a,n-j+b)-betaln(a,b)) for j in range(k,n+1))
# joint: classes 6,6,12,12
for rho in [0.76,0.35,0.95]:
  qq=q(0.8,rho)
  p6=binom.pmf(range(7),6,qq); p12=binom.pmf(range(13),12,qq)
  allf=0; one6=0; one12=0
  for a in range(7):
   for b in range(7):
    for c in range(13):
     for d in range(13):
      pr=p6[a]*p6[b]*p12[c]*p12[d]
      if a+b+c+d>=27:
        if a>=4 and b>=4 and c>=8 and d>=8: allf+=pr
        if a>=4: one6+=pr
        if c>=8: one12+=pr
  print("rho",rho,"all four",round(allf,3),"one-job class both",round(one6,3),"two-job class both",round(one12,3))
def fleiss(M):
    n=M.shape[1]; N=M.shape[0]
    k1=M.sum(1); k0=n-k1
    P=((k1*(k1-1)+k0*(k0-1))/(n*(n-1))).mean()
    p1=M.mean(); Pe=p1**2+(1-p1)**2
    return (P-Pe)/(1-Pe) if Pe<1 else np.nan
rng=np.random.default_rng(20260924)
for mu in [0.8,0.6,0.7]:
 for rho in [0.95,0.76,0.5,0.35,0.2,1e-9]:
  s=(1-rho)/rho
  ks=[]
  for _ in range(5000):
    p=rng.beta(mu*s,(1-mu)*s,36)
    M=(rng.random((36,3))<p[:,None]).astype(int)
    ks.append(fleiss(M))
  ks=np.array(ks)
  print("mu",mu,"rho",rho,"P(k>=0.35)",round(np.nanmean(ks>=0.35),3),"nan",np.isnan(ks).mean(),"median",round(np.nanmedian(ks),3))
