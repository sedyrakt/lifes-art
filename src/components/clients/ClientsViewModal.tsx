// src/components/clients/ClientsViewModal.tsx
// ⭐ INDIGO (#4F46E5) + SLATE (#0F172A) DARK MODE
// ⭐ FONT SIZE: h2 18px, labels 13px, values 15px, buttons 15px
// ⭐ FIX: `nombre_commandes` (avy amin'ny backend) fa tsy `nb_commandes`
// ⭐ NESORINA TANTERAKA: ny avatar (initials circle)
// ⭐ UPDATE: Nampiana border ny bouton X (header) sy Fermer (footer) ary nampitomboina ny fontSize an'ny X

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil } from 'lucide-react';

interface Client {
  id: number;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  ville: string;
  code_postal: string;
  pays: string;
  type: 'Particulier' | 'Entreprise';
  created_at: string;
  nombre_commandes?: number;
  nb_commandes?: number;
  total_achats?: number;
}

interface ClientsViewModalProps {
  client: Client;
  onClose: () => void;
  onEdit: () => void;
  getTypeColor: (type: string) => string;
  isDark?: boolean;
}

const ClientsViewModal: React.FC<ClientsViewModalProps> = ({
  client,
  onClose,
  onEdit,
  getTypeColor,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(true), 10);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const formatDate = (date?: string) => {
    if (!date) return '—';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // ⭐ FIX: Priorité an'ny 'nombre_commandes' (avy amin'ny backend)
  const nbCommandes = client.nombre_commandes ?? client.nb_commandes ?? 0;

  // ⭐ InfoRow — sans icône
  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3 text-[15px] py-3 border-b border-slate-200 dark:border-white/[0.08]">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <span>{label}</span>
      </div>
      <span className="min-w-0 truncate text-right font-semibold text-slate-900 dark:text-slate-100">
        {value}
      </span>
    </div>
  );

  if (!client) return null;

  const modal = (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 transition-all duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } bg-black/80 dark:bg-black/80 backdrop-blur-sm`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-view-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-xl border-[0.5px] border-slate-200 dark:border-white/[0.12] bg-white dark:bg-[#0F172A] shadow-[0_18px_55px_rgba(15,23,42,0.35)] transition-all duration-200 ${
          isVisible ? 'translate-y-0 scale-100' : 'translate-y-2 scale-[0.98]'
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="absolute left-0 right-0 top-0 h-[2px] bg-brand-500" />

        {/* HEADER */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0F172A] px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <h2 id="client-view-title" className="truncate text-[18px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Détails du client
              </h2>
              <p className="text-[14px] leading-[1.3] mt-0.5 text-slate-500 dark:text-slate-400">
                CLI-{String(client.id).padStart(6, '0')}
              </p>
            </div>
          </div>
          
          {/* ⭐ FIX: Bouton Fermer (X) — nampiana border, nampitomboina ny fontSize (text-[31.5px]) */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 dark:border-white/[0.12] dark:text-slate-400 dark:hover:bg-white/[0.06] active:scale-[0.98] pb-0.5"
          >
            <span className="text-[31.5px] font-light leading-none">×</span>
          </button>
        </header>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* ⭐⭐⭐ Nom + Badge Type — tsy misy avatar ⭐⭐⭐ */}
          <div className="mb-4">
            <h3 className="truncate text-[18px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
              {client.nom}
            </h3>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-md border px-2.5 py-1.5 text-[13px] font-semibold leading-tight ${getTypeColor(client.type)}`}
              >
                {client.type}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0F172A] px-3.5 py-3">
              <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                Total Achats
              </p>
              <p className="mt-1 text-[15px] font-semibold text-brand-600 dark:text-brand-400">
                {Number(client.total_achats || 0).toLocaleString('fr-FR')} Ar
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0F172A] px-3.5 py-3">
              <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                Commandes
              </p>
              <p className="mt-1 text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                {nbCommandes}
              </p>
            </div>
          </div>

          {/* Informations */}
          <div className="flex flex-col">
            <InfoRow label="Email"         value={client.email || '—'} />
            <InfoRow label="Téléphone"     value={client.telephone || '—'} />
            <InfoRow label="Adresse"       value={client.adresse || '—'} />
            <InfoRow label="Ville"         value={client.ville || '—'} />
            <InfoRow label="Code postal"   value={client.code_postal || '—'} />
            <InfoRow label="Pays"          value={client.pays || '—'} />
            <InfoRow label="Client depuis" value={formatDate(client.created_at)} />
          </div>
        </div>

        {/* FOOTER */}
        <footer className="flex h-[72px] shrink-0 items-center justify-end gap-2 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0F172A] px-5">
          
          {/* ⭐ FIX: Bouton Fermer (footer) — nampiana border mba hitovy amin'ny Modifier */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 items-center justify-center rounded-lg border border-slate-200 px-5 text-[15px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/[0.12] dark:text-slate-400 dark:hover:bg-white/[0.06] active:scale-[0.98]"
          >
            Fermer
          </button>
          
          <button
            type="button"
            onClick={onEdit}
            className="flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 active:scale-[0.98]"
          >
            <Pencil size={17} strokeWidth={2.2} />
            Modifier
          </button>
        </footer>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default ClientsViewModal;