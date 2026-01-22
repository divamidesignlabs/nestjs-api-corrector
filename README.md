# NestJS API Corrector

[![npm-version](https://img.shields.io/npm/v/nestjs-api-corrector.svg)](https://www.npmjs.com/package/nestjs-api-corrector)
[![npm-downloads](https://img.shields.io/npm/dm/nestjs-api-corrector.svg)](https://www.npmjs.com/package/nestjs-api-corrector)

**NestJS API Corrector** is a powerful, configuration-driven library designed to act as an intelligent API Gateway or Proxy within your NestJS ecosystem. It transforms source JSON requests into target API requests, injects dynamic authentication, and converts target API responses back into a desired source format using JSONPath and custom logic.

## 🚀 Key Features

*   **JSONPath-based Mapping**: Effortlessly map fields between source and target systems using declarative JSONPath syntax.
*   **Dynamic Authentication**: Pluggable strategies for **OAuth2**, **Bearer Tokens**, **Basic Auth**, and **API Keys** with automatic token generation, caching, and refresh.
*   **Polymorphic Response Handling**: Built-in support for `CUSTOM` JavaScript scripts to handle APIs that return different structures (e.g., Array vs. Object) based on result counts.
*   **Transparent Proxying**: Automatically merges query parameters and preserves HTTP methods (GET, POST, PUT, DELETE) from the source request.
*   **Custom Entity Support**: Extend the base mapping entity to include your own business logic or metadata fields in the database.
*   **Error Standardizing**: Mask sensitive target API errors and return standardized, user-friendly responses to your clients.

---

## 📦 Installation

```bash
npm install nestjs-api-corrector
```

## 🛠️ Getting Started

### 1. Database Setup
The framework uses a PostgreSQL table to persist mapping configurations. Run the `database_init.sql` script (found in the package root) to create the `integration_mappings_config` table and seed it with initial verified mappings.

### 2. Register the Entity
Register the `IntegrationMapping` entity in your `TypeOrmModule` configuration:

```typescript
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationMapping } from 'nestjs-api-corrector';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      // ... other config
      entities: [IntegrationMapping, ...yourEntities],
    }),
  ],
})
export class AppModule {}
```

### 3. Import the Corrector Module
Use the `forRoot` method to register the module. It is marked as `@Global()`, so you only need to import it once in your root module.

```typescript
import { CorrectorModule } from 'nestjs-api-corrector';

@Module({
  imports: [
    CorrectorModule.forRoot({
      // Optional: Extend the base entity to add your own fields
      // entity: MyCustomExtendedEntity,
      globalTimeoutMs: 5000,
    }),
  ],
})
export class AppModule {}
```

---

## 💻 Usage

### A. Automatic API Endpoint
The package includes a built-in controller that handles proxied requests automatically.

*   **Prefix**: `/corrector/:mappingIdOrSlug`
*   **Example**: `GET http://localhost:3000/corrector/dog-ceo-breeds-jsonpath`

This endpoint will search the database by UUID first, then by the unique `name` (slug) defined in your configuration.

### B. Programmatic Usage (Service Injection)
You can inject the `CorrectorEngine` to perform transformations manually within your business logic.

```typescript
import { CorrectorEngine, MappingRegistryService } from 'nestjs-api-corrector';

@Injectable()
export class MyService {
  constructor(
    private readonly corrector: CorrectorEngine,
    private readonly registry: MappingRegistryService,
  ) {}

  async transformData(sourcePayload: any) {
    const mapping = await this.registry.findByIdOrName('my-api-mapping');
    return await this.corrector.execute(mapping.mappingConfig, sourcePayload, {
        method: 'POST',
        queryParams: { version: 'v1' }
    });
  }
}
```

---

## 📐 Mapping Configuration Structure

The library uses a highly flexible JSON configuration:

| Field | Description |
| :--- | :--- |
| `targetApi` | URL, Method, and default Headers for the remote system. |
| `authConfig` | Auth type (`bearer`, `oauth2`, `basic`, `none`) and credentials. |
| `requestMapping` | JSONPath rules to transform the incoming body. |
| `responseMapping` | Logic to transform the remote result back to the client. |
| `errorMapping` | Rules to transform 4xx/5xx API failures. |

### Advanced: Conditional Mapping
You can use conditions to decide if a field should be mapped or what value it should take:
```json
{
  "source": "$.order.type",
  "target": "$.request.priority",
  "condition": "$.order.type == 'EXPRESS'",
  "valueIfTrue": "HIGH",
  "valueIfFalse": "NORMAL"
}
```

---

## 📜 Full Documentation
For a deep dive into the logic and advanced capabilities, please refer to the markdown files included in the package root:
*   `CORRECTOR_SPECIFICATIONS.md`: Detailed architecture and logic flow.
*   `PUBLISH_GUIDE.md`: Comprehensive integration and local testing guide.

## 📄 License
Licensed under [MIT](./LICENSE).
