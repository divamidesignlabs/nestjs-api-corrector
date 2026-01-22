# **📦 NestJS API Corrector: Public Usage & Integration Guide**

This document describes how to **publish** this framework as an NPM package and how to **integrate** it into your existing backend projects.

---

## **1️⃣ Preparing for Publish**

### **A. Package Metadata (`package.json`)**
Ensure your `package.json` has these critical fields set before publishing:

```json
{
  "name": "nestjs-api-corrector",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist", "README.md", "database_init.sql"],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "prepublishOnly": "npm run build"
  }
}
```

### **B. Build & Publish Flow**
1.  **Build**: `npm run build` (Generates `dist/` with JS and types).
2.  **Login**: `npm login` (If using a private registry, ensure you have access).
3.  **Publish**: `npm publish --access public`.

---

## **2️⃣ Internal Testing (Before NPM Publish)**

If you want to test integration locally without publishing to the public registry:

1.  **In Corrector Project**:
    ```bash
    npm pack
    # This generates a file like: nestjs-corrector-1.0.0.tgz
    ```
2.  **In Your Target Project**:
    ```bash
    npm install /path/to/nestjs-api-corrector-0.0.3.tgz
    ```

---

## **3️⃣ Backend Integration Guide**

Once the package is installed in your target backend, follow these steps to use it:

### **A. Database Initialization**
The framework requires a specific table in your database. Run the contents of `database_init.sql` (found in the package root) in your target environment to create the `integration_mappings_config` table and seed initial verified mappings.

### **B. Registering the Module**
In your main `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorrectorModule, IntegrationMapping } from 'nestjs-api-corrector';

@Module({
  imports: [
    // 1. Ensure your TypeORM is connected
    TypeOrmModule.forRoot({
       // your shared DB config
       entities: [IntegrationMapping, ...others], // ADD IntegrationMapping here
       synchronize: false, 
    }),
    // 2. Import the Corrector Module
    CorrectorModule.forRoot({
       // Optional: Pass your own entity if you extended the base one
       // entity: MyExtendedMappingEntity,
       globalTimeoutMs: 10000
    }),
  ],
})
export class AppModule {}
```

### **C. Programmatic Usage (Services)**
If you want to use the transformation logic inside your services rather than the provided controller:

```typescript
import { Injectable } from '@nestjs/common';
import { CorrectorEngine, MappingRegistryService } from 'nestjs-api-corrector';

@Injectable()
export class MyService {
  constructor(
    private readonly corrector: CorrectorEngine,
    private readonly registry: MappingRegistryService
  ) {}

  async processExternalData(sourceData: any) {
    // 1. Fetch the mapping by Name or UUID
    const mapping = await this.registry.findByIdOrName('jsonplaceholder-users');
    
    // 2. Execute Transformation
    const result = await this.corrector.execute(
        mapping.mappingConfig, 
        sourceData,
        { method: 'GET', queryParams: {} }
    );
    
    return result;
  }
}
```

### **D. API Usage (Controller)**
The package automatically provides the `CorrectorController` mapped to the `/corrector` prefix. 
*   **Endpoint**: `ANY /corrector/:mappingIdOrName`
*   **Example**: `POST /corrector/dog-ceo-breeds-jsonpath`

---

## **4️⃣ Integration Checklist**
1.  **Table Exist?**: Run `database_init.sql`.
2.  **Entities Registered?**: Add `IntegrationMapping` to your `TypeOrmModule.forRoot`.
3.  **Auth Ready?**: If using Auto-Login, ensure the target `tokenUrl` is reachable from your server.
4.  **Module Imported?**: Add `CorrectorModule.forRoot()` to your `imports`.

---

### **5️⃣ Providing Custom Entities**
If you need to add your own fields (like `department_id`, `created_by`, etc.) to the mapping table, you can do so by extending the base entity:

1. **Create your entity**:
```typescript
import { Entity, Column } from 'typeorm';
import { IntegrationMapping } from 'nestjs-api-corrector';

@Entity('custom_integration_mappings')
export class MyCustomMapping extends IntegrationMapping {
  @Column({ name: 'department_id', nullable: true })
  departmentId: string;
}
```

2. **Register it in the Module**:
```typescript
@Module({
  imports: [
    CorrectorModule.forRoot({
      entity: MyCustomMapping
    }),
  ],
})
export class AppModule {}
```

The framework will now automatically use your `MyCustomMapping` entity for all database operations while keeping the core transformation logic intact.

---
