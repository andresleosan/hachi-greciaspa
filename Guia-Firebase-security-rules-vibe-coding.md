## I **Firebase Security Rules y la Crisis de Seguridad del Vibe Coding** 

Guía definitiva: qué son las reglas de seguridad, por qué nacen, cómo configurarlas correctamente, y los hackeos reales que demuestran por qué no puedes ignorarlas. 

Abril 2026 · Fuentes: Firebase Docs, Wiz Research, CVE-2025-48757, Veracode 2025, Columbia University, Cybernews 

## **Tabla de Contenidos** 

1. El Contexto: La Epidemia de Hackeos en Apps Vibe Codeadas 

2. ¿Qué Son las Security Rules? 

   - 2.1 Conceptos Clave: SDK, Clave Anon y CORS 

3. Firebase Security Rules — Guía Completa 

   - 3.1 Anatomía de una Regla 

   - 3.2 Las Reglas Peligrosas 

   - 3.3 Reglas Seguras: Del Básico al Robusto 

   - 3.4 Firebase Storage Rules 

   - 3.5 Realtime Database Rules 

   - 3.6 Despliegue y Testing 

4. Supabase RLS — La Otra Cara de la Moneda 

5. La Trampa de la IA: Por Qué los Agentes Generan Inseguridad 

6. Checklist de Seguridad Pre-Lanzamiento 

7. Herramientas de Auditoría 

8. La Lección Final 

Firebase Security Rules & Vibe Coding Security  —  Página 2 

## **1. El Contexto: La Epidemia de Hackeos** 

El término **vibe coding** fue acuñado por Andrej Karpathy en febrero de 2025. La idea: describes lo que quieres en lenguaje natural y la IA genera el código. Herramientas como **Lovable** , **Bolt** , **Replit Agent** y **Cursor** permiten construir apps completas en horas. 

El problema fundamental: **la IA optimiza para que el código funcione, no para que sea seguro** . 

**==> picture [470 x 92] intentionally omitted <==**

**----- Start of picture text -----**<br>
45% 170+ 125M<br>del código IA tiene apps expuestas solo registros filtrados<br>vulnerabilidades en el caso Lovable en Firebase (2024)<br>**----- End of picture text -----**<br>


## **Los Hackeos Más Sonados (2025–2026)** 

## **Tea App (Julio 2025)** 

**Qué era:** App #1 de seguridad para citas de mujeres 

**Datos filtrados:** 72,000 imágenes incluyendo 13,000 fotos de IDs gubernamentales 

**Causa raíz:** Firebase Storage completamente abierto con configuración por defecto. Cero autenticación. El fundador admitió que no sabía programar. 

## **Lovable — CVE-2025-48757 (Mayo 2025)** 

**Qué era:** Plataforma de vibe coding con miles de usuarios 

**Datos filtrados:** 170+ apps en producción: nombres, emails, registros financieros, direcciones, API keys 

**Causa raíz:** Row Level Security (RLS) de Supabase no estaba habilitado. Cualquiera con la URL y clave anon podía leer/modificar/eliminar toda la data. 

## **Moltbook (Enero 2026)** 

**Qué era:** Red social de IA — "la portada del internet de agentes" 

**Datos filtrados:** 1.5 millones de tokens API, 35,000 emails, mensajes privados 

**Causa raíz:** Supabase mal configurado — RLS deshabilitado. La clave anon era esencialmente un backdoor admin. Descubierto por Wiz Research. 

**Orchids Platform (Dic 2025 – Feb 2026)** 

Firebase Security Rules & Vibe Coding Security  —  Página 3 

**Qué era:** Plataforma de vibe coding con ~1 millón de usuarios **Datos filtrados:** Vulnerabilidad zero-click **Causa raíz:** Descubierta por el investigador Etizaz Mohsin. 

**Auditorías masivas:** Cybernews analizó 38,630 apps Android de IA y encontró niveles epidémicos de misconfiguraciones. CovertLabs escaneó 198 apps iOS y encontró tasas de misconfiguration de Firebase entre 4.8% y 98.9%. En 2024, 916 sitios Firebase expusieron 125 millones de registros, incluyendo 19 millones de contraseñas en texto plano. 

