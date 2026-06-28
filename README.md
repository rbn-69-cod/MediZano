<p align="center">
  <h1 align="center">Botica POS Peru</h1>
  <p align="center">
    Sistema de punto de venta para boticas y farmacias de mediana capacidad.
  </p>
</p>

<p align="center">
  <img alt="Java" src="https://img.shields.io/badge/Java-17-1f6feb?style=for-the-badge">
  <img alt="Spring Boot" src="https://img.shields.io/badge/Spring%20Boot-3.2.0-198754?style=for-the-badge">
  <img alt="Angular" src="https://img.shields.io/badge/Angular-17-c3002f?style=for-the-badge">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Database-336791?style=for-the-badge">
  <img alt="Moneda" src="https://img.shields.io/badge/Moneda-Soles%20S%2F.-f59f00?style=for-the-badge">
</p>

---

## Presentacion del proyecto

**Botica POS MediZano** es una aplicacion web para gestionar ventas, medicamentos, inventario, reportes y usuarios en una botica o farmacia. El sistema esta orientado: moneda en el calculo de **IGV** y flujos de venta pensados para atencion rapida en mostrador.

El proyecto integra un backend robusto con **Spring Boot** y una interfaz moderna con **Angular**, permitiendo registrar ventas, buscar medicamentos en tiempo real, controlar stock, generar comprobantes PDF y consultar reportes operativos.

---

## Caracteristicas principales

| Area | Funcionalidad |
| --- | --- |
| Ventas | Registro de ventas, seleccion de productos, calculo de totales y monto a pagar en tiempo real. |
| Busqueda | Busqueda de medicamentos en tiempo real desde el modulo de ventas. |
| Moneda | Visualizacion de importes en soles  `S/.`. |
| Impuestos | Manejo de IGV como impuesto unico Sunat. |
| Comprobantes | Generacion de comprobante PDF con datos de venta, productos, cantidades e importes. |
| Inventario | Control de stock, lotes, vencimientos y alertas de productos bajos. |
| Medicamentos | Registro, actualizacion y consulta de productos farmaceuticos. |
| historial | Gestion de  productos vendidos y soporte al cliente. |
| Reportes | Indicadores de ventas, compras, actividad y rendimiento. |
| Seguridad | Autenticacion JWT, roles de usuario y proteccion de rutas. |
| Administracion | Gestion de usuarios, historial de inicio de sesion y auditoria de actividad. |

---

## Modulos del sistema

### Ventas

Modulo orientado al cajero. Permite buscar medicamentos, agregarlos al comprobante, ajustar cantidades y visualizar el monto final antes de registrar la venta.

Funciones destacadas:

- Busqueda de medicamentos en tiempo real.
- Calculo automatico de subtotal, IGV y total.
- Visualizacion de `Monto a pagar`, `Pagado` y `Vuelto`.
- Soporte para pagos en efectivo, tarjeta(en proceso), Yape y Plin(verificacion manual).
- Generacion de comprobante PDF.

### Inventario

Modulo para revisar el estado del almacen y detectar productos que requieren atencion.

Funciones destacadas:

- Consulta de existencias.
- Alertas de stock bajo.
- Seguimiento de lotes.
- Control de vencimientos.

### Medicamentos

Modulo para registrar y mantener la informacion de productos farmaceuticos.

Funciones destacadas:

- Alta y edicion de medicamentos.
- Registro de precios, stock y datos de producto.
- Control de productos activos.
- Asociacion con lotes disponibles.
- Agregar nuevo lote de productos 


### Reportes

Modulo para revisar informacion operativa y apoyar la toma de decisiones.

Funciones destacadas:

- Reporte de ventas.
- Resumen de ingresos.
- Analisis de impuestos.
- Consulta de historial de compras.
- Actividad de usuarios.

### Usuarios y seguridad

Modulo administrativo para controlar accesos al sistema.

Funciones destacadas:

- Inicio de sesion con JWT.
- Roles diferenciados.
- Rutas protegidas.
- Historial de actividad.
- Gestion de usuarios activos.

---

## Tecnologias utilizadas

