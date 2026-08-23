import {
    BadRequestException,
    Injectable,
    Logger,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Env } from 'src/config/env.schema';

@Injectable()
export class OpenCageService {
    private readonly logger = new Logger(OpenCageService.name);

    constructor(private readonly configService: ConfigService<Env, true>) {}

    async geocode(address: string): Promise<{ lat: number; lng: number }> {
        // Tidak perlu cek `if (!apiKey)` di sini -- OPENCAGE_API_KEY
        // sudah wajib diisi & divalidasi fail-fast di startup lewat
        // envSchema (lihat env.schema.ts + env.validation.ts), jadi di
        // titik ini nilainya dijamin selalu ada.
        const apiKey = this.configService.get('OPENCAGE_API_KEY', {
            infer: true,
        });

        let response;
        try {
            response = await axios.get(
                'https://api.opencagedata.com/geocode/v1/json',
                {
                    params: {
                        q: address,
                        key: apiKey,
                        limit: 1,
                    },
                },
            );
        } catch (error) {
            // Gagal DI SINI = request ke OpenCage sendiri yang gagal
            // (network error, API key ditolak, quota habis, OpenCage
            // down, dsb) -- BUKAN salah client, jadi bukan 400.
            this.logger.error('OpenCage geocoding request failed', error);
            throw new ServiceUnavailableException(
                'Failed to resolve address coordinates, please try again later',
            );
        }

        const result = response.data.results[0]?.geometry;
        if (!result) {
            // Gagal DI SINI = request ke OpenCage sukses, tapi alamat
            // yang dikirim client memang tidak menghasilkan lokasi apa
            // pun -- ini betul salah client, 400 tetap tepat.
            throw new BadRequestException(
                'No results found for provided address',
            );
        }

        return {
            lat: result.lat,
            lng: result.lng,
        };
    }
}