I Un investigador lo resumió así: entre enero 2025 y febrero 2026, casi todos los incidentes se remontan a las mismas causas prevenibles: bases de datos Firebase mal configuradas, RLS de Supabase ausente, API keys hardcodeadas en el cliente, y backends en la nube expuestos. 

Firebase Security Rules & Vibe Coding Security  —  Página 4 

## **2. ¿Qué Son las Security Rules?** 

## **El Concepto Fundamental** 

Imagina que tu base de datos es un **edificio de apartamentos** . Las Security Rules son el sistema de cerraduras, llaves y el guardia de seguridad en la entrada. Sin ellas, cualquier persona que conozca la dirección puede entrar a cualquier apartamento, revisar tus cosas, llevarse lo que quiera, o cambiar las cerraduras. 

En Firebase y Supabase, tu app corre principalmente en el **cliente** (el navegador). La URL de tu base de datos, las API keys y la configuración están **literalmente visibles** en el JavaScript que cualquiera puede inspeccionar con DevTools. Las Security Rules son la **única barrera real** entre tu data y el internet público. 

## **¿Por Qué Nacen?** 

En la arquitectura tradicional (servidor + base de datos), el servidor actúa como intermediario — el usuario nunca habla directamente con la DB. Pero plataformas como Firebase y Supabase usan un modelo **serverless** donde el cliente se conecta directamente a la base de datos vía SDKs. 

Este modelo es increíblemente productivo, pero traslada la responsabilidad de seguridad al desarrollador. Las Security Rules nacen para responder una pregunta fundamental: 

I **¿Quién puede leer o escribir qué datos, y bajo qué condiciones?** 

## **2.1 Conceptos Clave: SDK, Clave Anon y CORS** 

## **¿Qué es un SDK?** 

SDK significa **Software Development Kit** (Kit de Desarrollo de Software). Es un conjunto de herramientas, librerías y documentación que un servicio te proporciona para que puedas interactuar con él desde tu código. Piensa en un SDK como un **control remoto** pre-fabricado para tu televisor: en vez de enviar señales infrarrojas manualmente, presionas botones que ya saben qué señal enviar. 

En el contexto de Firebase, el SDK es la librería de JavaScript (o iOS, Android, etc.) que instalas en tu proyecto. Cuando haces `import { getFirestore } from 'firebase/firestore'` , estás usando el SDK de Firebase. Este SDK se ejecuta **en el navegador del usuario** , lo que significa que todo lo que el SDK sabe (URLs, claves de configuración) es visible para cualquiera que inspeccione el código. 

`// Ejemplo: inicializar Firebase SDK en tu app import { initializeApp } from 'firebase/app'; import { getFirestore } from 'firebase/firestore'; const firebaseConfig = { apiKey: 'AIzaSy...',        //` ← `Visible en el navegador authDomain: 'mi-app.firebaseapp.com',` 

Firebase Security Rules & Vibe Coding Security  —  Página 5 

`projectId: 'mi-app-12345',  //` ← `Visible en el navegador }; const app = initializeApp(firebaseConfig); const db = getFirestore(app);` 

I Las API keys de Firebase son **identificadores de proyecto** , no secrets. Están diseñadas para ser públicas. La seguridad NO depende de ocultar estas claves, sino de configurar correctamente las Security Rules. 

## **¿Qué es la Clave Anon (anon key)?** 

La **clave anon** (anonymous key) es un concepto específico de **Supabase** . Cuando creas un proyecto en Supabase, se generan dos claves JWT automáticamente: 

- **anon key** (pública): Representa a un usuario no autenticado o con permisos básicos. Esta clave está 

- **diseñada para estar en el frontend** . 

- **service_role key** (privada): Tiene acceso total a la base de datos, **bypasea completamente el RLS** . 

- Esta clave NUNCA debe estar en el frontend. 

La clave anon funciona como la **tarjeta de visitante** de un edificio: te permite entrar al lobby, pero las puertas de cada oficina (las políticas RLS) deciden si puedes pasar o no. Si el edificio no tiene puertas en las oficinas (RLS deshabilitado), la tarjeta de visitante te da acceso a todo. 

