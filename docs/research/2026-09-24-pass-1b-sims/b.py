import numpy as np
from scipy.special import betaln, comb
from scipy.stats import binom
def q(mu,rho):
    s=(1-rho)/rho; a=mu*s;b=(1-mu)*s
    return sum(comb(3,j)*np.exp(betaln(j+a,3-j+b)-betaln(a,b)) for j in (2,3))
grid=np.round(np.arange(0.25,0.951,0.01),2)
def P(n,t,mu,rho): return binom.sf(t-1,n,q(mu,rho))
print("pooled thresholds by n")
for n in range(20,37):
  ts=[t for t in range(1,n+1) if max(P(n,t,.6,r) for r in grid)<=0.1 and min(P(n,t,.8,r) for r in grid)>=0.8]
  if ts:
    t=min(ts); print(n,t,"p6max",round(max(P(n,t,.6,r) for r in grid),3),"p8min",round(min(P(n,t,.8,r) for r in grid),3), "all",ts)
  else: print(n,"none")
print("class floors by n (largest k with pass>=0.9 at recall .8 across range)")
for n in range(1,13):
  ks=[k for k in range(1,n+1) if min(P(n,k,.8,r) for r in grid)>=0.9]
  k=max(ks) if ks else None
  if k: print(n,k,"fail.8 max",round(1-min(P(n,k,.8,r) for r in grid),3),"pass.6 at .76",round(P(n,k,.6,.76),3))
  else: print(n,"none")
# joint at recall 0.8 (and .6,.7) across ICC: pooled 27 + all four floors; one-job class; two-job class
for mu in (.6,.7,.8):
 for rho in (0.25,0.35,0.5,0.72,0.95):
  qq=q(mu,rho)
  p6=binom.pmf(range(7),6,qq); p12=binom.pmf(range(13),12,qq)
  allf=one6=one12=0
  for a in range(7):
   for b in range(7):
    for c in range(13):
     for d in range(13):
      pr=p6[a]*p6[b]*p12[c]*p12[d]
      if a+b+c+d>=27:
        if a>=4 and b>=4 and c>=8 and d>=8: allf+=pr
        if a>=4: one6+=pr
        if c>=8: one12+=pr
  print("mu",mu,"rho",rho,"all four",round(allf,3),"one-job",round(one6,3),"two-job",round(one12,3))
