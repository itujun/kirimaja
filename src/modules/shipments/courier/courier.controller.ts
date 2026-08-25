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

    // POST, bukan GET -- endpoint ini mengubah state (deliveryStatus +
    // menulis ShipmentHistory). GET wajib "safe" (tidak mengubah data di
    // server), karena boleh di-cache, di-prefetch otomatis oleh browser/
    // bot, dan di-retry otomatis oleh HTTP client -- semua itu berbahaya
    // kalau endpoint-nya sebenarnya mengubah data.
    @Post('pick/:trackingNumber')
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

    // POST, bukan GET -- alasan sama seperti pickShipment di atas.
    @Post('deliver-to-branch/:trackingNumber')
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

    // POST, bukan GET -- alasan sama seperti pickShipment di atas.
    @Post('pick-shipment-from-branch/:trackingNumber')
    @RequirePermission('delivery.update')
    async pickShipmentFromBranch(
        @Param('trackingNumber') trackingNumber: string,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<BaseResponse<Shipment>> {
        return {
            message: `Shipment with tracking number ${trackingNumber} picked from branch successfully`,
            data: await this.shipmentsService.pickShipmentFromBranch(
                trackingNumber,
                user.id,
            ),
        };
    }

    // POST, bukan GET -- alasan sama seperti pickShipment di atas.
    @Post('pickup-shipment-from-branch/:trackingNumber')
    @RequirePermission('delivery.update')
    async pickupShipmentFromBranch(
        @Param('trackingNumber') trackingNumber: string,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<BaseResponse<Shipment>> {
        return {
            message: `Shipment with tracking number ${trackingNumber} ready to pick up from branch successfully`,
            data: await this.shipmentsService.pickupShipmentFromBranch(
                trackingNumber,
                user.id,
            ),
        };
    }

    @Post('deliver-to-customer/:trackingNumber')
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
    async deliverToCustomer(
        @Param('trackingNumber') trackingNumber: string,
        @CurrentUser() user: AuthenticatedUser,
        @UploadedFile() photo: Express.Multer.File | undefined,
    ): Promise<BaseResponse<Shipment>> {
        return {
            message: `Shipment with tracking number ${trackingNumber} is on the way to customer from branch successfully`,
            data: await this.shipmentsService.deliverToCustomer(
                trackingNumber,
                user.id,
                photo!,
            ),
        };
    }
}
