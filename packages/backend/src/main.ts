import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

/**
 * Bootstrap the CAGE Backend Server
 *
 * This is the main entry point that:
 * - Starts the NestJS application
 * - Configures comprehensive Swagger/OpenAPI documentation
 * - Sets up CORS for local development
 * - Configures global validation pipes
 * - Listens on the configured port (default: 3790)
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose']
  });

  // Enable CORS for local development
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3790'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });

  // Enable global validation pipe for DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,           // Strip properties not defined in DTO
    forbidNonWhitelisted: true, // Throw error for non-whitelisted properties
    transform: true,            // Auto-transform to DTO types
    transformOptions: {
      enableImplicitConversion: true // Convert primitive types
    }
  }));

  // Set global prefix for API routes
  app.setGlobalPrefix('api', {
    exclude: ['/health'] // Health check at root level for monitoring
  });

  // Setup comprehensive Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('CAGE API')
    .setDescription(`
# CAGE - Code Alignment Guard Engine

CAGE is a developer productivity tool that provides boundaries, context, and guidance to help AI produce code matching living specifications.

## Overview

This API serves as the backend for the CAGE system, handling:
- **Claude Code Hook Events**: Captures all 9 types of Claude Code hooks for comprehensive AI interaction monitoring
- **Event Management**: Stores, queries, and analyzes AI coding session events
- **Health Monitoring**: Provides detailed health checks for system monitoring

## Key Features

- **Real-time Event Streaming**: Server-Sent Events (SSE) for live event monitoring
- **Comprehensive Hook Support**: All 9 Claude Code hook types fully documented
- **Event Analytics**: Statistical analysis and aggregation of AI coding patterns
- **Session Tracking**: Complete session lifecycle management from start to end

## Authentication

Currently, this API does not require authentication as it runs locally for development purposes.

## Rate Limiting

No rate limiting is enforced for local development. In production, appropriate rate limits should be configured.

## Response Format

All successful responses return JSON with appropriate HTTP status codes:
- **200 OK**: Successful GET requests and hook processing
- **201 Created**: Successful resource creation
- **400 Bad Request**: Invalid request payload
- **500 Internal Server Error**: Server-side errors

## Contact

- **Website**: [https://cage.tools](https://cage.tools)
- **GitHub**: [https://github.com/sengac/cage](https://github.com/sengac/cage)
- **License**: MIT
    `)
    .setVersion('0.0.1')
    .setContact(
      'CAGE Development Team',
      'https://cage.tools',
      'support@cage.tools'
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addTag('Hooks', 'Claude Code hook endpoints for AI interaction monitoring')
    .addTag('Events', 'Event management, querying, and analytics')
    .addTag('Health', 'System health monitoring and diagnostics')
    .addServer('http://localhost:3790', 'Local Development Server')
    .build();

  // Create Swagger document - wrapped in try-catch to debug circular dependency
  let document;
  try {
    document = SwaggerModule.createDocument(app, config);
  } catch (error) {
    console.error('Failed to create Swagger document:', error);
    // Continue without Swagger for now
  }

  // Custom Swagger UI options for better presentation
  if (document) {
    SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'CAGE API Documentation',
    customfavIcon: 'https://cage.tools/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin-bottom: 50px }
      .swagger-ui .info .title { font-size: 2.5em }
      .swagger-ui .scheme-container { background: #f5f5f5; padding: 15px; border-radius: 5px; }
      .swagger-ui .btn.authorize { background-color: #4CAF50; }
      .swagger-ui .model-box { background: #fafafa; }
      .swagger-ui .parameter__name.required::after { color: red; content: " *"; }
    `,
    swaggerOptions: {
      docExpansion: 'none',     // Collapse all by default
      filter: true,              // Enable search/filter
      showRequestDuration: true, // Show request duration
      syntaxHighlight: {
        activate: true,
        theme: 'monokai'        // Code syntax highlighting theme
      },
      tryItOutEnabled: true,    // Enable "Try it out" by default
      requestSnippetsEnabled: true,
      persistAuthorization: true,
      displayRequestDuration: true,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      displayOperationId: false,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha'
    }
  });
  }

  // Get port from environment or default to 3790
  const port = process.env.PORT || 3790;

  await app.listen(port);

  // Enhanced startup logging
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                     CAGE Backend Server                     ║
╠════════════════════════════════════════════════════════════╣
║  🚀 Server:       http://localhost:${port}                     ║
║  📚 API Docs:     http://localhost:${port}/api-docs            ║
║  💓 Health:       http://localhost:${port}/health              ║
║  🎣 Hooks:        http://localhost:${port}/claude/hooks/*      ║
║  📊 Events:       http://localhost:${port}/api/events/*        ║
║  🌊 SSE Stream:   http://localhost:${port}/api/events/stream   ║
╠════════════════════════════════════════════════════════════╣
║  Environment:     ${process.env.NODE_ENV || 'development'}                             ║
║  Node Version:    ${process.version}                             ║
║  Process ID:      ${process.pid}                                ║
╚════════════════════════════════════════════════════════════╝
  `);

  // Log successful startup for integration tests
  console.log('Nest application successfully started');
}

// Start the server with error handling
bootstrap().catch((error) => {
  console.error('❌ Failed to start CAGE backend:', error);
  process.exit(1);
});