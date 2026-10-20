import numpy as np
from scipy.special import betaln, comb
from scipy.stats import binom, chi2
from scipy.optimize import minimize
data={2:9,1:2,0:6}
def ll(mu,rho):
    s=(1-rho)/rho; a=mu*s; b=(1-mu)*s
    return sum(c*(np.log(comb(2,k))+betaln(k+a,2-k+b)-betaln(a,b)) for k,c in data.items())
best=max(((ll(m,r),m,r) for m in np.linspace(0.3,0.9,601) for r in np.linspace(0.01,0.995,985)))
print("MLE",best)
L=best[0]
# profile over rho
prof=[]
for r in np.linspace(0.01,0.995,985):
    mx=max(ll(m,r) for m in np.linspace(0.2,0.95,751))
    prof.append((r,mx))
cut=L-chi2.ppf(0.95,1)/2
ok=[r for r,v in prof if v>=cut]
print("profile CI rho",min(ok),max(ok))
def q(mu,rho,n=3,k=2):
    if rho==0: return 1-binom.cdf(k-1,n,mu)
    s=(1-rho)/rho; a=mu*s;b=(1-mu)*s
    return sum(comb(n,j)*np.exp(betaln(j+a,n-j+b)-betaln(a,b)) for j in range(k,n+1))
for rho in [0.76,0.35,0.95,0.5]:
    row=[]
    for mu in [0.6,0.7,0.8,0.9]:
        qq=q(mu,rho); row.append(round(binom.sf(26,36,qq),3))
    print("rho",rho,row)
# 24 plants thresholds
for rho in [0.76,0.5,0.82]:
    for t in range(12,25):
        p8=binom.sf(t-1,24,q(0.8,rho)); p6=binom.sf(t-1,24,q(0.6,rho))
        if p8>=0.8 and p6<=0.1: print("24 plants rho",rho,"t",t,round(p8,3),round(p6,3))
# 36 all thresholds meeting rule
for rho in [0.76,0.35,0.95,0.5]:
    good=[t for t in range(1,37) if binom.sf(t-1,36,q(0.8,rho))>=0.8 and binom.sf(t-1,36,q(0.6,rho))<=0.1]
    print("36 rho",rho,good)
# floors
for rho in [0.76]:
    for mu in [0.8,0.6]:
        qq=q(mu,rho)
        print("mu",mu,"q",round(qq,3),"fail4/6",round(binom.cdf(3,6,qq),3),"fail8/12",round(binom.cdf(7,12,qq),3),"pass4/6",round(binom.sf(3,6,qq),3),"pass8/12",round(binom.sf(7,12,qq),3))
