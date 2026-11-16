# Análisis ER/CRUD y correspondencia GAM+ – Supabase

## Fuente y lectura

Fuente: [`../ER-CRUD/ER-CRUD.pdf`](../ER-CRUD/ER-CRUD.pdf), 17 páginas. PDF legible; se extrajo texto con PDFKit y se revisaron visualmente las páginas 4–7, 9, 12, 16 y 17 para corroborar tablas, cardinalidades, matriz CRUD, pruebas y estado visual. La página 17 es una lámina «Pendiente» con capturas de la página; no aporta requisitos de esquema adicionales.

## Modelo descrito por el PDF

### Proyecto publicitario

Fuente: página 4; política y CRUD en páginas 6, 9–10.

| Campo | Tipo PostgreSQL propuesto | Nulabilidad / valor por defecto | Restricción / nota |
|---|---|---|---|
| `proyecto_id` | `uuid` | `NOT NULL`, `gen_random_uuid()` | PK generada por sistema; el visitante no puede cambiarla. En GAM+ el nombre existente se conserva como `id` para no romper consumidores previos. |
| `titulo` | `text` | No especificado | Texto del proyecto. |
| `categoria` | `text` | No especificado | Dominio: `branding`, `redes`, `publicidad`, `diseno`. Puede modelarse con `CHECK` o enum. |
| `descripcion` | `text` | No especificado | Descripción del trabajo. |
| `estado` | `text` | No especificado | Dominio: `borrador`, `publicado`; `CHECK` recomendado. |
| `creado_en` | `timestamptz` | Automático (`now()`) | Fecha/hora de creación. |

CRUD: visitante y usuario autenticado sin rol leen únicamente publicados; solo administración crea, lee borradores, actualiza y cambia estado. El borrado queda «según política administrativa» (página 6), por lo que debe restringirse a admin y no usarse durante la verificación ordinaria.

### Archivo de proyecto

Fuente: páginas 4–5; CRUD y acceso en página 7.

| Campo | Tipo PostgreSQL propuesto | Nulabilidad / valor por defecto | Restricción / nota |
|---|---|---|---|
| `archivo_id` | `uuid` | `NOT NULL`, `gen_random_uuid()` | PK. |
| `proyecto_id` | `uuid` | `NOT NULL` | FK a proyecto publicitario; PDF define relación 1:N, cada archivo pertenece a un proyecto. Regla `ON DELETE` no especificada. |
| `clave_almacenamiento` | `text` | `NOT NULL` recomendado | Ruta del objeto en Storage privado; no una URL pública. |

Visitantes y cuentas sin rol pueden consultar archivos solo si el proyecto está publicado. Solo admins consultan archivos de borradores, suben y modifican archivos. El borrado depende de autorización administrativa. El bucket debe seguir privado.

### Rol y cuenta

Fuente: páginas 4–5.

| Entidad | Campo | Tipo propuesto | Regla indicada |
|---|---|---|---|
| Rol | `rol_id` | `uuid` | PK. |
| Rol | `nombre` | `text` | Único; el PDF define el rol `administrador`. |
| Cuenta | `cuenta_id` | `uuid` | PK. |
| Cuenta | `rol_id` | `uuid` | FK a Rol; relación Rol–Cuenta 1:N. Cada cuenta tiene un rol. |
| Cuenta | `identidad_autenticada` | `uuid` | Referencia a la identidad autenticada de Supabase Auth. |

La asignación del rol administrador debe hacerla una persona autorizada desde entorno administrativo; nunca un formulario público (página 5). El PDF no especifica un rol por defecto para cuentas sin privilegios; se propone `usuario` y asignar automáticamente ese rol a las cuentas Auth nuevas, dejando la promoción a administrador solo a un operador.

## Correspondencia PDF → aplicación → verificación

