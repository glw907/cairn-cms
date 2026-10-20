import numpy as np
def fleiss(M):
    n=M.shape[1]; k1=M.sum(1); k0=n-k1
    P=((k1*(k1-1)+k0*(k0-1))/(n*(n-1))).mean()
    p1=M.mean(); Pe=p1**2+(1-p1)**2
    return (P-Pe)/(1-Pe) if Pe<1 else np.nan
rng=np.random.default_rng(20260924)
N=42; D=5000
K={}
for rho in [0.95,0.72,0.5,0.35,0.25,0.2,0.1,1e-9]:
  s=(1-rho)/rho; ks=[]
  for _ in range(D):
    p=rng.beta(0.8*s,0.2*s,N); M=(rng.random((N,3))<p[:,None]).astype(int); ks.append(fleiss(M))
  K[rho]=np.array(ks)
f=np.nanquantile(K[0.25],0.2)
print("floor passing ICC .25 at 0.8:",round(f,3))
for r,ks in K.items(): print(r,"P(k>=.35)",round(np.nanmean(ks>=0.35),3),"P(k>=f)",round(np.nanmean(ks>=f),3),"median",round(np.nanmedian(ks),3))
