# Seguridad y configuración de proyectos GAM+

## Diagnóstico

El repo está enlazado al proyecto existente `gam` (organización `gam`, región `us-east-1`), cuyo ref coincide con la URL de `.env.local`. No se creó un proyecto duplicado. La migración inicial ya estaba aplicada manualmente; se verificó su esquema y se reparó solo el historial antes de aplicar la migración nueva. No se borraron proyectos ni objetos existentes.

El sitio original es una aplicación estática React/Vite. Los ocho elementos del portafolio estaban escritos en `src/App.jsx`, sin entidad persistida, roles, autenticación ni API. No había borradores ni controles de acceso que probar; ocultar elementos en React no protegería información. El repositorio ya tenía el SDK de Supabase y un cliente opcional, pero no tenía migraciones ni conexión con el catálogo. GitHub Pages solo puede alojar el frontend.

## Mecanismo implementado

La migración inicial crea `advertising_projects` y las políticas base. La siguiente migración `supabase/migrations/20261116000000_align_project_files_and_roles.sql` añade roles/cuentas y la entidad `project_files` 1:N del ER/CRUD, más `creado_en`. Conserva las columnas heredadas `imagen` y `fecha` para no perder datos durante la transición. Las migraciones `20261116010000_add_private_contact_messages.sql` y `20261116011000_restrict_contact_rpc_execute.sql` añaden el envío seguro y bandeja admin de mensajes.

RLS permite a visitantes anónimos y usuarios autenticados leer proyectos publicados y sus archivos; borradores y escrituras son solo para administradores. La función `SECURITY DEFINER` verifica `accounts` unido a `roles`. Las cuentas nuevas reciben el rol `usuario`; la tabla `accounts` y `roles` no dan permisos de escritura al cliente. La asignación administrativa requiere una operación de operador. `admin_users` se conserva para compatibilidad y para migrar memberships existentes; el rol se copia a `accounts` al aplicar la segunda migración.

Los archivos se registran en `project_files.clave_almacenamiento` y se guardan en el bucket privado `project-private-images`. Las políticas Storage permiten subir, modificar y borrar a administradores; la descarga requiere que un archivo relacionado pertenezca a un proyecto publicado o que la cuenta sea administradora. El frontend descarga archivos mediante el SDK, no crea enlaces públicos permanentes.

## Formulario de contacto y permisos de mensajes

El formulario usa los campos `name`, `business`, `email`, `type`, `need` y `message`. El navegador llama `public.submit_contact_message(...)` con la clave pública existente (`VITE_SUPABASE_ANON_KEY`, que admite una `sb_publishable_`). No se usa Auth obligatorio ni clave privada para enviar.

Los mensajes se guardan en `private.contact_messages`, un esquema que no se incluye en `api.schemas` (`public`, `graphql_public`). Sus columnas son `id uuid`, `name text`, `business text`, `email text`, `business_type text`, `need text`, `message text`, `created_at timestamptz`. La base valida campos requeridos, límites de longitud, correo básico y los valores actuales del selector `need`. RLS permanece habilitado; anon/authenticated no tienen `USAGE` al esquema ni permisos directos de tabla. Por REST no pueden leer filas.

`submit_contact_message` es la única entrada pública: acepta los campos esperados, inserta sin devolver fila/ID, y tiene EXECUTE para `anon`/`authenticated`. `admin_list_contact_messages()` devuelve mensajes al inbox `/admin`; requiere `authenticated`, valida `public.is_project_admin()` dentro de la función y no tiene EXECUTE para `anon`. La bandeja solo se renderiza tras la validación admin del panel. La migración correctiva retira los privilegios RPC que Supabase puede asignar por defecto.

No se publica la tabla ni el bucket Storage, no se habilita SELECT directo ni se expone `service_role`. La clave anon/publishable es pública y está sujeta a estos límites de base de datos. No se añadió un endpoint de lectura para visitantes.

## Instalación en Supabase Cloud

1. La integración actual usa el proyecto existente `gam`; en otro entorno identifica org/proyecto antes de crear uno. No compartas access token ni contraseña en el chat.
2. La migración preserva la cuenta ya registrada como admin en `admin_users`. Para asignar otro administrador, crea/invita su cuenta en Authentication y ejecuta como operador SQL Editor sustituyendo el correo:

   ```sql
   insert into public.accounts (rol_id, identidad_autenticada)
   select r.rol_id, u.id
   from auth.users u
   join public.roles r on r.nombre = 'administrador'
   where u.email = 'admin@tu-dominio.com'
   on conflict (identidad_autenticada) do update set rol_id = excluded.rol_id;
   ```

   Si no cambia ninguna fila, verifica el correo en Authentication > Users. Nunca agregues una interfaz pública para asignar administradores.
