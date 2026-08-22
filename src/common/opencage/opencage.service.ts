import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Env } from 'src/config/env.schema';

@Injectable()
export class OpenCageService {
    constructor(private readonly configService: ConfigService<Env, true>) {}

    async geocode(address: string): Promise<{ lat: number; lng: number }> {
        const apiKey = this.configService.get('OPENCAGE_API_KEY', {
            infer: true,
        });
        if (!apiKey) {
            throw new BadRequestException(
                'API key not found in environment variables',
            );
        }

        try {
            const response = await axios.get(
                'https://api.opencagedata.com/geocode/v1/json',
                {
                    params: {
                        q: address,
                        key: apiKey,
                        limit: 1,
                    },
                },
            );
            const result = response.data.results[0]?.geometry;
            if (!result) {
                throw new BadRequestException(
                    'No results found for provided address',
                );
            }
            return {
                lat: result.lat,
                lng: result.lng,
            };
        } catch (error) {
            console.error('OpenCage geocoding error:', error);
            throw new BadRequestException('OpenCage geocoding error');
        }
    }
}
