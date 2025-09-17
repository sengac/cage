import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { Logger } from '@cage/shared';

const logger = new Logger();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));

  // Enable CORS for frontend
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Cage API')
    .setDescription('Controlled AI Environment - Hook infrastructure for Claude Code')
    .setVersion('1.0')
    .addTag('hooks')
    .addTag('events')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3790;
  await app.listen(port);

  logger.info(`Cage backend server listening on port ${port}`);
  logger.info(`API documentation available at http://localhost:${port}/api`);
}

bootstrap().catch((error) => {
  logger.error('Failed to start server', { error: error.message });
  process.exit(1);
});