`// En Supabase, el cliente se inicializa con la anon key import { createClient } from '@supabase/supabase-js'; const supabase = createClient( 'https://xxxx.supabase.co',  // URL pública 'eyJhbGciOi...'              // anon key (pública, OK) ); // NUNCA hagas esto: const supabase = createClient( 'https://xxxx.supabase.co', 'eyJhbGciOi...'              // service_role key (PRIVADA) //` ↑ `Esto bypasea RLS y da acceso total a la DB );` 

I En el caso Moltbook (1.5M tokens filtrados), la clave anon estaba expuesta en el frontend **sin RLS habilitado** . Eso convirtió una clave diseñada para ser pública en un backdoor de acceso total. La clave anon es segura **solo si RLS está correctamente configurado** . 

## **¿Qué es CORS?** 

**CORS** (Cross-Origin Resource Sharing) es un mecanismo de seguridad del navegador que controla qué dominios pueden hacer requests a tu servidor. Por defecto, los navegadores bloquean las solicitudes de un origen (dominio) a otro diferente — esto se llama la **Same-Origin Policy** . 

Firebase Security Rules & Vibe Coding Security  —  Página 6 

Imagina que tu app vive en `https://mi-app.com` y tu API en `https://api.mi-app.com` . Son orígenes diferentes (distinto subdominio), así que el navegador bloquea la solicitud... a menos que el servidor responda con headers CORS que digan: _"sí, acepto requests de mi-app.com"_ . 

**El problema con la IA:** Cuando un agente de código se encuentra un error CORS, su solución típica es la más permisiva posible: 

`//` I `PELIGROSO: acepta requests de CUALQUIER dominio Access-Control-Allow-Origin: * //` I `CORRECTO: solo acepta requests de tu dominio Access-Control-Allow-Origin: https://mi-app.com` 

Con `*` , cualquier sitio malicioso puede hacer requests a tu API desde el navegador de tus usuarios, potencialmente robando datos o ejecutando acciones no autorizadas. 

## **Cómo Configurar CORS en React** 

CORS se configura en el **servidor/backend** , no en React directamente. React (el frontend) es quien recibe el bloqueo — el servidor es quien debe autorizar. Aquí las configuraciones según tu stack: 

## **Express.js (Node.js):** 

`import cors from 'cors'; //` I `No hagas esto en producción app.use(cors()); // Equivale a Access-Control-Allow-Origin: * //` I `Configura dominios específicos app.use(cors({ origin: ['https://mi-app.com', 'https://www.mi-app.com'], methods: ['GET', 'POST', 'PUT', 'DELETE'], credentials: true,  // Si usas cookies/auth headers }));` 

## **Vite (proxy en desarrollo):** 

```
// vite.config.ts — solo para desarrollo local
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
});
```

## **Firebase Cloud Functions:** 

```
import { onRequest } from 'firebase-functions/v2/https';
import cors from 'cors';
```

```
const corsHandler = cors({
```

Firebase Security Rules & Vibe Coding Security  —  Página 7 

```
  origin: ['https://mi-app.com']
});
export const myApi = onRequest((req, res) => {
  corsHandler(req, res, () => {
    // Tu lógica aquí
    res.json({ data: 'seguro' });
  });
});
```

## **Supabase Edge Functions (Deno):** 

```
// supabase/functions/my-function/index.ts
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://mi-app.com',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
Deno.serve(async (req) => {
  // Preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return new Response(JSON.stringify({ data: 'seguro' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

I **Regla clave:** En desarrollo usa el proxy de Vite para evitar problemas CORS. En producción, configura CORS en el servidor con la lista explícita de tus dominios. Nunca uses `origin: '*'` en producción. 

Firebase Security Rules & Vibe Coding Security  —  Página 8 

**Firebase vs. Supabase** 

|**Aspecto**|**Firebase Security Rules**|**Supabase RLS**|
|---|---|---|
|Lenguaje|Lenguaje propio (similar a JS)|SQL estándar (PostgreSQL)|
|Aplica a|Firestore, Realtime DB, Storage|Tablas PostgreSQL|
|Default|Locked mode o Test mode|RLS deshabilitado por defecto|
|Granularidad|Por documento/path|Por fila en tabla|
|Configuración|Console > Rules tab|Dashboard > Auth > Policies|



Firebase Security Rules & Vibe Coding Security  —  Página 9 

## **3. Firebase Security Rules — Guía Completa** 

## **3.1 Anatomía de una Regla** 

Firebase Security Rules para Cloud Firestore usan esta estructura: 

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Aquí van tus reglas, match por match
  }
}
```

