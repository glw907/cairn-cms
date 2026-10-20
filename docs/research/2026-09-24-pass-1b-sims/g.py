import numpy as np
from scipy.special import betaln, comb
from scipy.stats import binom
def q(mu,rho):
    s=(1-rho)/rho; a=mu*s;b=(1-mu)*s
    return sum(comb(3,j)*np.exp(betaln(j+a,3-j+b)-betaln(a,b)) for j in (2,3))
for r in (0.25,0.5,0.72,0.95): print(r,[round(binom.sf(30,42,q(m,r)),4) for m in (.6,.7,.8,.9)])
print(round(binom.sf(26,36,q(.6,.25)),4), round(binom.sf(26,36,q(.8,.95)),4))
