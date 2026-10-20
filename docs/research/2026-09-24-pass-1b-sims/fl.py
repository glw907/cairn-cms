import numpy as np
def fleiss(M):
    k1=M.sum(1);k0=3-k1
    P=((k1*(k1-1)+k0*(k0-1))/6).mean();p1=M.mean();Pe=p1**2+(1-p1)**2
    return (P-Pe)/(1-Pe)
rng=np.random.default_rng(20260924)
for rho in [0.76,0.5,0.35,0.25,0.1,1e-9]:
    s=(1-rho)/rho;ks=[]
    for _ in range(5000):
        p=rng.beta(0.8*s,0.2*s,36);M=(rng.random((36,3))<p[:,None]).astype(int);ks.append(fleiss(M))
    ks=np.array(ks)
    print(rho,[round(np.mean(ks>=f),3) for f in (0.35,0.25,0.2,0.15)])