3. En la integración actual las migraciones de catálogo, roles/archivos y mensajes ya se aplicaron al proyecto GAM+. En otro checkout, enlaza el ref correcto y revisa el dry-run antes de aplicar:

   ```sh
   npx supabase link --project-ref TU_PROJECT_REF
   npx supabase db push --dry-run --linked
   npx supabase db push --linked
   npx supabase migration list --linked
   ```

   También puedes ejecutar el archivo SQL de migración en el SQL Editor. No ejecutes ambos métodos simultáneamente.
4. Copia Project URL y la clave `publishable` a un `.env` local (ignorado por Git):

   ```dotenv
   VITE_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_...
   ```

   Las variables `VITE_*` llegan al navegador y por eso solo contienen datos públicos. La variable se llama `ANON_KEY` por compatibilidad con el proyecto, pero puede contener la clave `sb_publishable_` actual. Nunca uses `service_role`, una secret key, contraseña ni token privado en Vite.
5. Abre `/admin` e inicia sesión. El panel implementa proyectos y archivos; las operaciones siguen protegidas por RLS y por Storage policies. El portafolio público consulta solo `estado = 'publicado'`.
6. Para archivos nuevos, el panel carga el objeto privado y crea su relación `project_files`. No cambies el bucket a público. Las referencias heredadas externas se conservan en `imagen`; no se copian automáticamente al bucket.

El catálogo siempre procede de `advertising_projects`; el arreglo estático que antes se usaba de fallback se retiró para evitar que despliegues sin variables oculten cambios de Supabase. Si falta URL o clave pública, el portafolio muestra un error de configuración en vez de datos locales desactualizados. Al configurar Supabase, la consulta usa RLS y filtra `estado = 'publicado'`.

## Pruebas de seguridad

Se ejecutaron las pruebas anotadas abajo contra el proyecto enlazado con la clave publishable para HTTP anónimo y con consultas de rol transaccionales para probar las policies. No se usó `service_role` en el navegador. Las pruebas CRUD transaccionales terminaron en `ROLLBACK`; los registros REST temporales se limpiaron.

Después de configurar, valida desde una sesión anónima y usando la publishable key:

```sql
-- Obtener IDs de referencia desde el panel como operador.
select id, estado from public.advertising_projects;
```

- Visitante: consulta listado y `.eq('id', ID_BORRADOR)`; ambas respuestas deben omitir la fila borrador. Intenta insert/update/delete: deben fallar o afectar cero filas.
- Administrador: inicia sesión con una cuenta cuyo rol sea `administrador` en `accounts`; consultar, crear, editar, cambiar estado y borrar según política.
- Panel GAM+: abre `/admin`, inicia sesión como administrador y verifica que puedes consultar borradores y alternar el estado entre `borrador` y `publicado`.
- Cuenta sin rol: inicia sesión con un rol `usuario`; la pantalla debe mostrar acceso denegado y las solicitudes directas a la tabla no deben exponer borradores ni permitir cambiar estados.
- Caso límite: cambia una fila publicada a borrador desde admin. Repite listado e ID como visitante y solicita `GET /storage/v1/object/project-private-images/RUTA` sin token de administrador; fila y objeto deben dejar de entregarse. Prueba también el flujo `download()` de la aplicación.
- Validación: intenta insertar título vacío, categoría no permitida y estado arbitrario; PostgreSQL debe rechazar cada operación.

### Resultados observados el 2026-11-16

- Catálogo mediante SDK/publishable: 8 proyectos devueltos, todos publicados; consulta embebida `project_files(...)` correcta.
- Proyecto y metadata de archivo borrador temporales: las consultas anónimas devolvieron 0 filas. Usuario `authenticated` sin membership, simulado con UUID sin cuenta, obtuvo `is_project_admin=false`, 0 filas borrador y 0 filas afectadas al actualizar.
- Membership admin existente: `is_project_admin=true`; en una transacción con rol `authenticated`, CRUD de un proyecto temporal y CRUD de metadata `project_files` devolvieron 1 fila por operación. Las operaciones se revirtieron al terminar.
- INSERT y UPDATE anónimo de proyecto: rechazados con SQLSTATE `42501`. Upload anónimo de PNG válido: HTTP `403`, violación de RLS en Storage.
- La API anónima no puede leer `roles`/`accounts` (`42501`), y `is_project_admin()` responde `false` sin error.
- RLS está activo en `advertising_projects`, `project_files`, `accounts` y `roles`; se revisaron las policies efectivas. El bucket está `public=false`; tiene límite 10 MiB y MIME JPEG/PNG/WebP.
- Estado tras limpieza: 8 proyectos publicados, 0 borradores temporales, 0 filas `project_files`, 0 objetos Storage y 0 registros de prueba.
- Pendiente: iniciar sesión en `/admin` desde el navegador con el usuario administrador, probar los controles UI y subir/descargar/quitar un objeto privado real. El bucket no tenía objetos, así que no se pudo probar un GET de archivo de borrador.

