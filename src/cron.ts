import type { ScheduledTask } from 'node-cron';
import cron from 'node-cron';

import { config } from './config';
import { runPipeline } from './pipeline';

let scheduledTask: ScheduledTask | null = null;

export function startCron(): void {
	const schedule = config.cron.schedule;

	if (scheduledTask) {
		scheduledTask.stop();
		console.log('[cron] Stopped existing cron task');
	}

	console.log(`[cron] Scheduling pipeline: ${schedule}`);

	if (!cron.validate(schedule)) {
		console.error(`[cron] Invalid cron expression: ${schedule}`);
		return;
	}

	scheduledTask = cron.schedule(schedule, async () => {
		if (config.cron.pausedUntil) {
			if (config.cron.pausedUntil === 'forever') {
				console.log('[cron] Skipping pipeline run: Paused indefinitely');
				return;
			}
			const pausedUntil = new Date(config.cron.pausedUntil);
			if (new Date() < pausedUntil) {
				console.log(`[cron] Skipping pipeline run: Paused until ${config.cron.pausedUntil}`);
				return;
			}
		}

		console.log('[cron] Triggered pipeline run');
		await runPipeline();
	});

	console.log('[cron] Cron started');
}

export function rescheduleCron(newSchedule: string): void {
	console.log(`[cron] Rescheduling to: ${newSchedule}`);
	startCron();
}

export function getSchedule(): string {
	return config.cron.schedule;
}
