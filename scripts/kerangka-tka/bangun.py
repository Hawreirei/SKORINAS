import json,re,sys
d=json.load(open('kerangka.json')); nama=json.load(open('nama.json'))
PRE=re.compile(r'^(memahami, mengaplikasikan, dan bernalar.*?berikut\s*:?|.*cakupan sub-?\s*elemen berikut\s*:)\s*',re.I)
def rapi(x):
    x=re.sub(r'\s+',' ',x).strip(); x=x.replace('●','').replace('○','').strip()
    x=re.sub(r'\s+([,.;:)])',r'\1',x); x=re.sub(r'\(\s+','(',x)
    x=re.sub(r'(\w)- (\w)',r'\1-\2',x) if re.search(r'sifat- sifat|antar- ',x) else x
    return x.strip(' ;').rstrip('.').strip()
def kol(r,pred):
    for k,v in r.items():
        if pred(k): return v
    return {'teks':'','butir':[]}
hasil={}
for kunci,v in d.items():
    jenjang,jenis,slug=kunci.split('_',2)
    nm=nama.get(slug) if jenjang=='sma' else None
    if not nm: nm={'matematika':'Matematika','bahasa-indonesia':'Bahasa Indonesia','bahasa-inggris':'Bahasa Inggris'}[slug]
    e={'nama':nm,'jenjang':jenjang.upper(),'jenis':jenis,'url':f'https://pusmendik.kemendikdasmen.go.id/tka/kerangka/{jenjang}/?jenis=mata-pelajaran-{jenis}&mapel={slug}',
       'definisi':rapi(v['definisi'])[:700],'muatan':rapi(v['muatan'])[:900],'baris':[],'baca':{}}
    for r in v['matriks']:
        keys=list(r.keys())
        if 'subkompetensi' in keys:
            k=rapi(kol(r,lambda x:x=='kompetensi')['teks']).split(':')[0].strip()
            s=rapi(kol(r,lambda x:x=='subkompetensi')['teks'])
            if k and s: e['baca'].setdefault(k,[]).append(s)
            continue
        el=rapi(kol(r,lambda x:x.startswith('elemen'))['teks']); sb=rapi(kol(r,lambda x:x.startswith('sub'))['teks'])
        ko=kol(r,lambda x:x=='kompetensi'); bt=rapi(kol(r,lambda x:x.startswith('batasan'))['teks'])
        if not el and not sb and not ko['teks']: continue
        if el.lower().startswith('elemen') : continue
        items=[]
        if re.search(r'berikut\s*:',ko['teks'],re.I):
            after=re.split(r'berikut\s*:',ko['teks'],maxsplit=1,flags=re.I)[1]
            items=[rapi(i) for i in re.split(r'[;●]',after) if rapi(i)]
        prev=e['baris'][-1] if e['baris'] else None
        if not sb and prev: sb=prev['sub']
        if not el and prev: el=prev['elemen']
        # Lanjutan daftar butir yang terpotong ke baris tabel berikutnya.
        if prev and not items and prev['butir'] and prev['sub']==sb and prev['elemen']==el and not re.search(r'berikut',ko['teks'],re.I):
            lanjut=[rapi(i) for i in re.split(r'[;●]',ko['teks']) if rapi(i)]
            if lanjut and prev['butir'][-1] and len(prev['butir'][-1])<12:
                lanjut[0]=prev['butir'].pop()+' '+lanjut[0]
            prev['butir'].extend(lanjut)
            if bt and bt!=prev['_bt']: prev['batasan']=(prev['batasan']+' '+bt).strip()
            continue
        if e['baris'] and bt and bt==e['baris'][-1].get('_bt'): btu=''
        else: btu=bt
        e['baris'].append({'_bt':bt,'elemen':el or (e['baris'][-1]['elemen'] if e['baris'] else ''),'sub':sb,'kompetensi':'' if items else rapi(ko['teks']),'butir':items,'batasan':btu})
    for b in e['baris']: b.pop('_bt',None)
    hasil[kunci]=e
json.dump(hasil,open('kerangka-tka.json','w'),ensure_ascii=False,separators=(',',':'))
import os; print(os.path.getsize('kerangka-tka.json'))
for k,e in hasil.items():
    nb=sum(max(1,len(b['butir'])) for b in e['baris'])
    print(f"{k[:60]:60s} elemen={len(set(b['elemen'] for b in e['baris'])):2d} butir={nb:3d} baca={sum(len(x) for x in e['baca'].values()):2d} kosong_el={sum(1 for b in e['baris'] if not b['elemen'])}")

# ---- Tambalan: bagian halaman resmi yang terpotong atau tanpa tabel matriks (dicatat di docs/KEPUTUSAN.md) ----
def baris(k): return hasil[k]['baris']
m=baris('sma_wajib_matematika')
for b in m:
    if b['sub']=='Data': b['butir']=[x if x!='Aturan' else 'Aturan pencacahan (aturan perkalian, permutasi, dan kombinasi)' for x in b['butir']]
m.append({'elemen':'Data dan Peluang','sub':'Peluang','kompetensi':'','butir':['Peluang kejadian tunggal','Peluang kejadian majemuk'],'batasan':'','tambalan':True})
for b in baris('sma_pilihan_matematika-tingkat-lanjut'):
    if b['sub']=='Limit': b['elemen']='Kalkulus'
    b['butir']=[x.replace('Operasi matriks.Program linear','Operasi matriks') for x in b['butir']]
hasil['sma_pilihan_kimia']['baris']=[
 {'elemen':'Kimia Dasar','sub':s,'kompetensi':'','butir':[],'batasan':''} for s in ['Struktur atom dan teori model atom','Sistem dan sifat periodik unsur','Ikatan kimia, geometri molekul, dan interaksi antarmolekul','Hukum dasar kimia, stoikiometri, dan persamaan reaksi kimia']]+[
 {'elemen':'Kimia Analitik','sub':s,'kompetensi':'','butir':[],'batasan':''} for s in ['Larutan dan kesetimbangan larutan','Asam-basa dan pH','Koloid']]+[
 {'elemen':'Kimia Fisik','sub':s,'kompetensi':'','butir':[],'batasan':''} for s in ['Energetika reaksi','Dinamika reaksi']]+[
 {'elemen':'Kimia Organik','sub':'Struktur dan kereaktifan senyawa karbon','kompetensi':'','butir':[],'batasan':''}]
for b in hasil['sma_pilihan_kimia']['baris']: b['tambalan']=True
hasil['sma_pilihan_bahasa-inggris-tingkat-lanjut']['baca']=hasil['sma_wajib_bahasa-inggris']['baca']

import os
os.makedirs('keluar',exist_ok=True)
penuh={k:{'nama':e['nama'],'jenjang':e['jenjang'],'jenis':e['jenis'],'url':e['url'],'baris':[{kk:vv for kk,vv in b.items() if vv not in ('',[],None)} for b in e['baris']]} for k,e in hasil.items()}
ringkas={k:{'nama':e['nama'],'jenjang':e['jenjang'],'jenis':e['jenis'],'definisi':e['definisi'],'muatan':e['muatan'],**({'baca':e['baca']} if e['baca'] else {})} for k,e in hasil.items()}
json.dump(penuh,open('keluar/kerangka-tka.json','w'),ensure_ascii=False,indent=0)
json.dump(ringkas,open('keluar/kerangka-ringkas.json','w'),ensure_ascii=False,indent=0)
print('penuh',os.path.getsize('keluar/kerangka-tka.json'),'ringkas',os.path.getsize('keluar/kerangka-ringkas.json'))
