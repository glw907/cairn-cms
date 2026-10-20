import numpy as np
from scipy.special import betaln, comb
from scipy.stats import binom
def q(mu,rho):
    s=(1-rho)/rho; a=mu*s;b=(1-mu)*s
    return sum(comb(3,j)*np.exp(betaln(j+a,3-j+b)-betaln(a,b)) for j in (2,3))
grid=np.round(np.arange(0.25,0.951,0.01),2)
for n in range(1,15):
  ks=[k for k in range(1,n+1) if min(binom.sf(k-1,n,q(.8,r)) for r in grid)>=0.9]
  print(n, max(ks) if ks else None)
