import json,re,glob,os,sys
from bs4 import BeautifulSoup
def bersih(x): return re.sub(r'\s+',' ',x).replace(' ,',',').replace(' .','.').strip()
def tx(el):
    for b in el.find_all(['br']): b.replace_with('\n')
    for b in el.find_all(['p','li','div','tr','td','th','h1','h2','h3','h4','h5','h6']): b.append('\n')
    return el.get_text('')
def sel(c):
    items=[bersih(tx(li)) for li in c.find_all('li')]
    if not items:
        ps=[bersih(tx(p)) for p in c.find_all('p')]
        ps=[p for p in ps if p]
        if len(ps)>1: items=ps
    teks=bersih(tx(c))
    return teks, [i for i in items if i]
def grid(t):
    rows=t.find_all('tr'); g=[]; pend={}
    for r in rows:
        cells=r.find_all(['td','th']); row=[]; col=0; it=iter(cells)
        out={}
        # fill pending rowspans
        ci=0; col=0; res=[]
        cells=list(cells)
        while ci<len(cells) or col in pend:
            if col in pend:
                v,n=pend[col]; res.append(v)
                if n-1>0: pend[col]=(v,n-1)
                else: del pend[col]
                col+=1; continue
            c=cells[ci]; ci+=1
            v=sel(c); rs=int(c.get('rowspan') or 1); cs=int(c.get('colspan') or 1)
            for k in range(cs):
                res.append(v)
                if rs>1: pend[col]=(v,rs-1)
                col+=1
        g.append(res)
    return g
hasil={}
for f in sorted(glob.glob('hal/*.html')):
    nama=os.path.basename(f)[:-5]
    s=BeautifulSoup(open(f).read(),'lxml')
    judul=[bersih(h.get_text(' ')) for h in s.find_all(['h1','h2','h3','h4','h5'])]
    teks=[bersih(l) for l in tx(s.body or s).split('\n') if bersih(l)]
    def bagian(a,b):
        try:
            i=max(k for k,l in enumerate(teks) if l==a and k< (teks.index('No Soal') if 'No Soal' in teks else len(teks)))
        except ValueError: return ''
        j=next((k for k in range(i+1,len(teks)) if teks[k] in b),len(teks))
        return '\n'.join(teks[i+1:j])
    d={'definisi':bagian('Definisi',('Muatan',)),'muatan':bagian('Muatan',('Kompetensi',)),'kompetensi':bagian('Kompetensi',('Matriks Asesmen','Level')),'matriks':[],'level':[]}
    for t in s.find_all('table'):
        g=grid(t)
        if not g: continue
        head=[re.sub(r'\s+','',h[0]).lower() for h in g[0]]
        if any('elemen' in h for h in head) or any('subkompetensi' in h for h in head):
            for r in g[1:]:
                row={head[i]:r[i] for i in range(min(len(head),len(r)))}
                d['matriks'].append({k:{'teks':v[0],'butir':v[1]} for k,v in row.items()})
        elif any('level' in h for h in head):
            for r in g[1:]: d['level'].append([c[0] for c in r])
    hasil[nama]=d
json.dump(hasil,open('kerangka.json','w'),ensure_ascii=False,indent=1)
for k,v in hasil.items(): print(f"{k:70s} matriks={len(v['matriks']):3d} muatan={len(v['muatan']):5d} def={len(v['definisi']):4d}")
