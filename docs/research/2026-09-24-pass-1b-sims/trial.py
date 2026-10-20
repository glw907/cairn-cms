import numpy as np
rng=np.random.default_rng(20260924)
def det(nd,r,rho):
    # each defect: per-run p ~ beta(mean r, icc rho) or fixed; union of 3 runs
    if nd==0: return 0
    if rho==0: p=np.full(nd,r)
    else:
        s=(1-rho)/rho; p=rng.beta(r*s,(1-r)*s,nd)
    caught=(rng.random((nd,3))<p[:,None]).any(1)
    return caught.sum()
def sim(mf,r,rho,N=20000):
    keep=0
    for _ in range(N):
        tm=sum(det(rng.poisson(6),r,rho) for _ in range(6))
        tf=sum(det(rng.poisson(mf),r,rho) for _ in range(6))
        if 3*tf<=2*tm: keep+=1
    return keep/N
for rho in [0,0.76]:
  for r in [0.4,0.7,0.99]:
    print(rho,r,"better",sim(4,r,rho,5000),"nodiff",sim(6,r,rho,5000))
def sim2(mf,r,rho,N=5000):
    keep=0
    for _ in range(N):
        tm=sum(det(rng.poisson(6),r,rho) for _ in range(6))
        tf=sum(det(rng.poisson(mf),r,rho) for _ in range(6))
        if 3*tf<2*tm: keep+=1
    return keep/N
print("strict")
for rho in [0,0.76]:
  for r in [0.4,0.99]:
    print(rho,r,"better",sim2(4,r,rho),"nodiff",sim2(6,r,rho))