### Backend

| Tecnologia | Uso |
| --- | --- |
| Java 17 | Lenguaje principal del backend. |
| Spring Boot 3.2.0 | Framework principal de la API REST. |
| Spring Web | Exposicion de controladores REST. |
| Spring Data JPA | Persistencia y acceso a datos. |
| Spring Security | Autenticacion y autorizacion. |
| JWT / JJWT | Generacion y validacion de tokens. |
| PostgreSQL | Base de datos relacional. |
| Bean Validation | Validacion de datos de entrada. |
| MapStruct | Mapeo entre entidades y DTOs. |
| Lombok | Reduccion de codigo repetitivo. |
| Springdoc OpenAPI | Documentacion interactiva de la API. |
| iText PDF | Generacion de comprobantes PDF. |

### Frontend

| Tecnologia | Uso |
| --- | --- |
| Angular 17 | Framework principal de la interfaz. |
| TypeScript | Lenguaje del frontend. |
| Bootstrap 5 | Base visual y componentes responsivos. |
| SCSS | Estilos personalizados. |
| RxJS | Flujos reactivos y busqueda en tiempo real. |
| Angular Forms | Formularios de login, ventas y mantenimiento. |
| ZXing | Soporte para lectura de codigos. |

---

## Arquitectura general

```text
MedicPOS
|-- src/main/java/com/medicalstore/pos
|   |-- config          # Configuracion general, seguridad y datos iniciales
|   |-- controller      # Endpoints REST
|   |-- dto             # Objetos de transferencia de datos
|   |-- entity          # Entidades JPA
|   |-- exception       # Manejo centralizado de errores
|   |-- repository      # Repositorios Spring Data JPA
|   |-- security        # JWT, filtros y autenticacion
|   `-- service         # Logica de negocio
|
|-- src/main/resources
|   `-- application.yml # Configuracion del backend
|
`-- frontend
    `-- src/app
        |-- auth        # Login y autenticacion
        |-- core        # Layout, servicios base y componentes comunes
        |-- modules     # Pantallas principales del sistema
        `-- shared      # Elementos compartidos
```

---

## Endpoints principales

| Controlador | Responsabilidad |
| --- | --- |
| `AuthController` | Inicio de sesion y autenticacion. |
| `MedicineController` | Gestion de medicamentos. |
| `BatchController` | Gestion de lotes y stock. |
| `BillingController` | Ventas, comprobantes y facturacion. |
| `ReportController` | Reportes e indicadores. |
| `UserController` | Gestion de usuarios. |
| `AuditLogController` | Actividad y auditoria. |

Documentacion de API disponible en:

```text
http://localhost:8080/swagger-ui.html
```

---

## Requisitos previos

Antes de ejecutar el proyecto se necesita:

| Herramienta | Version recomendada |
| --- | --- |
| Java JDK | 17 |
| Maven | 3.9 o superior |
| Node.js | 20 o superior |
| npm | 10 o superior |
| PostgreSQL | 14 o superior |

---

## Configuracion de base de datos

Crear una base de datos PostgreSQL:

```sql
CREATE DATABASE medical_store_pos;
```

La configuracion principal esta en:

```text
src/main/resources/application.yml
```

Configuracion por defecto:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/medical_store_pos
    username: postgres
    password: postgres

server:
  port: 8080
```

> Para produccion se recomienda cambiar usuario, contrasena, secreto JWT y politicas de logs.

---

## Ejecucion del backend

Desde la raiz del proyecto:

```bash
mvn spring-boot:run
```

El backend quedara disponible en:

```text
http://localhost:8080
```

Swagger / OpenAPI:

```text
http://localhost:8080/swagger-ui.html
```

---

## Ejecucion del frontend

Ingresar a la carpeta del frontend:

```bash
cd frontend
npm install
npm start
```

La interfaz quedara disponible normalmente en:

```text
http://localhost:4200
```

Si el puerto `4200` esta ocupado:

```bash
npm start -- --port 4201
```

---

## Compilacion del proyecto

Backend:

```bash
mvn clean package
```

Frontend:

