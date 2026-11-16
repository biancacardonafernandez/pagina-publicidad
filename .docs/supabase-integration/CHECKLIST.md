# Integración Supabase GAM+

## Progreso general

- [x] Revisar el proyecto y validar el PDF. Evidencia: `.docs/ER-CRUD/ER-CRUD.pdf`, 17 páginas; texto extraído con PDFKit y páginas 4–7, 9, 12, 16 y 17 inspeccionadas visualmente.
- [x] Documentar el modelo y su correspondencia con la aplicación. Evidencia: [ANALISIS.md](ANALISIS.md).
- [x] Crear o identificar el proyecto remoto y enlazarlo mediante CLI. Evidencia: organización `gam`, proyecto `gam`, ref `kydpuvoaqcyfabggzswb`, estado `ACTIVE_HEALTHY`, región `us-east-1`; `projects list` confirma `linked: true`. Coincide con `.env.local`.
- [x] Crear, aplicar y verificar migraciones y permisos. Evidencia: el esquema remoto coincidía con la migración inicial; se registró su timestamp como aplicado sin reejecutarla. `db push --dry-run --linked` mostró solo `20261116000000_align_project_files_and_roles.sql`; se aplicó y `migration list --linked` muestra ambos timestamps.
- [x] Configurar el SDK y las variables de entorno. Evidencia: el cliente usa `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`; ambas están configuradas, la key es publishable y el ref coincide con el proyecto enlazado. No se imprimieron sus valores.
- [x] Comparar el contenido estático de ocho proyectos con la tabla remota y preservar/importar únicamente los registros faltantes, sin duplicados. Evidencia: antes de migrar, `advertising_projects` tenía 0 filas; la migración insertó las 8 muestras existentes como publicadas. Reconsulta posterior: 8 proyectos, 0 borradores.
- [ ] Integrar y comprobar cada operación CRUD requerida. El panel está implementado y la base confirmó CRUD de proyectos/metadata de archivos bajo roles SQL. Pendiente: recorrido end-to-end en `/admin` con sesión Auth real y CRUD de objetos Storage.
- [ ] Verificar persistencia, permisos y funcionamiento del proyecto. Se verificó catálogo anónimo, RLS por rol, políticas, migraciones y bucket. Pendiente: iniciar sesión desde el frontend como admin, probar CRUD desde la UI y descargar un objeto privado real asociado a borrador/publicado.
- [x] Documentar la ejecución y los pendientes. Evidencia: este checklist, [ANALISIS.md](ANALISIS.md), guía `SUPABASE_SETUP.md`, migraciones aplicadas e informes de pruebas anotados abajo.

## CRUD por entidad según el PDF

| Entidad | Operación | Visitante | Usuario autenticado sin rol | Administrador | Código actual / estado |
|---|---|---|---|---|---|
| Proyecto publicitario | Crear | No | No | Sí | RLS: admin creó un registro temporal (`1` fila) en transacción revertida; UI no probada con Auth real. |
| Proyecto publicitario | Leer publicados | Sí | Sí | Sí | API pública con SDK: 8 filas, todas publicadas; relación `project_files` cargó sin error. |
| Proyecto publicitario | Leer borradores | No | No | Sí | API anónima: borrador temporal devolvió 0 filas; rol authenticated sin membership: 0; claim de admin existente: 1. |
| Proyecto publicitario | Actualizar datos | No | No | Sí | RLS: admin temporal actualizó título/estado y leyó el resultado; sin membership, update produjo 0 filas. |
| Proyecto publicitario | Cambiar estado | No | No | Sí | API anónima: intento sobre proyecto publicado rechazado `42501`; RLS admin actualizó temporalmente el estado. |
| Proyecto publicitario | Eliminar | No | No | Según política administrativa | RLS admin eliminó su fila temporal (`1`); transacción revertida. No se eliminó contenido real. |
| Archivo de proyecto | Consultar archivos publicados | Sí | Sí | Sí | No hay objetos/registros de archivo reales; la relación API devuelve arreglo vacío. Prueba con objeto real pendiente. |
| Archivo de proyecto | Consultar archivos de borrador | No | No | Sí | API anónima devolvió 0 filas para metadata de archivo temporal de borrador; objeto físico no creado. |
| Archivo de proyecto | Subir | No | No | Sí | Upload anónimo de PNG válido rechazado `403` por RLS. Upload admin real pendiente. |
| Archivo de proyecto | Modificar | No | No | Sí | RLS admin hizo insert/update/delete de metadata temporal (1 fila por operación) en transacción revertida; Storage object pendiente. |
| Archivo de proyecto | Eliminar | No | No | Según autorización administrativa | RLS metadata admin eliminó fila temporal; ningún objeto existente fue eliminado. Storage API admin pendiente. |
| Rol / Cuenta | Asignar rol | No | No | Operador autorizado | Migración aplicada; se verifican roles `usuario`/`administrador` y una cuenta admin heredada. RPC/función devuelve true con su claim; sin membership devuelve false. |

