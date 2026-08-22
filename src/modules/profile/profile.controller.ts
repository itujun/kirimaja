import {
    Controller,
    Get,
    Req,
    Patch,
    Param,
    UseGuards,
    Body,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/logged-in.guard';
import { BaseResponse } from '../roles/interface/base-response.interface';
import { ProfileResponse } from './response/profile.response';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
    constructor(private readonly profileService: ProfileService) {}

    @Get()
    async findOne(
        @Req() req: Request & { user?: any },
    ): Promise<BaseResponse<ProfileResponse>> {
        return {
            message: 'profile retrieved successfully',
            data: await this.profileService.findOne(req.user.id),
        };
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateProfileDto: UpdateProfileDto,
    ) {
        return this.profileService.update(+id, updateProfileDto);
    }
}
