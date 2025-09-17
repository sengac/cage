import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Bootstrap the Cage backend server
 *
 * This is the main entry point that:
 * - Starts the NestJS application
 * - Configures Swagger documentation
 * - Sets up CORS for local development
 * - Listens on the configured port
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for local development
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  });

  // Set global prefix for API routes
  app.setGlobalPrefix('api', {
    exclude: ['/health']
  });

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Cage API')
    .setDescription('Controlled AI Environment - Hook Infrastructure API')
    .setVersion('0.0.1')
    .addTag('hooks', 'Claude Code hook endpoints')
    .addTag('events', 'Event management and querying')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // Get port from environment or default to 3790
  const port = process.env.PORT || 3790;

  await app.listen(port);

  console.log(`🚀 Cage backend server running on http://localhost:${port}`);
  console.log(`📚 Swagger documentation available at http://localhost:${port}/api-docs`);
  console.log(`💓 Health check available at http://localhost:${port}/health`);
  console.log('🎣 Hook endpoints available at /claude/hooks/*');
  console.log('📊 Event endpoints available at /api/events/*');

  // Log successful startup for integration tests
  console.log('Nest application successfully started');
}

// Start the server
bootstrap().catch((error) => {
  console.error('Failed to start Cage backend:', error);
  process.exit(1);
});