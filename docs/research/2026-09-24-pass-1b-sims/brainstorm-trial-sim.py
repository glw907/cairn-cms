import numpy as np
from scipy.stats import beta as B
rng=np.random.default_rng(7)
classes=[4,4,8,8]  # plants per class: docs-only, binary, site, repo
def sim(mu,rho,N=40000):
    passes=0; pooled_only=0
    for _ in range(N):
        tot=0; ok=True
        for k in classes:
            if rho==0: p=np.full(k,mu)
            else:
                s=(1-rho)/rho; p=rng.beta(mu*s,(1-mu)*s,k)
            c=rng.binomial(3,p).sum()
            tot+=c
            if c/(3*k)<0.6: ok=False
        pp=tot>=58
        pooled_only+=pp
        passes+=pp and ok
    return passes/N, pooled_only/N
for rho in [0,0.3,0.76]:
    for mu in [0.65,0.7,0.8,0.85,0.9,0.95]:
        a,b=sim(mu,rho,20000)
        print(f'rho={rho} mu={mu} P(all sens bars)={a:.3f} P(pooled)={b:.3f}')
