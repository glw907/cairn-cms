import numpy as np
rng=np.random.default_rng(20260924)
def det(nd,r,rho):
    if nd==0: return 0
    if rho==0: p=np.full(nd,r)
    else:
        s=(1-rho)/rho; p=rng.beta(r*s,(1-r)*s,nd)
    return (rng.random((nd,3))<p[:,None]).any(1).sum()
def sim(mf,r,rho,N=5000):
    k=0
    for _ in range(N):
        tm=sum(det(rng.poisson(6),r,rho) for _ in range(6))
        tf=sum(det(rng.poisson(mf),r,rho) for _ in range(6))
        k+= 3*tf<=2*tm
    return k/N
for rho in [0,0.76]:
  for r in [0.4,0.7,0.99]:
    print(rho,r,"one-third",sim(4,r,rho),"half",sim(3,r,rho),"nodiff",sim(6,r,rho))
