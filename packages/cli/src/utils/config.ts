import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { type CageConfig, CageConfigSchema } from '@cage/shared';

export async function loadCageConfig(): Promise<CageConfig | null> {
  const configPath = join(process.cwd(), 'cage.config.json');

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = await readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    return CageConfigSchema.parse(config);
  } catch (error) {
    throw new Error(`Invalid cage.config.json: ${error}`);
  }
}

export async function saveCageConfig(config: CageConfig): Promise<void> {
  const configPath = join(process.cwd(), 'cage.config.json');
  await writeFile(configPath, JSON.stringify(config, null, 2));
}

export function getCageConfigPath(): string {
  return join(process.cwd(), 'cage.config.json');
}

export function isCageInitialized(): boolean {
  return existsSync(getCageConfigPath());
}
