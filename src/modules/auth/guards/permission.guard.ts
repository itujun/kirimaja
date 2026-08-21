import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from 'src/modules/permissions/permissions.service';
import { PERMISSION_KEY } from '../decorators/permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private permissionService: PermissionsService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermissions = this.reflector.getAllAndOverride(
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

        // HAndle different permissions requirement types
        if (
            typeof requiredPermissions == 'object' &&
            requiredPermissions.type
        ) {
            const { type, permissions } = requiredPermissions;

            let hasPermission = false;

            if (type === 'any') {
                hasPermission =
                    await this.permissionService.userHasAnyPermission(
                        user.id,
                        permissions,
                    );
            } else if (type === 'all') {
                hasPermission =
                    await this.permissionService.userHasAllPermission(
                        user.id,
                        permissions,
                    );
            }

            if (!hasPermission) {
                throw new ForbiddenException(
                    `Access denied. Require permissions: ${permissions.join(', ')}`,
                );
            }
        } else {
            // Handle simple array of permissions (default to 'all' logic)
            const permissions = Array.isArray(requiredPermissions)
                ? requiredPermissions
                : [requiredPermissions];
            const hasPermission =
                await this.permissionService.userHasAllPermission(
                    user.id,
                    permissions,
                );

            if (!hasPermission) {
                throw new ForbiddenException(
                    `Access denied. Require permissions: ${permissions.join(', ')}`,
                );
            }
        }

        return true;
    }
}