| Página PDF | Entidad / requisito | Operaciones | Correspondencia actual | Verificación prevista |
|---|---|---|---|---|
| 2–3 | Portafolio y formulario de asesoramiento | El formulario aparece como entidad del prototipo | El catálogo lee Supabase sin fallback hardcodeado. El formulario ahora registra mensajes a petición explícita posterior del usuario (alcance adicional al ER/CRUD). |
| 4–5 | Proyecto, Archivo, Rol, Cuenta y cardinalidades | Esquema propuesto | Segunda migración añade `project_files` con FK a `advertising_projects.id`, `roles`, `accounts` y `creado_en`; conserva `imagen`, `fecha`, `id` y `admin_users` legados. No elimina datos/columnas. |
| 6 | Proyectos | CRUD diferenciado por visitante, cuenta sin rol y admin | UI `/admin` implementa listar, crear borrador, editar, cambiar estado y eliminar con confirmación; operaciones remotas sin verificar. |
| 7 | Archivos | Leer, subir, modificar y borrar sujeto a rol | Segunda migración añade relación 1:N y policies; UI `/admin` lista, sube, quita referencias y borra objetos solo para admin; operaciones remotas sin verificar. |
| 8–10 | Riesgo de borradores / RLS | Lectura por estado y escritura admin-only | Migración actual implementa lectura de `publicado` o administrador y escritura admin-only mediante `is_project_admin()`. Requiere confirmación en DB remota. |
| 11 | Integración GAM+ | `/admin`, Auth, proyectos y estado | Ruta `/admin` existente; la comprobación de admin en React es UX, la autorización efectiva debe seguir en RLS. |
| 12 | Casos de seguridad | Visitante, usuario sin rol, admin, borradores y archivos | Pendientes contra instancia remota; no afirmar como realizados. |
| 13–16 | Evidencia y conclusión | Build no prueba RLS; probar límite de cambio publicado→borrador | Build se ha ejecutado en etapa previa. Casos de rol y Storage sin verificar contra remoto. |
| 17 | Estado visual pendiente | No define CRUD adicional | Captura de la web/portafolio vacío; preservación del diseño público. |

## Diferencias y decisiones pendientes

