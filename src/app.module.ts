import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { RolesModule } from './modules/roles/roles.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true, // supaya configService bisa dipakai di semua module tanpa import ulang
            validate: validateEnv, // dijalankan otomatis saat app start
        }),
        AuthModule,
        RolesModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
