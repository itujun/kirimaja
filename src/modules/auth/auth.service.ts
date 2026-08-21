import {
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { AuthLoginDTO } from './dto/auth-login.dto';
import {
    AuthLoginResponse,
    RoleResponse,
    UserResponse,
} from './response/auth-login.response';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import { AuthRegisterDTO } from './dto/auth-register.dto';

@Injectable()
export class AuthService {
    constructor(
        private prismaService: PrismaService,
        private jwtService: JwtService,
    ) {}

    async login(request: AuthLoginDTO): Promise<AuthLoginResponse> {
        const user = await this.prismaService.user.findUnique({
            where: { email: request.email },
            include: {
                role: {
                    include: {
                        rolePermissions: {
                            include: {
                                permission: true,
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const isPasswordValid = await bcrypt.compare(
            request.password,
            user.password,
        );
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid password');
        }

        const accessToken = this.jwtService.sign({
            sub: user.id,
            email: user.email,
            name: user.name,
            roleId: user.roleId,
        });

        const userResponse = plainToInstance(
            UserResponse,
            {
                ...user,
                role: RoleResponse.fromEntity(user.role), // pakai mapper yang sama dengan RolesService
            },
            { excludeExtraneousValues: true },
        );

        return plainToInstance(
            AuthLoginResponse,
            { accessToken, user: userResponse },
            { excludeExtraneousValues: true },
        );
    }

    async register(request: AuthRegisterDTO): Promise<AuthLoginResponse> {
        const existingUser = await this.prismaService.user.findUnique({
            where: { email: request.email },
        });

        if (existingUser) {
            throw new ConflictException('User already exists');
        }

        const role = await this.prismaService.role.findFirst({
            where: { key: 'customer' },
        });

        if (!role) {
            throw new NotFoundException('Role not found');
        }

        const hashedPassword = await bcrypt.hash(request.password, 10);

        const user = await this.prismaService.user.create({
            data: {
                name: request.name,
                email: request.email,
                password: hashedPassword,
                phoneNumber: request.phone_number,
                roleId: role.id,
            },
            include: {
                role: {
                    include: {
                        rolePermissions: {
                            include: {
                                permission: true,
                            },
                        },
                    },
                },
            },
        });

        const accessToken = this.jwtService.sign({
            sub: user.id,
            email: user.email,
            name: user.name,
            roleId: user.roleId,
        });

        const userResponse = plainToInstance(
            UserResponse,
            {
                ...user,
                role: RoleResponse.fromEntity(user.role), // pakai mapper yang sama dengan RolesService
            },
            { excludeExtraneousValues: true },
        );

        return plainToInstance(
            AuthLoginResponse,
            { accessToken, user: userResponse },
            { excludeExtraneousValues: true },
        );
    }
}
