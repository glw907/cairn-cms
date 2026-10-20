import numpy as np
from scipy.special import betaln, comb
from scipy.stats import binom
def q(mu,rho):
    s=(1-rho)/rho; a=mu*s;b=(1-mu)*s
    return sum(comb(3,j)*np.exp(betaln(j+a,3-j+b)-betaln(a,b)) for j in (2,3))
for rho in [0.25,0.72]:
    print(rho,[round(binom.sf(26,36,q(m,rho)),3) for m in (0.6,0.7,0.8)])
def fleiss(M):
    n=3;k1=M.sum(1);k0=n-k1
    P=((k1*(k1-1)+k0*(k0-1))/6).mean();p1=M.mean();Pe=p1**2+(1-p1)**2
    return (P-Pe)/(1-Pe)
rng=np.random.default_rng(1)
for rho in [0.25]:
    s=(1-rho)/rho;ks=[]
    for _ in range(5000):
        p=rng.beta(0.8*s,0.2*s,36);M=(rng.random((36,3))<p[:,None]).astype(int);ks.append(fleiss(M))
    print("stab pass at .25",np.mean(np.array(ks)>=0.35))