## Resultados y alcance de pruebas remotas (2026-11-16)

- RLS habilitado en `advertising_projects`, `project_files`, `accounts` y `roles`; políticas efectivas revisadas en `pg_policies`.
- Bucket `project-private-images`: `public=false`, límite 10 MiB, MIME JPEG/PNG/WebP; 0 objetos antes y después de pruebas.
- SDK con clave publishable: lectura REST devuelve 8 publicados; consulta por ID de borrador temporal devuelve 0; insert anónimo falla con `42501`; update anónimo falla con `42501` y 0 filas.
- La API anónima no puede leer `roles` ni `accounts` (`42501`); el RPC `is_project_admin()` responde `false` para visitante sin error.
- Subida anónima de PNG válido falla con HTTP `403`, `new row violates row-level security policy`.
- Con `SET LOCAL ROLE authenticated` y claims de prueba dentro de transacciones: usuario sin membership no es admin, no lee borrador y su update devuelve 0 filas; membership admin existente se reconoce y CRUD de proyecto/metadata `project_files` da 1 fila por paso. Las transacciones de CRUD concluyeron con `ROLLBACK`.
- Las filas REST/SQL temporales creadas para comprobar borradores/archivos se borraron; consulta final: 8 proyectos, 0 borradores, 0 `project_files`, 0 objetos Storage y 0 filas temporales.
- Verificación final: `supabase db push --dry-run --linked` reporta `Remote database is up to date`; `npm run build` exitoso y `git diff --check` limpio.
- Estas pruebas verifican policies y datos vía API/SQL, pero no sustituyen iniciar sesión en la UI ni descargar un objeto privado real. No había objetos en el bucket ni se usó una sesión Auth del administrador en el navegador.

## Siguiente acción para retomar

Pendiente: recorrido end-to-end de `/admin` con Auth real y objeto privado físico; pruebas de campos inválidos; capturas de evidencia. Un intento final de probar restricciones inválidas no llegó a ejecutar SQL porque la CLI devolvió `Invalid access token`; no produjo cambios remotos. Si se retoma esa prueba, autenticar de nuevo la CLI y repetirla dentro de transacción. No se necesita crear otro proyecto Supabase.

## Verificaciones adicionales (2026-11-16)

- [x] Volver a consultar Supabase CLI en modo lectura: `projects list` identifica `gam` (`kydpuvoaqcyfabggzswb`, `ACTIVE_HEALTHY`, `linked: true`) y `migration list --linked` muestra `20261109000000` y `20261116000000` tanto local como remoto. No se creó ni modificó otro proyecto en esta revisión.
- [x] Consultar desde la API pública el catálogo y comprobar los recursos de imagen enlazados: 8 proyectos `publicado`; las ocho URLs externas devolvieron HTTP 200 en descarga completa (HTTP 206 para solicitudes Range), `image/jpeg` y firma JPEG. Se abrieron visualmente las ocho imágenes descargadas; todas son archivos válidos. Esto confirma que los URLs responden hoy desde este entorno, no una prueba de renderizado en navegador de todos los breakpoints.
- [x] Revisar estáticamente rutas y componentes públicos. `/servicios`, `/proyectos`, `/proceso`, `/nosotros`, `/contacto` y la portada continúan definidos en `App.jsx`; el portafolio obtiene proyectos publicados y resuelve URL externa o descarga Storage. No se modificó el diseño.
- [x] Confirmar con el código de migración que `roles`/`accounts` no conceden permisos de escritura a `anon` ni `authenticated`; las escrituras están revocadas y el registro de admins existente se preservó al migrar. El trigger de altas asigna `usuario`; promover a administrador requiere operación autorizada de base de datos. No hay un flujo público de autoasignación.
- [x] Ejecutar `npm run build`: terminó correctamente (Vite 8.3.1, 146 módulos). Vite reportó advertencia informativa de bundle JS minificado >500 kB. `git diff --check` terminó sin errores.
- [ ] Login real en `/admin` con Auth; no se ejecutó porque este entorno no tiene navegador disponible ni una sesión/credencial del administrador. No se solicitó contraseña ni token.
- [ ] Denegación de borradores y cambio de estado desde una sesión Auth real sin rol admin; las pruebas remotas anteriores fueron simulación de rol/claims en PostgreSQL, no sesión real del cliente.
- [ ] Consulta y cambio de estado con sesión Auth real de administrador desde la UI; CRUD con claim admin fue probado en transacción con rollback, no por el navegador.
- [ ] Descargar objeto privado real como admin y verificar denegación de visitante. El bucket `project-private-images` sigue privado y la consulta remota anterior encontró 0 objetos. Sí se comprobó previamente que upload anónimo recibe HTTP 403, pero eso no equivale a probar la lectura de un objeto.
- [ ] Recorrer visualmente las secciones públicas en navegador. Las rutas/componentes y el build se revisaron, pero no hubo prueba visual interactiva en esta ejecución.
- [ ] Probar envío del formulario desde el navegador y ver el mensaje en el inbox `/admin`. La inserción por RPC se probó con API anónima y dato ficticio, pero falta recorrido visual del formulario.

