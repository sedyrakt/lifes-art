// ============================================================
// src/types/electron.d.ts - TYPES POUR window.api
// ⭐ FANITSARA: mifanaraka amin'ny backend sy ny frontend
// ============================================================

export {};

declare global {
  interface Window {
    api: {
      // ==================== DB ====================
      db: {
        query: (sql: string, params?: any[]) => Promise<any[]>;
        run: (sql: string, params?: any[]) => Promise<{ lastID: number; changes: number }>;
        getOne: (sql: string, params?: any[]) => Promise<any>;
        queryAsync: (sql: string, params?: any[]) => Promise<any[]>;
        runAsync: (sql: string, params?: any[]) => Promise<{ lastID: number; changes: number }>;
        getOneAsync: (sql: string, params?: any[]) => Promise<any>;
      };

      // ==================== LICENSE ====================
      license: {
        getMachineId: () => Promise<{ success: boolean; data?: string } | string>;
        load: () => Promise<{ success: boolean; data?: string; path?: string; message?: string; code?: number }>;
        save: (data: string) => Promise<{ success: boolean; message?: string; code?: number; path?: string }>;
        reset: () => Promise<{ success: boolean; deleted?: number; message?: string; code?: number; backupPath?: string }>;
        checkStatus: () => Promise<{
          success: boolean;
          exists: boolean;
          isValid: boolean;
          message?: string;
          code?: number;
          daysRemaining?: number;
          minutesRemaining?: number;
          isTest?: boolean;
          isLifetime?: boolean;
          status?: string;
          signature?: string;
          licenseKey?: string;
          activationId?: string;
          packageType?: string;
          expirationDate?: string;
          data?: string;
          path?: string;
        }>;
        getPath: () => Promise<{ success: boolean; path?: string }>;
        getStatusCode: () => Promise<{ success: boolean; code?: number }>;
        validate: (context?: string) => Promise<{ success: boolean; valid?: boolean; message?: string; code?: number }>;
        verify: (licenseKey?: string, signature?: string, payload?: any) => Promise<{
          success: boolean;
          valid: boolean;
          message: string;
          packageType?: string;
          expirationDate?: string;
          machineId?: string;
          code?: number;
          details?: {
            formatOk: boolean;
            signatureOk: boolean;
            machineBindingOk: boolean;
            expirationOk: boolean;
            integrityOk: boolean;
            revocationOk: boolean;
            antiDebugOk: boolean;
            devToolsOk: boolean;
            clockTamperOk: boolean;
          };
        }>;
        activate: (licenseKey: string, signature?: string, payload?: any) => Promise<{
          success: boolean;
          valid: boolean;
          message: string;
          machineId?: string;
          activationId?: string;
          packageType?: string;
          signature?: string;
          expirationDate?: string;
          daysRemaining?: number;
        }>;
        verifyChecksum: (licenseKey: string) => Promise<{ success: boolean; valid: boolean }>;
        getPackages: () => Promise<{
          success: boolean;
          data: Record<string, {
            id: string;
            name: string;
            prefix: string;
            duration: number;
            price: number;
            maxUsers: number;
            maxProducts: number;
            maxClients: number;
            isTest?: boolean;
            isLifetime?: boolean;
          }>;
          message?: string;
        }>;
        getCurrent: () => Promise<{ success: boolean; data?: any; message?: string }>;
        deactivate: () => Promise<{ success: boolean; message?: string; backupPath?: string }>;
        listDatabase: () => Promise<{ success: boolean; data?: any[]; count?: number; message?: string }>;
        clearCache: () => Promise<{ success: boolean; message?: string }>;
        revocation: {
          check: (licenseKey: string, activationId?: string) => Promise<{
            success: boolean;
            revoked: boolean;
            data?: any;
            message?: string;
          }>;
          getStats: () => Promise<{ success: boolean; data?: any; message?: string }>;
          revoke: (licenseKey: string, reason?: string) => Promise<{
            success: boolean;
            revoked: boolean;
            message?: string;
          }>;
          unrevoke: (licenseKey: string) => Promise<{
            success: boolean;
            revoked: boolean;
            message?: string;
          }>;
        };
      };

      // ==================== AUTH ====================
      auth: {
        login: (email: string, password: string, ip: string, userAgent: string) => Promise<any>;
        logout: (token: string) => Promise<{ success: boolean }>;
        verifyToken: (token: string) => Promise<{ valid: boolean; user?: any; message?: string }>;
        hashPassword: (password: string) => Promise<string>;
        verifyPassword: (password: string, hashedPassword: string) => Promise<boolean>;
        changePassword: (userId: number, oldPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
        generate2FA: (email: string) => Promise<{ secret: string; qrCode: string; otpauthUrl: string }>;
        verify2FA: (userId: number, secret: string, token: string) => Promise<boolean>;
        disable2FA: (userId: number) => Promise<{ success: boolean }>;
        verify2FALogin: (userId: number, token: string) => Promise<any>;
      };

      // ==================== USERS ====================
      users: {
        getAll: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getById: (id: number) => Promise<{ success: boolean; data?: any; error?: string }>;
        getByEmail: (email: string) => Promise<{ success: boolean; data?: any; error?: string }>;
        create: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        update: (id: number, data: any) => Promise<{ success: boolean; error?: string }>;
        delete: (id: number) => Promise<{ success: boolean; error?: string }>;
      };

      // ==================== PRODUCTS ====================
      products: {
        getAll: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getById: (id: number) => Promise<{ success: boolean; data?: any; error?: string }>;
        create: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        update: (id: number, data: any) => Promise<{ success: boolean; error?: string }>;
        delete: (id: number) => Promise<{ success: boolean; error?: string }>;
        getAlertes: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getTop: (limit: number) => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getByCategorie: (categorieId: number) => Promise<{ success: boolean; data?: any[]; error?: string }>;
      };

      // ==================== CLIENTS ====================
      clients: {
        getAll: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getById: (id: number) => Promise<{ success: boolean; data?: any; error?: string }>;
        create: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        update: (id: number, data: any) => Promise<{ success: boolean; error?: string }>;
        delete: (id: number) => Promise<{ success: boolean; error?: string }>;
      };

      // ==================== FOURNISSEURS ====================
      fournisseurs: {
        getAll: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getById: (id: number) => Promise<{ success: boolean; data?: any; error?: string }>;
        create: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        update: (id: number, data: any) => Promise<{ success: boolean; error?: string }>;
        delete: (id: number) => Promise<{ success: boolean; error?: string }>;
      };

      // ==================== ORDERS ====================
      orders: {
        getAll: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getById: (id: number) => Promise<{ success: boolean; data?: any; error?: string }>;
        create: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        update: (id: number, data: any) => Promise<{ success: boolean; error?: string }>;
        delete: (id: number) => Promise<{ success: boolean; error?: string }>;
        getDetails: (commandeId: number) => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getByClient: (clientNom: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getProducts: (commandeId: number) => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getWithDetails: (commandeId: number) => Promise<{ success: boolean; data?: any; error?: string }>;
      };

      // ==================== STOCK ====================
      stock: {
        getEntrees: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getSorties: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getMouvements: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getEntreesByProduit: (produitId: number) => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getSortiesByProduit: (produitId: number) => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getMouvementsByProduit: (produitId: number) => Promise<{ success: boolean; data?: any[]; error?: string }>;
        createEntree: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        createSortie: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      };

      // ==================== EMPLOYES ====================
      employes: {
        getAll: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getById: (id: number) => Promise<{ success: boolean; data?: any; error?: string }>;
        create: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        update: (id: number, data: any) => Promise<{ success: boolean; error?: string }>;
        delete: (id: number) => Promise<{ success: boolean; error?: string }>;
      };

      // ==================== EXPENSES ====================
      expenses: {
        getAll: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getById: (id: number) => Promise<{ success: boolean; data?: any; error?: string }>;
        create: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        update: (id: number, data: any) => Promise<{ success: boolean; error?: string }>;
        delete: (id: number) => Promise<{ success: boolean; error?: string }>;
        getByPeriod: (startDate: string, endDate: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
      };

      // ==================== PAYMENTS ====================
      payments: {
        getAll: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getById: (id: number) => Promise<{ success: boolean; data?: any; error?: string }>;
        create: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        update: (id: number, data: any) => Promise<{ success: boolean; error?: string }>;
        delete: (id: number) => Promise<{ success: boolean; error?: string }>;
        getByEmploye: (employeId: number) => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getByPeriod: (mois: number, annee: number) => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getHistorique: (employeId: number, mois?: number, annee?: number) => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getSalaireMensuel: (employeId: number, mois: number, annee: number) => Promise<{ success: boolean; data?: number; error?: string }>;
      };

      // ==================== CATEGORIES ====================
      categories: {
        getAll: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getById: (id: number) => Promise<{ success: boolean; data?: any; error?: string }>;
        create: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        update: (id: number, data: any) => Promise<{ success: boolean; error?: string }>;
        delete: (id: number) => Promise<{ success: boolean; error?: string }>;
      };

      // ==================== DASHBOARD ====================
      dashboard: {
        getStats: () => Promise<{ success: boolean; data?: any; error?: string }>;
        getFinancialSummary: () => Promise<{ success: boolean; data?: any; error?: string }>;
      };

      // ==================== IMAGES ====================
      images: {
        upload: (base64Data: string, folder?: string) => Promise<string>;
        delete: (imagePath: string) => Promise<boolean>;
        getUrl: (imagePath: string) => Promise<string | null>;
      };

      // ==================== FINANCIAL ====================
      financial: {
        getSummary: () => Promise<{ success: boolean; data?: any; error?: string }>;
        getMonthly: (annee?: number) => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getYearly: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
      };

      // ==================== REPORTS ====================
      reports: {
        getAll: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getById: (id: number) => Promise<{ success: boolean; data?: any; error?: string }>;
        create: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        update: (id: number, data: any) => Promise<{ success: boolean; error?: string }>;
        delete: (id: number) => Promise<{ success: boolean; error?: string }>;
        generate: (type: string, params?: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      };

      // ==================== SETTINGS ====================
      settings: {
        getAll: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getById: (id: number) => Promise<{ success: boolean; data?: any; error?: string }>;
        getByKey: (key: string) => Promise<{ success: boolean; data?: any; error?: string }>;
        set: (key: string, value: any) => Promise<{ success: boolean; error?: string }>;
        update: (id: number, data: any) => Promise<{ success: boolean; error?: string }>;
        delete: (id: number) => Promise<{ success: boolean; error?: string }>;
        reset: () => Promise<{ success: boolean; error?: string }>;
      };

      // ==================== NAVIGATION ====================
      navigation: {
        navigateTo: (path: string) => Promise<void>;
        openExternal: (url: string) => Promise<void>;
        openInApp: (url: string) => Promise<void>;
        getCurrentUrl: () => Promise<string>;
        reload: () => Promise<void>;
        goBack: () => Promise<void>;
      };

      // ==================== BACKUP ====================
      backup: {
        database: () => Promise<{ success: boolean; path?: string; error?: string }>;
        restore: (backupPath: string) => Promise<{ success: boolean; error?: string }>;
        vacuum: () => Promise<{ success: boolean; error?: string }>;
        optimize: () => Promise<{ success: boolean; error?: string }>;
        list: (limit?: number) => Promise<{ success: boolean; data?: any[]; error?: string }>;
        delete: (backupPath: string) => Promise<{ success: boolean; error?: string }>;
        auto: () => Promise<{ success: boolean; error?: string }>;
        status: () => Promise<{ success: boolean; data?: any; error?: string }>;
      };

      // ==================== UTILS ====================
      utils: {
        exportData: (data: any, format: string) => Promise<string>;
        print: () => Promise<void>;
      };

      // ==================== PLATFORM ====================
      platform: {
        name: string;
        arch: string;
        electron: string;
        node: string;
        app: string;
        version: string;
      };
    };

    // ⭐ FANITSARA: electronAPI alias (mifanaraka amin'ny api)
    electronAPI: Window['api'];
  }
}