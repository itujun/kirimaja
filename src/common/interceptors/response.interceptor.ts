import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { isObject, mapKeys, snakeCase } from 'lodash';

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next
            .handle()
            .pipe(map((data) => this.transformKeysToSnakeCase(data)));
    }

    private transformKeysToSnakeCase(data: any): any {
        if (Array.isArray(data)) {
            return data.map((item) => this.transformKeysToSnakeCase(item));
        } else if (data instanceof Date) {
            return data;
        } else if (isObject(data) && data !== null) {
            const snakeCased = mapKeys(data, (_, key) => snakeCase(key));
            for (const key in snakeCased) {
                snakeCased[key] = this.transformKeysToSnakeCase(
                    snakeCased[key],
                );
            }
            return snakeCased;
        }
        return data;
    }
}
