import numpy as np
from scipy.special import betaln, comb
from scipy.stats import binom
def q(mu,rho):
    s=(1-rho)/rho; a=mu*s;b=(1-mu)*s
    return sum(comb(3,j)*np.exp(betaln(j+a,3-j+b)-betaln(a,b)) for j in (2,3))
grid=np.round(np.arange(0.25,0.951,0.01),2)
def P(n,t,mu,rho): return binom.sf(t-1,n,q(mu,rho))
for n in (7,14):
  for k in range(1,n+1):
    if min(P(n,k,.8,r) for r in grid)>=0.9: kk=k
  print("floor",n,kk,"fail.8max",round(1-min(P(n,kk,.8,r) for r in grid),3),"pass.6 range",round(min(P(n,kk,.6,r) for r in grid),3),round(max(P(n,kk,.6,r) for r in grid),3))
# pass curve 31/42
for r in (0.25,0.35,0.5,0.72,0.95):
  print("42/31 rho",r,[round(P(42,31,m,r),3) for m in (.6,.7,.8,.9)])
# joint 42: classes 7,7,14,14 floors 4,4,f14
f14=[k for k in range(1,15) if min(P(14,k,.8,r) for r in grid)>=0.9][-1]
for mu in (.6,.7,.8):
 for rho in (0.25,0.5,0.72,0.95):
  qq=q(mu,rho); p7=binom.pmf(range(8),7,qq); p14=binom.pmf(range(15),14,qq)
  allf=one7=one14=0
  for a in range(8):
   for b in range(8):
    for c in range(15):
     for d in range(15):
      pr=p7[a]*p7[b]*p14[c]*p14[d]
      if a+b+c+d>=31:
        if a>=4 and b>=4 and c>=f14 and d>=f14: allf+=pr
        if a>=4: one7+=pr
        if c>=f14: one14+=pr
  print("joint mu",mu,"rho",rho,"all4",round(allf,3),"one-job",round(one7,3),"two-job",round(one14,3))