```bash
cd frontend
npm run build
```

---

## Usuarios de prueba

Al iniciar el backend, el sistema crea o actualiza usuarios base para probar los roles principales.

| Usuario | Contrasena | Rol | Acceso principal |
| --- | --- | --- | --- |
| `admin` | `password123` | Administrador | Todo el sistema. |
| `cajero` | `password123` | Cajero | Ventas. |
| `inventario` | `password123` | Monitor de stock | Inventario. |
| `almacen` | `password123` | Encargado de almacen | Medicamentos y stock. |
| `soporte` | `password123` | Atencion al cliente | Devoluciones. |
| `analista` | `password123` | Analista | Reportes. |
| `gerente` | `password123` | Gerente | Reportes e historial de compras. |

> Estas credenciales son solo para desarrollo o demostracion. En un entorno real deben cambiarse antes de publicar el sistema.

---

## Flujo recomendado para una demostracion

1. Iniciar sesion con el usuario `admin` o `cajero`.
2. Ir al modulo **Ventas**.
3. Buscar un medicamento en el campo de busqueda.
4. Seleccionar el producto desde los resultados en tiempo real.
5. Ajustar cantidad y revisar el total.
6. Confirmar el **Monto a pagar** en soles `S/.`.
7. Registrar el pago con efectivo, Yape o Plin.
8. Generar el comprobante PDF.
9. Revisar el impacto en inventario y reportes.

---

## Enfoque

El sistema fue preparado para funcionar con los criterios :

- Moneda: soles  `S/.`.
- Impuesto: IGV como impuesto unico.
- Textos: interfaz en espanol.
- Pagos: opciones comunes como efectivo, tarjeta(en proceso), Yape y Plin(validacion manual).
- Comprobantes: importes y totales listos para presentacion local.
- Ventas: monto a pagar visible y actualizado en tiempo real.

---

## Seguridad

El proyecto utiliza autenticacion basada en JWT.

Componentes principales:

| Archivo / componente | Funcion |
| --- | --- |
| `JwtTokenProvider` | Genera, valida y extrae informacion del token JWT. |
| `JwtAuthenticationFilter` | Intercepta solicitudes y valida credenciales. |
| `SecurityConfig` | Define reglas de seguridad y acceso a rutas. |
| `CustomUserDetailsService` | Carga usuarios para autenticacion. |

Buenas practicas recomendadas:

- Cambiar el secreto JWT en produccion.
- Usar contrasenas seguras.
- Activar HTTPS.
- Restringir Swagger en produccion.
- Configurar perfiles separados para desarrollo y produccion.

---

## Puntos fuertes para presentar

- Interfaz clara y orientada al flujo real de una botica.
- Busqueda de productos en tiempo real para acelerar la atencion.
- Calculo automatico de totales en soles.
- Backend con arquitectura por capas.
- Seguridad con tokens JWT y roles.
- Base de datos relacional con PostgreSQL.
- Reportes para seguimiento administrativo.
- Comprobantes PDF generados desde el sistema.
- Escalable para nuevas funciones como compras, proveedores o facturacion electronica.

---

## Posibles mejoras futuras

| Mejora | Beneficio |
| --- | --- |
| Facturacion electronica | Integracion con SUNAT. |
| Gestion de proveedores | Control completo de compras. |
| Kardex valorizado | Seguimiento detallado de entradas y salidas. |
| Alertas por vencimiento | Prevencion de perdida de medicamentos. |
| Dashboard gerencial | Vista ejecutiva para toma de decisiones. |
| Backup automatico | Mayor seguridad de informacion. |
| Modo multi-sucursal | Expansion para cadenas de boticas. |

---

## Estado del proyecto

El sistema cuenta con una base funcional para uso academico, demostracion y mejora continua. Incluye frontend, backend, base de datos, autenticacion, modulos operativos y configuracion principal para el entorno peruano.

---

## Autores

Desarrollado por:

- Aldo
- Kenyi
- Igarlos
- Juan Diego

```text
Botica POS Peru
Sistema de ventas, inventario y gestion farmaceutica
```
