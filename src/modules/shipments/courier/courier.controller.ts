import {
    Controller,
    Get,
    Param,
    Post,
    UnsupportedMediaTypeException,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/logged-in.guard';
import { PermissionGuard } from 'src/modules/auth/guards/permission.guard';
import { ShipmentCourierService } from './courier.service';
import { BaseResponse } from 'src/modules/roles/interface/base-response.interface';
import { Shipment } from '@prisma/client';
import { RequirePermission } from 'src/modules/auth/decorators/permission.decorator';
import { AuthenticatedUser } from 'src/modules/auth/strategies/jwt.strategy';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
    ALLOWED_COURIER_PHOTO_MIME_TYPES,
    MAX_COURIER_PHOTO_SIZE_BYTES,
} from './constants/courier-photo.constant';

@Controller('shipments/courier')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ShipmentsCourierController {
    constructor(private readonly shipmentsService: ShipmentCourierService) {}

    @Get('list')
    @RequirePermission('delivery.read')
    async findAll(): Promise<BaseResponse<Shipment[]>> {
        return {
            message: 'Shipments retrieved successfully',
            data: await this.shipmentsService.findAll(),
        };
    }

    @Get('pick/:trackingNumber')
    @RequirePermission('delivery.update')
    async pickShipment(
        @Param('trackingNumber') trackingNumber: string,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<BaseResponse<Shipment>> {
        return {
            message: `Shipment with tracking number ${trackingNumber} picked successfully`,
            data: await this.shipmentsService.pickShipment(
                trackingNumber,
                user.id,
            ),
        };
    }

    @Post('pickup/:trackingNumber')
    @RequirePermission('delivery.update')
    @UseInterceptors(
        FileInterceptor('photo', {
            storage: memoryStorage(),
            limits: { fileSize: MAX_COURIER_PHOTO_SIZE_BYTES },
            fileFilter: (req, file, cb) => {
                if (!ALLOWED_COURIER_PHOTO_MIME_TYPES.includes(file.mimetype)) {
                    return cb(
                        new UnsupportedMediaTypeException(
                            `Only image files are allowed (${ALLOWED_COURIER_PHOTO_MIME_TYPES.join(', ')})`,
                        ),
                        false,
                    );
                }
                cb(null, true);
            },
        }),
    )
    async pickUpShipment(
        @Param('trackingNumber') trackingNumber: string,
        @CurrentUser() user: AuthenticatedUser,
        @UploadedFile() photo: Express.Multer.File | undefined,
    ): Promise<BaseResponse<Shipment>> {
        return {
            message: `Shipment with tracking number ${trackingNumber} picked up successfully`,
            data: await this.shipmentsService.pickUpShipment(
                trackingNumber,
                user.id,
                photo!,
            ),
        };
    }

    @Get('deliver-to-branch/:trackingNumber')
    @RequirePermission('delivery.update')
    async deliverShipmentToBranch(
        @Param('trackingNumber') trackingNumber: string,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<BaseResponse<Shipment>> {
        return {
            message: `Shipment with tracking number ${trackingNumber} delivered to branch successfully`,
            data: await this.shipmentsService.deliverShipmentToBranch(
                trackingNumber,
                user.id,
            ),
        };
    }
}
