// src/components/parametres/ParametresBackup.tsx
// ⭐ INDIGO (#4F46E5) + SLATE (#0F172A) DARK MODE
// ⭐ FIX: Confirmation modal alohan'ny restore (mavitrika)
// ⭐ FIX: Listener 'app:restore-starting' ho feedback
// ⭐ FIX: Status fields marina (totalBackups, totalSizeMB, lastBackup, enabled)
// ⭐ FIX: Refresh automatique aorian'ny restore (tsy mila click)
// ⭐ FIX: Rollback notification raha misy erreur

import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  HardDrive, Save, RefreshCw, Clock, Database, Shield,
  Upload, AlertTriangle, CheckCircle2, X, FolderOpen, Trash2,
} from 'lucide-react';
import SuccessModal from '../common/SuccessModal';
import ErrorModal from '../common/ErrorModal';

interface ParametresBackupProps { isDark: boolean; }

interface BackupItem {
  name: string;
  path: string;
  size: number;
  sizeMB: string;
  created: string | Date;
  createdISO: string;
}

interface BackupStatus {
  enabled: boolean;
  autoIntervalHours: number;
  retentionDays: number;
  compress: boolean;
  backupDir: string;
  totalBackups: number;
  totalSizeMB: string;
  lastBackup: string | null;
}

