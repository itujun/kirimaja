import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permissions';

export const RequirePermission = (...permissions: string[]) => {
    SetMetadata(PERMISSION_KEY, permissions);
};

export const RequireAnyPermission = (...permissions: string[]) => {
    SetMetadata(PERMISSION_KEY, { type: 'any', permissions });
};

export const RequireAllPermission = (...permissions: string[]) => {
    SetMetadata(PERMISSION_KEY, { type: 'all', permissions });
};
