-- MASTER INITIALIZATION SCRIPT: Table Creation & Initial Seeds

-- 1. Create Table (if not exists)
CREATE TABLE IF NOT EXISTS integration_mappings_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    source_system VARCHAR(255) NOT NULL,
    target_system VARCHAR(255) NOT NULL,
    mapping_config JSONB NOT NULL,
    version VARCHAR(50) DEFAULT '1.0.0',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Initial Seeds (Verified Mappings)

-- A. JSONPlaceholder Users (Custom Logic + Auto-Bearer)
INSERT INTO integration_mappings_config (id, name, source_system, target_system, mapping_config, version)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'jsonplaceholder-users',
    'ExternalSource',
    'JSONPlaceholder',
    '{
        "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        "version": "1.0",
        "status": "active",
        "sourceSystem": "ExternalSource",
        "targetSystem": "JSONPlaceholder",
        "targetApi": {
            "url": "https://jsonplaceholder.typicode.com/users",
            "method": "DYNAMIC",
            "timeoutMs": 5000
        },
        "authConfig": { "type": "bearer" },
        "requestMapping": null,
        "responseMapping": {
            "type": "CUSTOM",
            "logic": "var transformUser = function(u) { return { userId: u.id, username: u.username, fullName: u.name, email: u.email, city: u.address ? u.address.city : null, company: u.company ? u.company.name : null }; }; if (Array.isArray(value)) { return { users: value.map(transformUser), count: value.length }; } else { return { user: transformUser(value) }; }"
        }
    }'::jsonb,
    '1.0'
) ON CONFLICT (id) DO UPDATE SET mapping_config = EXCLUDED.mapping_config;

-- B. Dog CEO Breeds (JSONPath Mapping)
INSERT INTO integration_mappings_config (id, name, source_system, target_system, mapping_config, version)
VALUES (
    'f9a3d1c4-2e44-4b72-9c31-7ad09ce01234',
    'dog-ceo-breeds-jsonpath',
    'ExternalSource',
    'DogCEO',
    '{
        "id": "f9a3d1c4-2e44-4b72-9c31-7ad09ce01234",
        "version": "1.0",
        "status": "active",
        "sourceSystem": "ExternalSource",
        "targetSystem": "DogCEO",
        "targetApi": {
            "url": "https://dog.ceo/api/breeds/list/all",
            "method": "DYNAMIC",
            "timeoutMs": 5000
        },
        "authConfig": { "type": "NONE" },
        "requestMapping": null,
        "responseMapping": {
            "type": "OBJECT",
            "mappings": [
                { "source": "$.message", "target": "$.breedsMap" },
                { "source": "$.status", "target": "$.resultStatus" }
            ]
        }
    }'::jsonb,
    '1.0'
) ON CONFLICT (id) DO UPDATE SET mapping_config = EXCLUDED.mapping_config;

-- C. DummyJSON Posts (Bearer Auto-Generate)
INSERT INTO integration_mappings_config (id, name, source_system, target_system, mapping_config, version)
VALUES (
    'b1cfdc77-1c2a-4e7b-9d3e-88a1f0d9abcd',
    'dummy-json-posts',
    'ExternalSource',
    'DummyJSON',
    '{
        "id": "b1cfdc77-1c2a-4e7b-9d3e-88a1f0d9abcd",
        "version": "1.0",
        "status": "active",
        "sourceSystem": "ExternalSource",
        "targetSystem": "DummyJSON",
        "targetApi": {
            "url": "https://dummyjson.com/posts",
            "method": "DYNAMIC",
            "timeoutMs": 5000
        },
        "authConfig": {
            "type": "bearer",
            "tokenUrl": "https://dummyjson.com/auth/login",
            "loginPayload": { "username": "emilys", "password": "emilyspass" }
        },
        "responseMapping": {
            "type": "CUSTOM",
            "logic": "var transformPost = function(p) { return { postId: p.id, title: p.title }; }; if (Array.isArray(value.posts)) { return { posts: value.posts.map(transformPost) }; } return value;"
        }
    }'::jsonb,
    '1.0'
) ON CONFLICT (id) DO UPDATE SET mapping_config = EXCLUDED.mapping_config;
