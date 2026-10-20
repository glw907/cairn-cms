import numpy as np
from scipy.special import betaln, comb
from scipy.stats import binom
def q(mu,rho):
    s=(1-rho)/rho; a=mu*s;b=(1-mu)*s
    return sum(comb(3,j)*np.exp(betaln(j+a,3-j+b)-betaln(a,b)) for j in (2,3))
lo,hi=0.25,0.95
def P(n,t,mu,rho): return binom.sf(t-1,n,q(mu,rho))
for n in range(30,55):
  best=None
  for t in range(1,n+1):
    a=P(n,t,.6,lo); b=P(n,t,.8,hi)
    if a<=0.1 and b>=0.8: best=(t,round(a,3),round(b,3)); break
  near=[(t,round(P(n,t,.6,lo),3),round(P(n,t,.8,hi),3)) for t in range(int(n*.68),int(n*.8)+1)]
  print(n,best if best else "none", near if not best else "")
