import type { ScheduledTask } from 'node-cron';
import cron from 'node-cron';

import { config } from './config';

import { runPipeline } from './pipeline';

let scheduledTask: ScheduledTask | null = null;

export function startCron(): void {
	const schedule = config.cron.schedule;

	console.log(`[cron] Scheduling pipeline: ${schedule}`);

	if (!cron.validate(schedule)) {
		console.error(`[cron] Invalid cron expression: ${schedule}`);
		return;
	}

	scheduledTask = cron.schedule(schedule, async () => {
		console.log('[cron] Triggered pipeline run');

		await runPipeline();
	});

	console.log('[cron] Cron started');
}

export function getSchedule(): string {
	return config.cron.schedule;
}
