import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

// Dipakai di controller manapun yang sudah dilindungi JwtAuthGuard, sebagai
// pengganti `@Req() req: Request & { user?: any }`.
//
// Kenapa ini lebih baik daripada akses req.user langsung:
// 1. Type-safe -- TypeScript tahu persis bentuk `user` (AuthenticatedUser),
//    bukan `any`. Typo seperti `user.Id` akan ketahuan saat compile.
// 2. DRY -- logic "ambil user dari request" cuma ditulis sekali di sini,
//    dipakai lagi di controller mana pun tanpa copy-paste.
// 3. Testable -- gampang di-mock di unit test controller, tidak perlu
//    bikin object Request Express yang lengkap.
//
// Penempatan: sengaja di `modules/auth/decorators`, BUKAN `common/decorators`,
// karena decorator ini bergantung pada bentuk data (`AuthenticatedUser`) yang
// didefinisikan oleh modul auth. Menaruhnya di `common` akan membuat modul
// generik jadi tahu detail domain auth -- membalik arah dependency yang benar.
export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);