### Resultados añadidos para mensajes (2026-11-16)

- La tabla/esquema private no existía antes de esta etapa. Las dos migraciones de mensajes figuran aplicadas en el remoto.
- API anónima con SDK: catálogo devuelve 8 `publicado`; RPC de envío con un registro ficticio dio `INSERT_OK`. La lectura de `private.contact_messages` fue denegada por esquema no expuesto (`PGRST106`) y `public.contact_messages` no existe/no se expone (`PGRST205`). El dato ficticio se limpió; conteo final cero.
- La RPC de envío rechazó un valor `need` fuera de las opciones permitidas con SQLSTATE `23514`; no se creó fila.
- RPC inbox con membership admin simulada en transacción leyó el registro de prueba (`1`) y se revirtió. Cuenta no admin simulada no vio borradores, no actualizó proyectos, y `admin_list_contact_messages()` respondió `42501`. ACL/RLS revisado: RLS activo, sin privilegios directos a tabla; anon no puede ejecutar la RPC admin.
- Prueba de transición de proyecto en transacción: admin vio un borrador sintético, lo publicó y anon lo vio; admin lo devolvió a borrador y anon recibió 0 filas. Todo se revirtió. Un HTTP anónimo directo al RPC admin de mensajes también fue denegado `42501`.
- La primera revisión encontró EXECUTE anónimo heredado por ACL predeterminada de Postgres en el RPC admin; aunque su check de rol rechazaba la lectura, se aplicó una migración correctiva y el ACL final confirma `anon` sin EXECUTE en esa función y con EXECUTE solo en el RPC de envío.
- Estado final consultado: 8 proyectos `publicado`, 0 mensajes sintéticos restantes, RLS habilitado y `project-private-images public=false`. `db push --dry-run --linked` reportó remoto actualizado y sin migraciones pendientes.
- No se pudo probar envío visual en `/contacto`, confirmación frontend ni login real / inbox en navegador. Esos pasos quedan manuales y están descritos en `.docs/supabase-integration/CHECKLIST.md`.
- Validación local final posterior a los cambios: `npm run build` terminó correctamente con 147 módulos; `git diff --check` limpio. Vite advierte que el bundle JS minificado de 505,68 kB supera 500 kB.

Para una demostración auditable, guarda la respuesta HTTP/JSON y las filas/políticas del proyecto de prueba. La lectura directa de las tablas desde el SQL Editor tiene privilegios de operador y no representa a un visitante.

## Evidencia para el Foro 3

Para completar la evidencia visual del debate, toma estas capturas en el proyecto ya configurado:

1. Migración aplicada y tabla `advertising_projects` mostrando columnas y restricciones.
2. Policies de RLS de la tabla y policies del bucket en el panel de Supabase.
3. Authentication > Users junto con `accounts`/`roles` mostrando que el rol se asignó solo a una cuenta controlada (oculta correo/UUID si no quieres publicarlos).
4. Catálogo público con proyecto publicado y respuesta anónima a la consulta por ID de un borrador (sin fila).
5. Respuesta denegada al acceso HTTP directo a la imagen privada del borrador.
6. Sesión administrativa mostrando borradores y una edición/cambio de estado exitoso.
7. Después de cambiar publicado a borrador, repetir captura de listado, consulta por ID y descarga denegada.

## Estado de pruebas local

`npm run build` y `git diff --check` terminaron correctamente. `package.json` no define lint ni suite de pruebas automatizadas. Los controles de roles fueron verificados contra RLS mediante consultas transaccionales con `SET LOCAL ROLE` y claims; no se presentan como una sesión UI Auth. Falta probar un objeto físico privado con Storage GET. Una copia ya descargada en el navegador no puede retirarse de su caché; RLS bloquea nuevas solicitudes al cambiar el proyecto a borrador.
