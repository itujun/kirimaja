import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from 'src/modules/permissions/permissions.service';
import {
    PERMISSION_KEY,
    PermissionMetadata,
} from '../decorators/permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private permissionService: PermissionsService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Generic <PermissionMetadata> di sini kuncinya: sekarang
        // TypeScript tahu persis requiredPermissions itu berbentuk
        // string[] ATAU { type, permissions }, bukan `any` lagi.
        const requiredPermissions =
            this.reflector.getAllAndOverride<PermissionMetadata>(
                PERMISSION_KEY,
                [context.getHandler(), context.getClass()],
            );

        if (!requiredPermissions) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('User not authenticated');
        }

        // Type guard: mengecek requiredPermissions itu array atau bukan.
        // Setelah ini, di dalam blok if, TypeScript otomatis tahu
        // requiredPermissions PASTI objek { type, permissions } --
        // jadi .type dan .permissions aman diakses tanpa error.
        if (!Array.isArray(requiredPermissions)) {
            const { type, permissions } = requiredPermissions;

            const hasPermission =
                type === 'any'
                    ? await this.permissionService.userHasAnyPermission(
                          user.id,
                          permissions,
                      )
                    : await this.permissionService.userHasAllPermission(
                          user.id,
                          permissions,
                      );

            if (!hasPermission) {
                throw new ForbiddenException(
                    `Access denied. Require permissions: ${permissions.join(', ')}`,
                );
            }

            return true;
        }

        // Di sini TypeScript otomatis tahu requiredPermissions adalah
        // string[], karena kemungkinan lain sudah ditangani di atas.
        const permissions = requiredPermissions;
        const hasPermission = await this.permissionService.userHasAllPermission(
            user.id,
            permissions,
        );

        if (!hasPermission) {
            throw new ForbiddenException(
                `Access denied. Require permissions: ${permissions.join(', ')}`,
            );
        }

        return true;
    }
}