Cada regla tiene dos componentes: 

- **match** : Define el path (ruta) del documento o colección 

- **allow** : Define la condición bajo la cual se permite la operación 

Las operaciones se dividen en: 

- **read** → se descompone en `get` (documento individual) y `list` (query) 

- **write** → se descompone en `create` , `update` y `delete` 

## **3.2 Las Reglas Peligrosas** 

## I **La Regla Abierta Total — "Test Mode"** 

`rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read, write: if true;   //` ← `MORTAL } } }` 

I Cualquier persona en el planeta puede leer, escribir, modificar y eliminar TODA tu base de datos. Solo necesitan tu project ID (visible en el frontend). ~30% de apps Firebase en producción tienen reglas excesivamente permisivas. 

## I **La "Solución" Favorita de la IA** 

Cuando un agente de IA encuentra un error `Permission Denied` , su respuesta típica es eliminar los permisos: 

```
// Firebase
allow read, write: if true;
-- Supabase
CREATE POLICY "Allow public access"
```

Firebase Security Rules & Vibe Coding Security  —  Página 10 

```
ON users FOR SELECT USING (true);
```

El error desaparece. La app funciona. Y tu base de datos queda expuesta al mundo. 

Firebase Security Rules & Vibe Coding Security  —  Página 11 

## **3.3 Reglas Seguras: Del Básico al Robusto** 

## **Nivel 1: Solo Usuarios Autenticados** 

```
match /{document=**} {
  allow read, write: if request.auth != null;
}
```

I **Limitación:** Cualquier usuario autenticado (incluyendo cuentas desechables) tiene acceso a TODO. Es mejor que `true` , pero insuficiente para producción. 

## **Nivel 2: Propiedad del Documento (Content-Owner)** 

```
match /users/{userId} {
  // Solo el dueño puede leer/escribir su documento
  allow read, update, delete:
    if request.auth != null
    && request.auth.uid == userId;
  // Al crear, el userId debe coincidir con el auth
  allow create:
    if request.auth != null
    && request.resource.data.userId == request.auth.uid;
}
```

I **Nota clave:** Para `create` , el documento aún no existe, así que usas `request.resource.data` (datos entrantes) en vez de `resource.data` (datos existentes). 

## **Nivel 3: Reglas Granulares por Colección** 

```
// Perfiles: solo el dueño
match /users/{userId} {
  allow read, write: if request.auth != null
    && request.auth.uid == userId;
}
// Posts públicos: cualquiera lee, solo el autor escribe
match /posts/{postId} {
  allow read: if true;
  allow create: if request.auth != null
    && request.resource.data.authorId == request.auth.uid;
  allow update, delete: if request.auth != null
    && resource.data.authorId == request.auth.uid;
}
// Órdenes: dueño + admins
match /orders/{orderId} {
  allow read, update: if request.auth != null
    && (resource.data.userId == request.auth.uid
        || request.auth.token.admin == true);
  allow create: if request.auth != null
    && request.resource.data.userId == request.auth.uid;
  allow delete: if request.auth != null
```

Firebase Security Rules & Vibe Coding Security  —  Página 12 

```
    && request.auth.token.admin == true;
}
// Datos sensibles: NADIE desde el cliente
match /internal/{docId} {
  allow read, write: if false;
}
```

## **Nivel 4: Validación de Datos** 

Las reglas no solo controlan **quién** accede, sino **qué datos** pueden escribirse: 

```
match /posts/{postId} {
  allow create: if request.auth != null
    && request.resource.data.authorId == request.auth.uid
    // Validar que el título existe y es string
    && request.resource.data.title is string
    && request.resource.data.title.size() > 0
    && request.resource.data.title.size() <= 200
    // Validar contenido
    && request.resource.data.content is string
    && request.resource.data.content.size() <= 10000
    // Timestamp del servidor
    && request.resource.data.createdAt == request.time;
}
```

