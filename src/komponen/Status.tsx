import type { StatusMutu, StatusTelaah } from '../db/tipe';
import { STATUS_MUTU_LABEL } from '../db/tipe';

export function Titik({ isi = true, className = '' }: { isi?: boolean; className?: string }) {
  return <span aria-hidden="true" className={`inline-block size-[7px] shrink-0 rounded-full border border-tinta ${isi ? 'bg-tinta' : 'bg-transparent'} ${className}`} />;
}

export function LencanaMutu({ mutu, telaah }: { mutu: StatusMutu; telaah?: StatusTelaah }) {
  const sudah = telaah === 'ditelaah_guru';
  const label = mutu === 'perlu_telaah' && sudah ? 'Sudah ditelaah' : STATUS_MUTU_LABEL[mutu];
  const isi = mutu !== 'perlu_telaah' || sudah;
  return (
    <span className={`mono inline-flex items-center gap-2 ${mutu === 'ditolak' ? 'text-buruk' : ''}`}>
      <Titik isi={isi} />
      {label}
      {sudah && mutu !== 'perlu_telaah' ? <span className="text-redup">· disetujui</span> : null}
    </span>
  );
}

export function Label({ children, htmlFor, className = '' }: { children: React.ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={`mono block text-redup ${className}`}>
      {children}
    </label>
  );
}

export function Kotak({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`border border-garis bg-panel p-5 text-[15px] leading-relaxed text-isi ${className}`}>{children}</div>;
}

export function Peringatan({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="status" className={`border border-awas/40 bg-awas-latar px-5 py-4 text-[15px] leading-relaxed text-awas ${className}`}>
      {children}
    </div>
  );
}