### Pasos locales pendientes para las pruebas end-to-end

1. En el repositorio, ejecutar `npm run dev` y abrir la URL local que indique Vite, añadiendo `/admin` (normalmente `http://localhost:5173/admin`). Iniciar sesión con la cuenta administradora ya registrada en Supabase Auth. No compartir la contraseña con nadie. Confirmar que aparece la lista de proyectos.
2. Para el control negativo, cerrar sesión y usar una cuenta Auth separada cuyo rol sea `usuario`. `/admin` debe indicar acceso denegado; confirmar también que no aparecen proyectos y que la actualización no puede ejecutarse. No promover esta cuenta para realizar la prueba.
3. Como admin, usar «Nuevo proyecto» con nombre identificable de prueba (se crea como borrador), y «Archivo privado opcional»; seleccionar `/private/tmp/gam-storage-test.png` (fixture sintético PNG 128×128, validado localmente; selector de macOS: `Cmd+Shift+G`, pegar ruta). Guardar. En el proyecto recién creado, pulsar «Descargar»: la descarga debe funcionar con la sesión admin. Cambiar el estado del proyecto de prueba a publicado y de nuevo a borrador; así se verifica la transición y al final se conserva oculto. Copiar la ruta listada y ejecutar el siguiente comando desde la raíz, sustituyendo `RUTA_DEL_OBJETO` por la ruta del objeto (no pegar claves en el chat):

   ```sh
   node --env-file=.env.local --input-type=module -e 'import { createClient } from "@supabase/supabase-js"; const c=createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY); const {data,error}=await c.storage.from("project-private-images").download("RUTA_DEL_OBJETO"); console.log(error ? `DENEGADO (${error.statusCode || error.name})` : data ? "ACCESIBLE: revisar policy" : "SIN RESPUESTA");'
   ```

   Para un borrador, el resultado anónimo esperado es `DENEGADO`. Si resulta accesible, detener la prueba y revisar las policies; no cambiar el bucket a público. Luego, con el admin, usar «Quitar» para borrar el objeto temporal y eliminar únicamente el proyecto temporal creado para la prueba.
4. Probar `/admin` con una cuenta Auth no admin separada; si no existe, crear una cuenta de prueba Auth usando los mecanismos administrativos de Supabase (el trigger asigna rol `usuario`). Debe mostrar acceso denegado y no listar proyectos. No promover esa cuenta.
5. Abrir `/proyectos`, revisar las ocho imágenes cargadas y recorrer servicios, proceso, nosotros y contacto; el envío persistido del formulario se completa según las instrucciones de la sección siguiente.

## Persistencia segura del formulario de contacto (2026-11-16)