const ParametresBackup: React.FC<ParametresBackupProps> = ({ isDark }) => {
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<string>('');
  const [statusLoading, setStatusLoading] = useState(true);
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [backupList, setBackupList] = useState<BackupItem[]>([]);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);
  const [pendingRestorePath, setPendingRestorePath] = useState<string | null>(null);

  const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '' });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });

  const mountedRef = useRef(true);

  const showSuccess = (title: string, message: string) =>
    setSuccessModal({ isOpen: true, title, message });
  const showError = (title: string, message: string) =>
    setErrorModal({ isOpen: true, title, message });

  // ═══════════════════════════════════════════════════════════
  // ⭐ LOAD STATUS + LIST
  // ═══════════════════════════════════════════════════════════
  const loadBackupStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const [statusRes, listRes] = await Promise.allSettled([
        window.api.backup.status(),
        window.api.backup.list(10),
      ]);

      if (!mountedRef.current) return;

      if (statusRes.status === 'fulfilled' && statusRes.value?.success) {
        setBackupStatus(statusRes.value.data);
      }

      if (listRes.status === 'fulfilled' && listRes.value?.success) {
        setBackupList(listRes.value.data || []);
      }
    } catch (err) {
      console.error('Erreur chargement statut backup:', err);
    } finally {
      if (mountedRef.current) setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadBackupStatus();
    return () => { mountedRef.current = false; };
  }, [loadBackupStatus]);

  // ═══════════════════════════════════════════════════════════
  // ⭐ LISTENER: restore progress avy amin'ny main process
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    let unsub: (() => void) | null = null;
    try {
      // @ts-ignore — raha misy listener "on" amin'ny preload
      if ((window as any).api?.app?.onRestoreStarting) {
        // @ts-ignore
        unsub = (window as any).api.app.onRestoreStarting(() => {
          setRestoreProgress('Restauration en cours...');
        });
      }
    } catch (_) {}
    return () => { try { unsub && unsub(); } catch (_) {} };
  }, []);

  // ═══════════════════════════════════════════════════════════
  // ⭐ BACKUP
  // ═══════════════════════════════════════════════════════════
  const handleBackup = async () => {
    if (backupLoading) return;
    setBackupLoading(true);
    try {
      const result = await window.api.backup.database();

      if (result?.success) {
        const filename = result.path ? result.path.split(/[\/\\]/).pop() : 'inconnu';
        showSuccess(
          'Sauvegarde réussie',
          `La base de données a été sauvegardée avec succès.\nFichier : ${filename}`
        );
        await loadBackupStatus();
      } else if (result?.canceled) {
        console.log('Sauvegarde annulée par l\'utilisateur');
      } else {
        throw new Error(result?.error || 'Échec de la sauvegarde');
      }
    } catch (error: any) {
      showError('❌ Erreur de sauvegarde', error.message || 'Impossible d\'effectuer la sauvegarde.');
    } finally {
      if (mountedRef.current) setBackupLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // ⭐ RESTORE — Click 1 : sélection fichier
  // ═══════════════════════════════════════════════════════════
  const handleRestoreClick = async () => {
    try {
      const result = await window.api.dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Fichiers de sauvegarde', extensions: ['db', 'gz', 'backup'] },
          { name: 'Tous les fichiers', extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePaths?.length) return;

      // ⭐ Asio confirmation alohan'ny restore
      setPendingRestorePath(result.filePaths[0]);
      setShowConfirmRestore(true);
    } catch (err: any) {
      showError('Erreur', err.message || 'Impossible de sélectionner le fichier.');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // ⭐ RESTORE — Click 2 : confirmation → exécution
  // ═══════════════════════════════════════════════════════════
  const handleConfirmRestore = async () => {
    if (!pendingRestorePath) return;
    setShowConfirmRestore(false);
    setRestoreLoading(true);
    setRestoreProgress('Préparation de la restauration...');

    try {
      // ⭐ Fanairana kely mba hahafahan'ny UI mamelombelona
      await new Promise((r) => setTimeout(r, 100));
      setRestoreProgress('Restauration en cours...');

      const restoreResult = await window.api.backup.restore(pendingRestorePath);

      if (restoreResult?.success) {
        setRestoreProgress('Vérification...');
        showSuccess(
          'Restauration réussie',
          restoreResult.message ||
          'La base de données a été restaurée. L\'application va se recharger automatiquement.'
        );
        // ⭐ Ny reload ataon'ny main process — tsy mila atao eto
      } else {
        throw new Error(restoreResult?.error || 'Échec de la restauration');
      }
    } catch (error: any) {
      showError(
        '❌ Erreur de restauration',
        error.message || 'Impossible de restaurer la base de données.'
      );
    } finally {
      if (mountedRef.current) {
        setRestoreLoading(false);
        setRestoreProgress('');
        setPendingRestorePath(null);
      }
    }
  };

  // ═══════════════════════════════════════════════════════════
  // ⭐ DELETE BACKUP
  // ═══════════════════════════════════════════════════════════
  const handleDeleteBackup = async (path: string, name: string) => {
    if (!window.confirm(`Supprimer la sauvegarde "${name}" ?`)) return;
    try {
      const result = await window.api.backup.delete(path);
      if (result?.success) {
        await loadBackupStatus();
      } else {
        showError('Erreur', result?.error || 'Impossible de supprimer.');
      }
    } catch (err: any) {
      showError('Erreur', err.message);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // ⭐ FORMAT DATE
  // ═══════════════════════════════════════════════════════════
  const formatDate = (iso: string | null | undefined): string => {
    if (!iso) return 'Aucune';
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return 'Invalide';
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const mn = String(d.getMinutes()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${mn}`;
    } catch {
      return 'Invalide';
    }
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* ═══ Status Cards ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div
          className="rounded-xl border-[0.5px] p-3.5"
          style={{
            background: isDark ? '#0F172A' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <HardDrive size={15} strokeWidth={2.2} className="text-brand-500" />
            <span
              className="text-[12px] font-semibold uppercase tracking-[0.06em] leading-[1.3]"
              style={{ color: isDark ? '#94A3B8' : '#64748B' }}
            >
              Dernière sauvegarde
            </span>
          </div>
          <p
            className="text-[14px] font-semibold leading-tight"
            style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
          >
            {statusLoading ? '...' : formatDate(backupStatus?.lastBackup)}
          </p>
        </div>

        <div
          className="rounded-xl border-[0.5px] p-3.5"
          style={{
            background: isDark ? '#0F172A' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Database size={15} strokeWidth={2.2} className="text-emerald-500" />
            <span
              className="text-[12px] font-semibold uppercase tracking-[0.06em] leading-[1.3]"
              style={{ color: isDark ? '#94A3B8' : '#64748B' }}
            >
              Nombre de sauvegardes
            </span>
          </div>
          <p
            className="text-[14px] font-semibold leading-tight"
            style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
          >
            {statusLoading ? '...' : (backupStatus?.totalBackups ?? 0)}
            <span className="ml-2 text-[12px] font-normal" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              ({backupStatus?.totalSizeMB ?? 0} MB)
            </span>
          </p>
        </div>

        <div
          className="rounded-xl border-[0.5px] p-3.5"
          style={{
            background: isDark ? '#0F172A' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock size={15} strokeWidth={2.2} className="text-amber-500" />
            <span
              className="text-[12px] font-semibold uppercase tracking-[0.06em] leading-[1.3]"
              style={{ color: isDark ? '#94A3B8' : '#64748B' }}
            >
              Statut
            </span>
          </div>
          <p
            className="text-[14px] font-semibold leading-tight"
            style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
          >
            {backupStatus?.enabled === false ? 'Désactivé' : 'Opérationnel'}
          </p>
        </div>
      </div>

      {/* ═══ Actions ═══ */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleBackup}
          disabled={backupLoading || restoreLoading}
          className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg text-[14px] font-semibold text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: '#4F46E5' }}
        >
          {backupLoading ? (
            <RefreshCw size={17} className="animate-spin" />
          ) : (
            <Save size={17} strokeWidth={2.2} />
          )}
          {backupLoading ? 'Sauvegarde en cours...' : 'Sauvegarder maintenant'}
        </button>
        <button
          onClick={handleRestoreClick}
          disabled={restoreLoading || backupLoading}
          className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg border text-[14px] font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/[0.06]"
          style={{
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
            color: isDark ? '#94A3B8' : '#64748B',
          }}
        >
          {restoreLoading ? (
            <RefreshCw size={17} className="animate-spin" />
          ) : (
            <Upload size={17} strokeWidth={2.2} />
          )}
          {restoreLoading ? (restoreProgress || 'Restauration...') : 'Restaurer une sauvegarde'}
        </button>
      </div>

      {/* ═══ Progress bar rehefa restore ═══ */}
      {restoreLoading && restoreProgress && (
        <div
          className="rounded-lg border p-3 flex items-center gap-2.5"
          style={{
            background: isDark ? 'rgba(79,70,229,0.10)' : 'rgba(79,70,229,0.05)',
            borderColor: isDark ? 'rgba(79,70,229,0.30)' : 'rgba(79,70,229,0.20)',
          }}
        >
          <RefreshCw size={16} className="animate-spin text-brand-500" />
          <p className="text-[13px] font-medium" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
            {restoreProgress}
          </p>
        </div>
      )}

      {/* ═══ Liste sauvegardes récentes ═══ */}
      {backupList.length > 0 && (
        <div
          className="rounded-xl border-[0.5px] p-3.5"
          style={{
            background: isDark ? '#0F172A' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
          }}
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <FolderOpen size={15} strokeWidth={2.2} className="text-brand-500" />
              <span
                className="text-[12px] font-semibold uppercase tracking-[0.06em]"
                style={{ color: isDark ? '#94A3B8' : '#64748B' }}
              >
                Sauvegardes récentes
              </span>
            </div>
            <button
              onClick={loadBackupStatus}
              className="text-[12px] font-medium text-brand-500 hover:text-brand-600 transition-colors"
            >
              Actualiser
            </button>
          </div>

          <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
            {backupList.map((item) => (
              <div
                key={item.path}
                className="flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg transition-colors"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                }}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-[13px] font-medium"
                    style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
                    title={item.name}
                  >
                    {item.name}
                  </p>
                  <p
                    className="text-[11.5px] mt-0.5"
                    style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                  >
                    {formatDate(item.createdISO)} · {item.sizeMB} MB
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteBackup(item.path, item.name)}
                  className="shrink-0 p-1.5 rounded-md transition-colors hover:bg-red-500/10 text-red-500"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Warning ═══ */}
      <div
        className="rounded-xl border-[0.5px] p-3.5"
        style={{
          background: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.05)',
          borderColor: isDark ? 'rgba(239,68,68,0.30)' : 'rgba(239,68,68,0.20)',
        }}
      >
        <div className="flex items-start gap-2.5">
         
          <div>
            <p
              className="text-[14px] font-semibold leading-tight"
              style={{ color: isDark ? '#F8FAFC' : '#DC2626' }}
            >
               Attention
            </p>
            <p
              className="text-[13px] mt-1 leading-[1.4]"
              style={{ color: isDark ? '#94A3B8' : '#64748B' }}
            >
              La restauration effacera toutes les données actuelles et les remplacera par celles de la
              sauvegarde. Cette action est irréversible. Un rollback automatique est effectué en cas
              d'erreur.
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ⭐ MODAL CONFIRMATION RESTORE
      ═══════════════════════════════════════════════════════ */}
      {showConfirmRestore && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div
            className="relative max-w-md w-full rounded-xl shadow-2xl border overflow-hidden"
            style={{
              background: isDark ? '#0F172A' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
            }}
          >
            <button
              onClick={() => { setShowConfirmRestore(false); setPendingRestorePath(null); }}
              className="absolute top-3.5 right-3.5 p-1 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.06]"
              style={{ color: isDark ? '#94A3B8' : '#64748B' }}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center pt-5 pb-2">
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-amber-500/10">
                <AlertTriangle size={28} className="text-amber-500" />
              </div>
            </div>

            <div
              className="px-5 py-3 flex items-center justify-center border-b"
              style={{ borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0' }}
            >
              <h2
                className="text-[16px] font-bold"
                style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
              >
                Confirmer la restauration
              </h2>
            </div>

            <div className="p-5">
              <p
                className="text-[14px] leading-[1.5] text-center"
                style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
              >
                Êtes-vous sûr de vouloir restaurer cette sauvegarde ?
              </p>
              <p
                className="text-[12.5px] mt-3 leading-[1.4] text-center px-2 py-2 rounded-lg"
                style={{
                  color: isDark ? '#94A3B8' : '#64748B',
                  background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                }}
              >
                <strong>Toutes les données actuelles seront remplacées.</strong>
                <br />
                Cette action est irréversible. L'application se rechargera automatiquement.
              </p>
              {pendingRestorePath && (
                <p
                  className="text-[11.5px] mt-3 break-all text-center font-mono"
                  style={{ color: isDark ? '#64748B' : '#94A3B8' }}
                >
                  {pendingRestorePath.split(/[\/\\]/).pop()}
                </p>
              )}
            </div>

            <div
              className="flex gap-2.5 px-5 py-3 border-t"
              style={{
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
                background: isDark ? '#0F172A' : '#F8FAFC',
              }}
            >
              <button
                onClick={() => { setShowConfirmRestore(false); setPendingRestorePath(null); }}
                className="flex-1 px-4 py-2 rounded-lg border text-[15px] font-medium transition-colors"
                style={{
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
                  color: isDark ? '#94A3B8' : '#64748B',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmRestore}
                className="flex-1 px-4 py-2 rounded-lg text-[15px] font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors inline-flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                Restaurer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modals ═══ */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, title: '', message: '' })}
        title={successModal.title}
        message={successModal.message}
        buttonText="OK"
        autoCloseDelay={4000}
        isDark={isDark}
      />
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '' })}
        title={errorModal.title}
        message={errorModal.message}
        buttonText="OK"
        autoCloseDelay={5000}
        isDark={isDark}
      />
    </div>
  );
};

export default ParametresBackup;