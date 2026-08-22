import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { EmailJobData } from './processors/email-queue.processor';

@Injectable()
export class QueueService {
    constructor(
        @InjectQueue('email-queue') private readonly emailQueue: Queue,
    ) {}

    async addEmailJob(
        data: EmailJobData,
        options?: { delay?: number; attempts?: number },
    ) {
        return this.emailQueue.add('send-email', data, {
            delay: options?.delay || 0,
            attempts: options?.attempts || 3,
            removeOnComplete: true,
            removeOnFail: true,
            backoff: {
                type: 'exponential',
                delay: options?.delay || 1000,
            },
        });
    }
}
