import {
    MiddlewareConsumer,
    Module,
    NestModule,
    RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { ProfileModule } from './modules/profile/profile.module';
import { BranchesModule } from './modules/branches/branches.module';
import { EmployeeBranchesModule } from './modules/employee-branches/employee-branches.module';
import { UserAddressesModule } from './modules/user-addresses/user-addresses.module';
import { EmailService } from './common/email/email.service';
import { QueueModule } from './common/queue/queue.module';
import { ShipmentsModule } from './modules/shipments/shipments.module';
import { HistoryModule } from './modules/history/history.module';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validate: validateEnv,
        }),
        AuthModule,
        RolesModule,
        PermissionsModule,
        ProfileModule,
        BranchesModule,
        EmployeeBranchesModule,
        UserAddressesModule,
        QueueModule,
        ShipmentsModule,
        HistoryModule,
    ],
    controllers: [AppController],
    providers: [AppService, EmailService],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer
            .apply(CsrfMiddleware)
            .exclude(
                // Belum ada sesi/cookie sama sekali di titik ini, jadi tidak
                // ada apapun yang bisa dicocokkan -- middleware toh akan
                // lolos otomatis, tapi exclude eksplisit di sini biar
                // maksudnya jelas dibaca orang lain (atau kamu sendiri,
                // 6 bulan lagi).
                { path: 'auth/login', method: RequestMethod.POST },
                { path: 'auth/register', method: RequestMethod.POST },
                // Xendit yang panggil endpoint ini server-to-server, tidak
                // pernah bawa cookie browser sama sekali -- proteksinya
                // sudah XenditWebhookGuard (signature-based), bukan cookie.
                { path: 'shipments/webhook/(.*)', method: RequestMethod.ALL },
            )
            .forRoutes('*');
    }
}
