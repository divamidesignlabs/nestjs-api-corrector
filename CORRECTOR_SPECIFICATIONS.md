# Corrector Framework: Comprehensive Flow & Technical Specifications

This document outlines the complete operational flow of the Corrector Framework, including the validation rules, transformation logic types, and edge-case handling.

---

## 1. High-Level Architecture Flow

The framework acts as an intelligent API Gateway. The flow for a single request is as follows:

1.  **Request Entry**: A source system calls `/:mappingId` with any HTTP method (`GET`, `POST`, `PUT`, `DELETE`), query parameters, or body.
2.  **Registry Lookup**: The framework looks up the configuration in the database using the UUID or the human-readable `slug name` (e.g., `dog-ceo-breeds-jsonpath`). This is **unbreakable**: it automatically detects if the input is a UUID or a name.
3.  **Request Transformation & Passthrough**:
    *   If `requestMapping` is defined, the incoming body is transformed using JSONPath mappings.
    *   If `requestMapping` is `null` or empty, the framework operates in **Transparent Proxy** mode, passing the source payload to the target exactly as received.
4.  **Auth Injection & Smart Token Life-cycle**:
    *   The selected strategy (Bearer, OAuth2, etc.) injects credentials.
    *   **Auto-Generation**: If a token is missing, the framework can automatically call a `tokenUrl` to login, retrieve a token, and cache it for future requests.
5.  **Target API Proxy**: The framework executes the call to the target API using the *Effective Method* (incoming method overrides config) and *Merged Query Parameters*.
6.  **Response Transformation**:
    *   **Standard OBJECT/ARRAY**: Uses declarative JSONPath mappings.
    *   **CUSTOM Script**: Executes a JavaScript snippet for complex logic (e.g., handling polymorphic results).
7.  **Error Handling & Masking**: If the target API fails, the framework applies `errorMapping` to return a clean, source-friendly error structure, preventing sensitive target details from leaking.

---

## 2. Validation & Conditional Logic

### A. Strict Validations
In the `mappings` array, you can define:
*   **`required: true`**: Throws a `400 Bad Request` if the source field is missing.
*   **`default: value`**: Provides a fallback value if the source path resolves to `undefined`.
*   **Built-in Transforms**: `roundTo2`, `uppercase`, `lowercase`, `toNumber`, `toString`.

### B. Conditional Mapping (Unbreakable Logic)
Supported fields for advanced decision making:
*   **`condition`**: A JSONPath equality check (e.g., `$.status == "active"`).
*   **`valueIfTrue`**: Static value to use if the condition passes.
*   **`valueIfFalse`**: Static value to use if the condition fails.
*   *Note: If `valueIfTrue` is missing but condition passes, it falls back to the original `source` value.*

---

## 3. Supported Authentication Strategies

| Strategy | Behavior |
| :--- | :--- |
| **`NONE`** | For public APIs. No auth headers added. |
| **`BEARER`** | **Smart Flow**: 1. Checks incoming headers. 2. Checks config `token`. 3. Calls `tokenUrl` to auto-login. |
| **`OAUTH2`** | Performs Client Credentials flow and manages token caching and expiration. |
| **`PASSTHROUGH`**| Forwards the source's `Authorization` header exactly as-is to the target. |
| **`BASIC`** | Automatically generates `Basic Base64(user:pass)` headers. |

---

## 4. Edge Case Solutions

### Edge Case 1: Poly-Response (List vs. Single)
**Solution**: `CUSTOM` logic. Handles APIs that return `[...]` for 2+ results but `{...}` for 1 result.  
*Verified with: `jsonplaceholder-users`*

### Edge Case 2: Multi-Scheme Bearer Response
**Solution**: Our Bearer strategy is updated to detect tokens from various field names: `accessToken`, `access_token`, `token`, or `data.token`.  
*Verified with: `dummy-json-posts`*

### Edge Case 3: Empty Error Bodies
**Solution**: If a target API crashes with no JSON body, the engine injects a `{ "message": "...", "status": "..." }` context so the `errorMapping` remains functional.

---

## 5. Deployment & Seeding

For a clean, unbreakable setup in any environment:
1.  **Initialize**: Run `database_init.sql`. This creates the table and all verified mapping seeds.
2.  **Environment**: Ensure `.env` has the correct `DB_HOST` and credentials.
3.  **Run**: `npm run build && npm start`.

---
