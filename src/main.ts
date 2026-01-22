import { NestFactory } from '@nestjs/core';
import { DynamicMasterModule } from './dynamic-master.module';

async function bootstrap() {
  const app = await NestFactory.create(DynamicMasterModule);
  // Enable global prefix if needed, currently direct mapping
  // app.setGlobalPrefix('api');

  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