1. La tabla actual `advertising_projects` contiene `imagen` y `fecha`; el ER propone archivos separados y `creado_en`. La migración aditiva mantiene `imagen`/`fecha`, incorpora `creado_en`, copia rutas y URLs firmadas de `project-private-images` a `project_files` (sin conservar tokens de URL), y deja URLs externas en `imagen`. No transfiere objetos ni hace público el bucket; se debe revisar el destino remoto antes de aplicar.
2. `admin_users` representa membership mediante UUID de Auth, pero no implementa literalmente Rol–Cuenta. La migración conserva esa tabla y asigna su membership actual al rol `administrador` en `accounts`; el permiso efectivo después de migrar consulta `accounts`/`roles`. Los usuarios existentes reciben rol de usuario, y las cuentas nuevas obtienen ese rol mediante trigger; la promoción admin solo se hace por operador.
3. El PDF no define longitudes, nulabilidad explícita de campos, reglas `ON DELETE`, tamaño/tipos MIME ni persistencia del formulario de asesoramiento. La solicitud posterior del usuario sí pidió guardar y proteger los mensajes; por eso se añadió una entidad separada, con límites de validación acotados para el formulario. No forma parte del ER/CRUD original.
4. El borrado figura condicionado a política administrativa. Se puede implementar como acción admin protegida en RLS, pero no se borrarán filas ni objetos existentes durante la configuración o pruebas.
5. `supabase/config.toml` existe, CLI local v2.122.0 está disponible vía `npx supabase`; telemetría se desactiva con `SUPABASE_TELEMETRY_DISABLED=1`. Al inicio no había ref en `supabase/.temp` y hacía falta login; después del login se identificó y enlazó el proyecto existente `gam`. No se creó un proyecto adicional.
6. Las variables de cliente existentes son `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (esta última también acepta una publishable key). Los valores reales no se leen ni muestran. No usar `service_role` o secret key en Vite.
7. Los ocho proyectos de muestra seguían definidos en el arreglo `projects` de `src/App.jsx`. La tabla remota se consultó antes de migrar y tenía 0 filas; la nueva migración incluye carga idempotente por título/categoría, y la consulta posterior confirmó las ocho muestras publicadas sin duplicados.

## Resultado de inspección remota y verificación (2026-11-16)

- Destino confirmado: organización y proyecto `gam`, ref `kydpuvoaqcyfabggzswb`, región `us-east-1`, estado `ACTIVE_HEALTHY`; coincide con el ref derivado localmente de `VITE_SUPABASE_URL`. Se enlazó este proyecto existente; no se creó otro.
- Antes de migrar: el esquema de `advertising_projects`, `admin_users`, sus restricciones, función `is_project_admin()`, grants, RLS y Storage policies coincidían con la migración inicial; bucket privado con JPEG/PNG/WebP y límite 10 MiB. Historial Supabase estaba ausente, por lo que se registró `20261109000000` como aplicado sin reejecutar esa migración.
- Antes de migrar había 0 proyectos, 0 objetos Storage y una fila válida en `admin_users`. El push dry-run listó solo `20261116000000_align_project_files_and_roles.sql`; se aplicó. Esa migración preservó la membership administrativa, creó `roles`, `accounts`, `project_files`, añadió `creado_en` y cargó las 8 muestras existentes de React como publicadas si no existían título/categoría iguales.
- Historial final: `20261109000000` y `20261116000000` aparecen aplicados. Estado final consultado: 8 proyectos publicados, 0 borradores, 0 archivos relacionados, 0 objetos Storage. El bucket sigue `public=false`; RLS habilitado en las cuatro tablas.
- Pruebas API con clave publishable anónima: la consulta equivalente al portafolio devuelve 8 filas publicadas y carga la relación vacía; fila de borrador y archivo metadata de borrador temporal devuelven 0; INSERT y UPDATE anónimos de proyecto reciben `42501`; upload de PNG válido recibe `403` por Storage RLS.
- Pruebas DB por rol/claims dentro de transacciones: claim de cuenta sin membership da `is_project_admin=false`, 0 borradores y 0 filas modificadas. Claim de la membership administrativa remota da `true`, 1 borrador visible y CRUD de proyecto y metadata `project_files` con una fila por operación. Las pruebas transaccionales hicieron `ROLLBACK`; registros temporales REST se limpiaron. Ningún proyecto/objeto preexistente se borró.
- Pendiente: recorrido visual `/admin` con inicio de sesión Auth real, CRUD desde los formularios y operación de Storage sobre un objeto privado real. No hay objetos en el bucket y no se dispuso de una sesión/password del usuario admin en el navegador; la simulación de claims comprueba policies de PostgreSQL, no el inicio de sesión UI ni el servicio de objetos.

## Verificación de interfaz y recursos (2026-11-16)

- Supabase CLI se consultó de nuevo en modo lectura: solo se identificó el proyecto existente `gam` (`kydpuvoaqcyfabggzswb`, enlazado y saludable) y los cuatro timestamps de migración local coinciden con el historial remoto. No se creó ni modificó otro proyecto durante esta revisión.
- La consulta pública volvió a devolver los ocho proyectos publicados. Se descargaron sus ocho URLs de imagen desde el entorno de verificación: las respuestas completas fueron HTTP 200, `Content-Type: image/jpeg`, y las respuestas parciales Range fueron HTTP 206. Las ocho descargas se abrieron visualmente; no hay URLs rotas en esta comprobación. Son recursos externos de Pinterest y el HTTP 200 no garantiza que el proveedor los mantenga disponibles ni que el navegador real/GAM+ los muestre en toda configuración.
- Revisión de las imágenes: los archivos cargan y son JPEG, aunque muestran campañas/marcas de terceros. Confirmar que cada pieza corresponde al contenido que GAM+ quiere publicar es una revisión editorial pendiente; no se reemplazó ninguna imagen.
- `/admin` ejecuta `signInWithPassword` de Supabase Auth y luego consulta `is_project_admin()`; la lista solo se solicita tras validar el rol. La ruta/UI no sustituye RLS, que se probó separadamente por API/SQL. No fue posible verificar la sesión real desde navegador en esta ejecución: no hay navegador automatizable instalado/disponible ni se usó una credencial Auth en CLI. Por la misma razón quedan pendientes los flujos end-to-end con cuenta admin y con cuenta Auth normal. No se expusieron secretos.
- La migración protege `roles` y `accounts` revocando privilegios directos a roles cliente; `is_project_admin()` solo consulta membresía y las cuentas nuevas reciben `usuario`. No hay formulario cliente para otorgarse privilegios. La membership `admin_users` preexistente se trasladó a `accounts` mediante la migración. Una promoción posterior debe hacerse por un operador autorizado de Supabase/DB, nunca desde la consola del navegador.
- Storage sigue privado (`public=false`). La prueba remota anterior probó que una carga anónima es rechazada (403), pero no hay objetos y por ello no se puede afirmar que se comprobó descarga como admin frente a visitante. Se preparó y abrió localmente un fixture sintético PNG válido de 128×128 en `/private/tmp/gam-storage-test.png`; el checklist detalla el flujo para subirlo a un proyecto temporal borrador, comprobar ambos accesos y limpiar solo el contenido temporal creado.
- `npm run build` volvió a finalizar correctamente. Permanece la advertencia de Vite por el bundle JS >500 kB.
- En la revisión previa el formulario solo validaba y mostraba un mensaje de prototipo; en esta etapa quedó conectado a la RPC privada y la API guardó un registro ficticio de prueba, después eliminado.
- Para hacer verificable Storage en una sesión real, el panel administrativo incorpora ahora el botón «Descargar» por archivo. Llama al SDK con la sesión Auth actual; la policy Storage sigue siendo la autoridad de acceso. Esta adición se limita a `/admin` y no cambia el diseño público. El flujo real aún necesita la ejecución manual descrita en el checklist.
- Las rutas/componentes públicos para servicios, proyectos, proceso, nosotros y contacto siguen definidos. Sin navegador no se declara completada una prueba interactiva de navegación ni de presentación responsive. El build valida compilación, no comportamiento visual.

## Corrección catálogo y persistencia de contacto (2026-11-16)

### Catálogo público y esquema confirmado

- Revisé en remoto `information_schema.columns`: `public.advertising_projects` tiene `id uuid`, `titulo text`, `descripcion text`, `categoria text`, `imagen text`, `fecha date`, `estado text`, `creado_en timestamptz`; la relación de archivos es `project_files(archivo_id, proyecto_id, clave_almacenamiento)`. Los nombres coinciden con `src/lib/projects.js` y el componente actual. No alteré esas tablas/columnas.
- `getPublishedProjects()` consulta directamente `.from('advertising_projects')`, selecciona esos datos y relación, aplica `.eq('estado','publicado')`, ordena por `creado_en`. La API pública devolvió 8 publicados en esta ejecución. Las policies remotas confirmadas por `pg_policies` permiten SELECT a `anon, authenticated` solo si publicado o `is_project_admin()`; INSERT/UPDATE/DELETE de proyecto son solo authenticated admin.
- El arreglo `projects` hardcodeado se eliminó de `src/App.jsx`. Con URL y clave pública, el catálogo usa solo la respuesta de Supabase; sin configuración, muestra error y no enseña contenido antiguo.
- El estado de publicar/despublicar actualizado en `/admin` se persiste por `updateProjectStatus`; una visita nueva a `/proyectos` monta el catálogo y consulta otra vez Supabase. Se verificó el endpoint y RLS, pero no se ejecutó una transición de estado desde la UI ni se observó el refresco en navegador.

### Tabla privada de mensajes

El formulario conservó campos/apariencia y valida `name`, `business`, `email`, `type`, `need` y `message`. Al enviar usa `public.submit_contact_message` con la clave anon/publishable (pública por diseño), sin pedir ni incluir `service_role`.

Se aplicaron las migraciones `20261116010000_add_private_contact_messages.sql` y `20261116011000_restrict_contact_rpc_execute.sql`. La tabla nueva `private.contact_messages` no estaba en la instancia; el esquema `private` se creó porque el API local solo expone `public` y `graphql_public`. Columnas:

| Columna | Tipo | Regla |
|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `name` | `text` | requerido, trim 1–120 |
| `business` | `text` | requerido, trim 1–160 |
| `email` | `text` | requerido, 3–254 y formato básico; se guarda en minúsculas |
| `business_type` | `text` | mapea al formulario `type`, requerido, trim 1–120 |
| `need` | `text` | uno de los 4 valores existentes del `<select>` |
| `message` | `text` | requerido, trim 1–5000 |
| `created_at` | `timestamptz` | `now()` |

`private.contact_messages` tiene RLS habilitado y policies de INSERT limitado a anon/authenticated y SELECT basado en `is_project_admin()` para authenticated. Además, a anon/authenticated se revocó todo acceso directo al esquema/tabla, así que el API no puede leer ni escribir la tabla por REST. Las únicas puertas soportadas son RPCs: `submit_contact_message` inserta campos explícitos y no devuelve ID/filas; `admin_list_contact_messages` requiere `is_project_admin()`, retorna datos al panel y se ejecuta solo por authenticated. La migración adicional retira ACL default de Supabase que dio a anon EXECUTE sobre la función administrativa; ACL efectivo consultado después: anon sí puede llamar envío, no inbox; authenticated puede invocar inbox, sujeto al check de admin.

### Pruebas remotas de esta etapa

- API anónima mediante SDK y clave pública local: 8 proyectos con estado `publicado`; llamada `submit_contact_message` con dato ficticio completó (`INSERT_OK`). Se usó un alias sintético y no se imprimió ninguna variable de entorno.
- La API rechazó por SQLSTATE `23514` un envío que usaba un valor `need` fuera de las opciones permitidas. No se insertó esa fila.
- Intento de leer `private.contact_messages` como anon fue denegado por PostgREST (`PGRST106`, esquema no expuesto); intento de `public.contact_messages` fue `PGRST205` (tabla no expuesta). ACL query confirmó `anon_schema_usage=false`, grants directos table SELECT/INSERT false, `anon_admin_list_rpc=false`, `anon_submit_rpc=true`, `auth_admin_list_rpc=true`, RLS `true`.
- Simulación SQL transaccional (no sesión UI): membership admin real produjo `is_admin=true`, inbox con 1 fila de prueba y update de proyecto con 1 fila; `ROLLBACK`. UUID no admin produjo `is_admin=false`, 0 borradores y 0 updates; RPC inbox devolvió SQLSTATE `42501 Administrator access required`.
- Otra prueba SQL con un proyecto sintético creó/leyó borrador como admin, actualizó a `publicado` y el rol anon leyó 1; admin volvió a `borrador` y anon obtuvo 0. Todo quedó en una transacción `ROLLBACK`, sin modificar los ocho proyectos actuales. HTTP anónimo posterior a la RPC de inbox fue rechazado `42501`.
- En la primera comprobación del ACL detecté que las ACL por defecto de Supabase conservaban `EXECUTE` para `anon` en la función de admin. La función ya rechazaba el rol incorrecto, pero endurecí explícitamente ACL con una segunda migración y volví a comprobar: `has_function_privilege(anon, admin_list_contact_messages, EXECUTE)=false`, mientras submit anon sigue true.
- La única fila sintética de API fue eliminada por su ID de prueba; verificación posterior: cero filas restantes. No se modificó contenido existente del proyecto.
- Las migraciones nuevas quedaron aplicadas en el proyecto GAM+ enlazado. La lectura de proyectos ya estaba aplicada; el bucket/Storage no fue modificado.
- Estado remoto final tras rollback/limpieza: 8 proyectos `publicado`, 0 mensajes sintéticos restantes, `contact_messages` con RLS activo y bucket Storage `public=false`. Dry-run final: remoto actualizado, sin migraciones pendientes.
- Pendiente: probar la interfaz del formulario, confirmación visual y aparición del mensaje en `/admin` con login Auth real, y probar directamente en navegador que una cuenta normal no ve la bandeja. Los tests de API/SQL no prueban el render ni la sesión Auth interactiva.
