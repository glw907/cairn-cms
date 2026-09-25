import numpy as np
from scipy.special import betaln, comb
from scipy.stats import chi2, binom
data={2:4,1:2,0:11}
def ll(mu,rho):
    s=(1-rho)/rho; a=mu*s; b=(1-mu)*s
    return sum(c*(np.log(comb(2,k))+betaln(k+a,2-k+b)-betaln(a,b)) for k,c in data.items())
M=np.linspace(0.02,0.98,961); R=np.linspace(0.002,0.998,997)
G=np.array([[ll(m,r) for m in M] for r in R])
i,j=np.unravel_index(G.argmax(),G.shape)
prof=G.max(1); ok=R[prof>=G.max()-chi2.ppf(.95,1)/2]
print("refit mu",round(M[j],3),"rho",round(R[i],3),"CI",round(ok.min(),3),round(ok.max(),3))
def q(mu,rho):
    s=(1-rho)/rho; a=mu*s;b=(1-mu)*s
    return sum(comb(3,j)*np.exp(betaln(j+a,3-j+b)-betaln(a,b)) for j in (2,3))
grid=np.round(np.arange(0.25,0.951,0.01),2)
def P(n,t,mu,rho): return binom.sf(t-1,n,q(mu,rho))
for n in [36,42,48]:
  for t in range(n//2,n+1):
    p6=[P(n,t,.6,r) for r in grid]; p8=[P(n,t,.8,r) for r in grid]
    if max(p6)<=0.1 and min(p8)>=0.8:
      print("n",n,"t",t,"max p6",round(max(p6),3),"at",grid[np.argmax(p6)],"min p8",round(min(p8),3),"at",grid[np.argmin(p8)])
for r in [0.25,0.35,0.5,0.72,0.76,0.95]:
  print(r,[round(P(36,27,m,r),3) for m in (.6,.7,.8,.9)], "q.8",round(q(.8,r),3),"q.6",round(q(.6,r),3))
