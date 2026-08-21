import { Env, envSchema } from './env.schema';

export function validateEnv(config: Record<string, unknown>): Env {
    const result = envSchema.safeParse(config);

    if (!result.success) {
        const formattedErrors = result.error.errors
            .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
            .join('\n');

        // sengaja pakai console.error + process.exit,
        // BUKAN throw, karena ini terjadi sebelum NEst app context siap
        console.error(
            '❌ Environment variable validation gagal:\n' + formattedErrors,
        );
        process.exit(1);
    }

    return result.data;
}
