import { NestFactory } from '@nestjs/core';
import { ConnectorModule } from './connector/connector.module';

async function bootstrap() {
  const app = await NestFactory.create(ConnectorModule.forRoot({
    mappingRepository: {} as any, // Only for demo compilation
  }));

  const port = process.env.PORT || 3001;
  await app.listen(port);
}
bootstrap();
