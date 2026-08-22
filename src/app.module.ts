import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { ProfileModule } from './modules/profile/profile.module';

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
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