- [x] Confirmar el origen del catálogo: `getPublishedProjects()` consulta directamente `public.advertising_projects`, filtra `.eq('estado', 'publicado')` y ordena por `creado_en`. Retiré de `App.jsx` los ocho ejemplos hardcodeados que servían de fallback; si falta la configuración, se muestra un error y no contenido estático que oculte los cambios del backend.
- [x] Volver a comprobar con API publishable/anónima: 8 filas publicadas; mismo nombre de tabla y columnas contrastados con `information_schema` remoto. No se cambió el esquema de proyectos.
- [x] Revisar el formulario actual: `name`, `business`, `email`, `type`, `need`, `message`; los cinco primeros campos obligatorios salvo que `need` trae opción por defecto. Se conserva su apariencia y validación, y ahora se envía por `public.submit_contact_message`.
- [x] Aplicar `20261116010000_add_private_contact_messages.sql` y `20261116011000_restrict_contact_rpc_execute.sql` a `gam`. El esquema privado nuevo no existía; `private.contact_messages` queda fuera de `api.schemas` (`public`, `graphql_public`), con RLS activo y sin grants directos de lectura/escritura a `anon` ni `authenticated`.
- [x] Prueba HTTP anónima con clave pública local: catálogo = 8; `submit_contact_message` aceptó un mensaje ficticio (`INSERT_OK`); lectura directa `private.contact_messages` fue rechazada (`PGRST106`), y `public.contact_messages` no está expuesta (`PGRST205`). La fila ficticia se leyó mediante el RPC administrativo en transacción y luego se eliminó por su identificador de prueba. Conteo final: 0 mensajes de prueba restantes.
- [x] Prueba por rol/claims en transacciones: administrador existente (`is_project_admin=true`) leyó 1 mensaje de prueba vía `admin_list_contact_messages()` y una operación update permitió 1 fila; transacción con `ROLLBACK`. Identidad no admin tuvo `is_project_admin=false`, 0 borradores y 0 filas actualizadas; llamada a RPC inbox rechazó SQLSTATE `42501` (“Administrator access required”). Estas son pruebas de policies/RPC en DB, no sesiones reales de Auth en UI.
- [x] Prueba transaccional del flujo de proyecto: admin creó un borrador ficticio y lo vio, lo publicó y anon lo vio; admin lo devolvió a borrador y anon obtuvo 0 filas. Proyecto y resultados se revirtieron con `ROLLBACK`; los ocho registros existentes no cambiaron.
- [x] ACL remoto comprobado tras corrección: anon tiene EXECUTE en la RPC de envío, no tiene EXECUTE en `admin_list_contact_messages`; authenticated puede invocarla pero la función comprueba `is_project_admin()`. Ambos roles cliente carecen de USAGE sobre esquema y SELECT/INSERT directo a la tabla; RLS permanece activo.
- [x] HTTP anónimo directo a `admin_list_contact_messages` devolvió `42501`; no entregó filas.
- [x] RPC pública rechazó un valor de `need` no permitido con `23514`; la consulta final confirma cero mensajes de prueba restantes.
- [x] Historial remoto/local tiene las cuatro migraciones, `db push --dry-run --linked` confirma que está actualizado; estado final DB = 8 proyectos publicados, 0 mensajes de prueba, RLS de mensajes activo y bucket `public=false`.
- [x] Añadir inbox de mensajes visible solo si el panel verifica cuenta admin. La tabla no es consultable por REST directo; el panel usa RPC con check del rol.
- [ ] Probar el envío y la confirmación visual en `/contacto`, y que el mensaje aparece en `/admin` con una sesión Auth admin real. No se contó con navegador/sesión en esta ejecución.
- [ ] Verificar manualmente que una sesión Auth no-admin recibe denegación en `/admin` y no ve inbox; la denegación SQL/RPC ya se probó con claims simulados.
- [x] No se conectó ninguna clave privada, `service_role` ni secret key al frontend. El cliente mantiene `VITE_SUPABASE_URL` y clave anon/publishable.

### Pasos manuales para cerrar las pruebas de interfaz

1. Ejecuta `npm run dev`, abre `/contacto`, llena los seis campos con datos de prueba tuyos/no sensibles y envía. Debe aparecer “Tu mensaje se registró correctamente”. Si falla, el formulario debe mostrar su mensaje genérico de error y conservar los campos.
2. En otra pestaña inicia sesión en `/admin` con una cuenta ya autorizada. En “Mensajes de contacto” actualiza la lista y comprueba el registro de prueba. No compartas credenciales ni envíes datos personales reales durante la prueba.
3. Con una sesión Auth no admin prueba `/admin`: debe indicar acceso denegado. Las pruebas SQL confirmaron que no puede leer borradores, cambiar proyectos ni ejecutar la lectura del inbox. El acceso anónimo a la tabla está bloqueado por esquema/privilegios y la RPC administrativa no tiene EXECUTE para `anon`.
4. Para comprobar el refresco público: en `/admin`, cambia un proyecto de prueba entre `publicado` y `borrador`; visita `/proyectos` o recarga. Como el componente vuelve a consultar Supabase al montarse, solo debe aparecer cuando el estado sea `publicado`. No cambies proyectos reales durante esta prueba si no quieres alterar el portafolio.

## Verificación final local/remota (2026-11-16)

- [x] `npm run build`: éxito, Vite transformó 147 módulos. Queda advertencia del bundle JS minificado de 505,68 kB (>500 kB).
- [x] `git diff --check`: sin errores.
- [x] Estado remoto tras pruebas: 8 publicados, 0 borradores temporales, 0 mensajes de prueba, RLS de `private.contact_messages` habilitado, `project-private-images public=false`.
- [x] Historial local/remoto coincide; dry-run final sin migraciones pendientes.
