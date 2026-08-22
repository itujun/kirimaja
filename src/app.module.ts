import { Module } from '@nestjs/common';
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

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true, // supaya configService bisa dipakai di semua module tanpa import ulang
            validate: validateEnv, // dijalankan otomatis saat app start
        }),
        AuthModule,
        RolesModule,
        PermissionsModule,
        ProfileModule,
        BranchesModule,
        EmployeeBranchesModule,
        UserAddressesModule,
        QueueModule,
    ],
    controllers: [AppController],
    providers: [AppService, EmailService],
})
export class AppModule {}