Firebase Security Rules & Vibe Coding Security  —  Página 13 

## **3.4 Firebase Storage Rules** 

Las reglas de Storage siguen estructura similar pero aplican a archivos: 

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Fotos de perfil: dueño sube, cualquiera ve
    match /users/{userId}/profile/{fileName} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.uid == userId
        && request.resource.contentType.matches('image/.*')
        && request.resource.size < 5 * 1024 * 1024;
    }
    // Docs privados: solo el dueño
    match /users/{userId}/documents/{fileName} {
      allow read, write: if request.auth != null
        && request.auth.uid == userId;
    }
    // Bloquear todo lo demás
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

I **Recuerda Tea App:** 72,000 imágenes (incluyendo IDs gubernamentales) se filtraron porque Firebase Storage tenía cero autenticación. Las reglas de Storage son tan críticas como las de Firestore. 

## **3.5 Realtime Database Rules** 

Si usas Realtime Database, las reglas son JSON: 

```
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        ".validate": "newData.hasChildren(['name', 'email'])"
      }
    },
    "posts": {
      "$postId": {
        ".read": true,
        ".write": "auth !== null && newData.child('authorId').val() === auth.uid"
      }
    }
  }
}
```

Firebase Security Rules & Vibe Coding Security  —  Página 14 

## **3.6 Despliegue y Testing** 

## **Despliegue via Firebase CLI (Recomendado)** 

```
# Inicializar Firestore
firebase init firestore
# Edita el archivo firestore.rules generado
# Desplegar reglas
firebase deploy --only firestore:rules
# Para Storage
firebase deploy --only storage
```

I **Tip:** Al usar la CLI, tus reglas viven en archivos `.rules` que puedes versionar con Git. Esto te da historial de cambios, code reviews y rollbacks. 

## **Testing con el Simulador** 

Firebase provee un simulador de reglas en la consola (pestaña Rules). Puedes simular requests autenticados y no autenticados, y probar reads/writes/deletes. Para testing automatizado, usa el Firebase Emulator Suite: 

```
firebase init emulators
firebase emulators:start
```

Firebase Security Rules & Vibe Coding Security  —  Página 15 

## **4. Supabase RLS — La Otra Cara de la Moneda** 

Aunque esta guía se centra en Firebase, la mayoría de hackeos recientes involucran Supabase. Supabase expone una **clave anon** (pública) que el cliente usa para conectarse. Esta clave está diseñada para ser pública, **pero solo funciona de manera segura si RLS está habilitado** . 

I Sin RLS, la clave anon se convierte en acceso total a toda la base de datos. 

## **RLS Básico en Supabase** 

