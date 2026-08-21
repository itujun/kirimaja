import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permissions';

// Bentuk metadata yang dihasilkan oleh @RequirePermission(...)
// contoh: ['shipments.create', 'shipments.update']
type SimplePermissionMetadata = string[];

// Bentuk metadata yang dihasilkan oleh @RequireAnyPermission(...) / @RequireAllPermission(...)
// contoh: { type: 'any', permissions: ['shipments.create', 'shipments.update'] }
type CompoundPermissionMetadata = {
    type: 'any' | 'all';
    permissions: string[];
};

// Union dari kedua bentuk di atas -- inilah tipe sebenarnya dari
// nilai yang tersimpan di balik PERMISSION_KEY. Di-export supaya
// PermissionGuard bisa memakai type yang sama persis saat membaca
// metadata lewat Reflector, alih-alih membiarkannya jadi `any`.
export type PermissionMetadata =
    | SimplePermissionMetadata
    | CompoundPermissionMetadata;

export const RequirePermission = (...permissions: string[]) => {
    return SetMetadata(PERMISSION_KEY, permissions);
};

export const RequireAnyPermission = (...permissions: string[]) => {
    return SetMetadata<string, CompoundPermissionMetadata>(PERMISSION_KEY, {
        type: 'any',
        permissions,
    });
};

export const RequireAllPermission = (...permissions: string[]) => {
    return SetMetadata<string, CompoundPermissionMetadata>(PERMISSION_KEY, {
        type: 'all',
        permissions,
    });
};