```
-- 1. Habilitar RLS en la tabla
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- 2. Usuarios solo ven sus propios datos
CREATE POLICY "Users can view own data"
ON users FOR SELECT
USING (auth.uid() = id);
-- 3. Usuarios solo insertan sus propios datos
CREATE POLICY "Users can insert own data"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);
-- 4. Usuarios solo actualizan sus propios datos
CREATE POLICY "Users can update own data"
ON users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

I **Regla de oro — "Deny by default":** Empieza negando todo acceso y luego abre explícitamente solo lo necesario. 

Firebase Security Rules & Vibe Coding Security  —  Página 16 

## **5. La Trampa de la IA** 

## **Por Qué los Agentes de Código Generan Inseguridad** 

## **El Ciclo Vicioso** 

- 1. La IA genera un schema de base de datos 

- 2. La IA **no configura** reglas de seguridad 

- 3. Algo falla con un error `Permission Denied` 

- 4. La IA "arregla" el error con `allow read, write: if true` 

- 5. El error desaparece, la app funciona 

- 6. El desarrollador asume que todo está bien 

- 7. Un atacante accede a todo 

Los LLMs están optimizados para **hacer que el error desaparezca** , no para implementar la solución correcta. Investigación de Columbia University confirmó que la seguridad es uno de los patrones de fallo más críticos de los agentes de código. 

## **Otros Errores Comunes de los AI Agents** 

|**Problema**|**Frecuencia**|**Riesgo**|
|---|---|---|
|API keys hardcodeadas en frontend JS|60%+ de apps|Robo de credenciales|
|Autorización<br>por<br>UI<br>(esconder<br>botones)|~50% de apps|Bypass trivial de permisos|
|dangerouslySetInnerHTML<br>sin<br>sanitizar|Frecuente|XSS — ejecución de scripts maliciosos|
|Archivos .env expuestos públicamente|~15% de apps|Todas las secrets comprometidas|
|CORS: Allow-Origin: *|Frecuente|Requests cross-origin sin restricción|



Firebase Security Rules & Vibe Coding Security  —  Página 17 

## **6. Checklist de Seguridad Pre-Lanzamiento** 

Antes de hacer deploy de cualquier app que use Firebase o Supabase: 

## **Base de Datos** 

I Reglas de Firestore configuradas por colección (no `if true` global) 

I Cada tabla Supabase tiene RLS habilitado con políticas específicas 

I Usas `request.auth.uid` para validar propiedad de documentos 

I Datos sensibles bloqueados del cliente ( `if false` ) y solo accesibles via Cloud Functions 

## **Storage** 

I Firebase Storage valida autenticación, tipo de archivo y tamaño 

I Los buckets NO son públicos por defecto 

## **API Keys y Secrets** 

I Todas las API keys de terceros están en variables de entorno del servidor 

I Ninguna secret key está en código del frontend 

I El `service_role` key de Supabase NUNCA está en el cliente 

I Corriste `gitleaks detect --source .` para buscar secrets en tu repo 

## **Autenticación** 

I Firebase App Check está habilitado 

I Contraseñas requieren más de 6 caracteres (mínimo de Firebase) 

I Auth anónima deshabilitada o usuarios anónimos se vinculan a cuentas reales 

## **Headers y HTTPS** 

I App servida sobre HTTPS 

I Headers de seguridad: CSP, X-Frame-Options, Strict-Transport-Security 

I CORS configurado solo para tus dominios 

## **Validación** 

I Inputs del usuario validados en el servidor (no solo en el frontend) 

I Uploads validan MIME type, tamaño y contenido 

I Errores no exponen stack traces, rutas de archivos o detalles de la DB 

Firebase Security Rules & Vibe Coding Security  —  Página 18 

## **7. Herramientas de Auditoría** 

|**Herramienta**|**Qué Hace**|**Tipo**|
|---|---|---|
|Firebase Rules Simulator|Simula requests contra tus reglas|Oficial, gratuito|
|Firebase Emulator Suite|Testing local completo|Oficial, gratuito|
|Gitleaks|Detecta secrets en repositorios Git|Open source|
|VAS (Vibe App Scanner)|Escanea apps para secrets, RLS, headers|SaaS|
|ScanVibe|Auditoría<br>automatizada<br>de<br>apps<br>vibe-codeadas|SaaS|
|AuditYourApp|Detección<br>de<br>misconfigs<br>en<br>Firebase/Supabase|SaaS|



## **8. La Lección Final** 

La velocidad del vibe coding es real. La productividad es real. Pero la seguridad no es opcional. 

I **"Nadie los hackeó. Simplemente no configuraron la seguridad."** 

La diferencia entre una app funcional y una app lista para producción son **30 minutos** de configurar reglas de seguridad. 30 minutos que pueden ahorrarte el costo promedio de un data breach: **$4.88 millones de dólares** según IBM (2024). 

No necesitas ser un experto en seguridad. Necesitas correr un checklist antes de hacer deploy. Las reglas existen. Las herramientas existen. La documentación existe. Lo único que falta es que las uses. 

I **Regla de oro para vibe coders:** Cada vez que tu agente de IA "arregla" un error de permisos, revisa exactamente qué hizo. Si la solución incluye `if true` , `USING (true)` , o `allow public access` , reviértela inmediatamente y configura la regla correcta. 

> _Guía creada en abril 2026. Fuentes: Firebase Documentation, Wiz Research, CVE-2025-48757, Veracode 2025, Columbia University Research, Cybernews._ 

Firebase Security Rules & Vibe Coding Security  —  Página 19 

