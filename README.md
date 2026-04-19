# MCPRAT App - Backend API Documentation

**Versão:** 0.0.1-SNAPSHOT  
**Status:** Development  
**Data de Criação:** 2026-04-17

---

## 📋 Índice

1. [Visão Geral do Projeto](#visão-geral-do-projeto)
2. [Arquitetura Técnica](#arquitetura-técnica)
3. [Tecnologias e Dependências](#tecnologias-e-dependências)
4. [Estrutura do Projeto](#estrutura-do-projeto)
5. [Modelos de Dados (Domain Models)](#modelos-de-dados-domain-models)
6. [DTOs (Data Transfer Objects)](#dtos-data-transfer-objects)
7. [Endpoints da API](#endpoints-da-api)
8. [Configuração e Setup](#configuração-e-setup)
9. [Autenticação e Segurança](#autenticação-e-segurança)
10. [Fluxos de Negócio](#fluxos-de-negócio)
11. [Banco de Dados](#banco-de-dados)
12. [Enums e Tipos](#enums-e-tipos)

---

## 🎯 Visão Geral do Projeto

**MCPRAT App** é uma aplicação backend desenvolvida em **Kotlin** com **Spring Boot 4.0.5** que gerencia um sistema de **E-commerce com múltiplos vendedores**.

### Principais Funcionalidades:
- ✅ Autenticação e autorização com JWT
- ✅ Gerenciamento de usuários (ADMIN e VENDOR)
- ✅ Gerenciamento de clientes
- ✅ Catálogo de produtos com preços por vendedor
- ✅ Sistema de pedidos (Orders)
- ✅ Sistema de pagamentos com múltiplos métodos
- ✅ Controle de inventário com reserva de estoque

---

## 🏗️ Arquitetura Técnica

A aplicação segue a arquitetura em **camadas (Layered Architecture)**:

```
┌─────────────────────────────────────┐
│      Controller (REST Endpoints)    │
├─────────────────────────────────────┤
│      Service (Business Logic)       │
├─────────────────────────────────────┤
│      Repository (Data Access)       │
├─────────────────────────────────────┤
│      Database (PostgreSQL)          │
└─────────────────────────────────────┘
```

### Componentes Principais:

**Controllers:**
- `AuthController` - Autenticação (Login/Registro)
- `UserController` - Gerenciamento de usuários
- `OrderController` - Gerenciamento de pedidos
- `PaymentController` - Gerenciamento de pagamentos

**Services:**
- `UserService` - Lógica de usuários
- `OrderService` - Lógica de pedidos
- `PaymentService` - Lógica de pagamentos

**Security:**
- `JwtProvider` - Geração e validação de tokens JWT
- `JwtFilter` - Filtro de autenticação para requisições

---

## 🛠️ Tecnologias e Dependências

### Framework e Runtime
- **Java:** 21
- **Kotlin:** 2.2.21
- **Spring Boot:** 4.0.5
- **Spring Cloud:** 2025.1.1

### Principais Dependências

```xml
<!-- Web & REST -->
spring-boot-starter-webmvc

<!-- Data & Database -->
spring-boot-starter-data-jpa
postgresql (driver JDBC)
spring-boot-docker-compose

<!-- Security -->
spring-boot-starter-security
jjwt (JSON Web Token) - v0.12.5

<!-- Validation -->
spring-boot-starter-validation
jakarta.validation.constraints

<!-- Cloud -->
spring-cloud-starter-openfeign

<!-- JSON Processing -->
jackson-module-kotlin

<!-- Development -->
spring-boot-devtools (runtime)

<!-- Testing -->
spring-boot-starter-data-jpa-test
spring-boot-starter-security-test
spring-boot-starter-webmvc-test
kotlin-test-junit5
```

---

## 📁 Estrutura do Projeto

```
src/main/kotlin/com/mcpratapp/
├── McpratappApplication.kt
├── config/
│   └── SecurityConfig.kt           # Configuração de segurança Spring Security
├── controller/
│   ├── AuthController.kt           # Endpoints de autenticação
│   ├── UserController.kt           # Endpoints de usuários
│   ├── OrderController.kt          # Endpoints de pedidos
│   └── PaymentController.kt        # Endpoints de pagamentos
├── dto/
│   ├── request/                    # DTOs de entrada
│   │   ├── LoginRequest.kt
│   │   ├── RegisterRequest.kt
│   │   ├── UserRequest.kt
│   │   ├── OrderRequest.kt
│   │   ├── OrderItemRequest.kt
│   │   └── ConfirmOrderRequest.kt
│   └── response/                   # DTOs de saída
│       ├── AuthResponse.kt
│       ├── UserResponse.kt
│       ├── OrderResponse.kt
│       ├── OrderItemResponse.kt
│       └── PaymentResponse.kt
├── model/                          # Entities JPA (Domain Models)
│   ├── User.kt
│   ├── Client.kt
│   ├── Order.kt
│   ├── OrderItem.kt
│   ├── Product.kt
│   ├── ProductVendor.kt
│   └── Payment.kt
├── repository/                     # Spring Data JPA Repositories
│   ├── UserRepository.kt
│   ├── ClientRepository.kt
│   ├── OrderRepository.kt
│   ├── ProductRepository.kt
│   ├── ProductVendorRepository.kt
│   └── PaymentRepository.kt
├── security/                       # JWT & Autenticação
│   ├── JwtProvider.kt             # Gerador de JWT
│   └── JwtFilter.kt               # Filtro JWT
└── service/                        # Lógica de negócio
    ├── UserService.kt
    ├── OrderService.kt
    └── PaymentService.kt

src/main/resources/
└── application.properties          # Configuração da aplicação
```

---

## 📊 Modelos de Dados (Domain Models)

### 1. **User (Usuário/Vendedor)**

```kotlin
@Entity
@Table(name = "users")
class User(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,
    
    @Column(nullable = false, unique = true, length = 100)
    var username: String,
    
    @Column(nullable = false, unique = true, length = 150)
    var email: String,
    
    @Column(nullable = false)
    var password: String,
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var role: Role = Role.VENDOR,
    
    @CreationTimestamp
    val createdAt: LocalDateTime? = null,
    
    @UpdateTimestamp
    var updatedAt: LocalDateTime? = null
)

enum class Role {
    ADMIN,
    VENDOR
}
```

**Campos:**
- `id` - UUID único
- `username` - Nome de usuário único (máx 100 caracteres)
- `email` - Email único (máx 150 caracteres)
- `password` - Senha criptografada
- `role` - ADMIN ou VENDOR
- `createdAt` - Data de criação (automática)
- `updatedAt` - Data da última atualização (automática)

**Relacionamentos:**
- Pode ser vendedor de múltiplos `Product` via `ProductVendor`
- Pode ter múltiplos `Order` como criador
- Pode ter múltiplos `OrderItem`

---

### 2. **Client (Cliente)**

```kotlin
@Entity
@Table(name = "clients")
class Client(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),
    
    @Column(nullable = false, length = 150)
    val name: String,
    
    @Column(nullable = false, unique = true, length = 13)
    val whatsappNumber: String,
    
    @Column(nullable = true, unique = true, length = 150)
    val email: String? = null,
    
    @Column(nullable = false, length = 300)
    val address: String,
    
    @Column(nullable = true, length = 150)
    val companyName: String? = null,
    
    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),
    
    @Column(name = "updated_at")
    var updatedAt: LocalDateTime = LocalDateTime.now()
)
```

**Campos:**
- `id` - UUID único
- `name` - Nome do cliente (máx 150 caracteres)
- `whatsappNumber` - Número WhatsApp único (máx 13 caracteres)
- `email` - Email opcional e único
- `address` - Endereço (máx 300 caracteres)
- `companyName` - Nome da empresa (opcional)
- `createdAt` - Data de criação
- `updatedAt` - Data da última atualização

**Relacionamentos:**
- Pode ter múltiplos `Order`

---

### 3. **Product (Produto)**

```kotlin
@Entity
@Table(name = "products", indexes = [
    Index(name = "idx_sku", columnList = "sku", unique = true)
])
class Product(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),
    
    @Column(nullable = false, unique = true, length = 50)
    val sku: String,
    
    @Column(nullable = false, length = 200)
    val name: String,
    
    @Column(nullable = true, length = 500)
    val description: String? = null,
    
    @Column(nullable = false)
    var totalQuantity: Int,
    
    @Column(nullable = false)
    var reservedQuantity: Int,
    
    @Column(nullable = false)
    var isActive: Boolean = true,
    
    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),
    
    @Column(name = "updated_at")
    var updatedAt: LocalDateTime = LocalDateTime.now()
)
```

**Campos:**
- `id` - UUID único
- `sku` - SKU único do produto (máx 50 caracteres)
- `name` - Nome do produto (máx 200 caracteres)
- `description` - Descrição opcional (máx 500 caracteres)
- `totalQuantity` - Quantidade total em estoque
- `reservedQuantity` - Quantidade reservada em pedidos
- `isActive` - Indica se o produto está ativo
- `createdAt` - Data de criação
- `updatedAt` - Data da última atualização

**Relacionamentos:**
- Pode ter múltiplos `ProductVendor` (preços por vendedor)
- Pode estar em múltiplos `OrderItem`

---

### 4. **ProductVendor (Produto x Vendedor)**

```kotlin
@Entity
@Table(name = "product_vendors")
class ProductVendor(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    val product: Product,
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id", nullable = false)
    val vendor: User,
    
    @Column(nullable = false, precision = 10, scale = 2)
    val price: BigDecimal,
    
    @Column(nullable = false)
    var isActive: Boolean = true,
    
    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),
    
    @Column(name = "updated_at")
    var updatedAt: LocalDateTime = LocalDateTime.now()
)
```

**Campos:**
- `id` - UUID único
- `product` - Referência ao `Product`
- `vendor` - Referência ao `User` (vendedor)
- `price` - Preço do produto para este vendedor (precisão 10.2)
- `isActive` - Indica se a relação está ativa
- `createdAt` - Data de criação
- `updatedAt` - Data da última atualização

---

### 5. **Order (Pedido)**

```kotlin
@Entity
@Table(name = "orders")
class Order(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    val client: Client,
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id", nullable = false)
    val vendor: User,
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: OrderStatus = OrderStatus.PENDING,
    
    @Column(nullable = false, precision = 12, scale = 2)
    var totalAmount: BigDecimal = BigDecimal.ZERO,
    
    @OneToMany(mappedBy = "order", cascade = [CascadeType.ALL], orphanRemoval = true)
    val items: MutableList<OrderItem> = mutableListOf(),
    
    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),
    
    @Column(name = "confirmed_at")
    var confirmedAt: LocalDateTime? = null,
    
    @Column(name = "delivered_at")
    var deliveredAt: LocalDateTime? = null
)

enum class OrderStatus {
    PENDING,        // Pendente - editável
    CONFIRMED,      // Confirmado - aguardando pagamento
    SENT,          // Enviado - em trânsito
    DELIVERED,     // Entregue
    CANCELED,      // Cancelado
    COMPLETED      // Completado - com pagamento
}
```

**Campos:**
- `id` - UUID único
- `client` - Cliente que fez o pedido
- `vendor` - Vendedor do pedido
- `status` - Status do pedido (enum)
- `totalAmount` - Valor total (precisão 12.2)
- `items` - Lista de `OrderItem`
- `createdAt` - Data de criação
- `confirmedAt` - Data de confirmação
- `deliveredAt` - Data de entrega

---

### 6. **OrderItem (Item do Pedido)**

```kotlin
@Entity
@Table(name = "order_items")
class OrderItem(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    val order: Order,
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    val product: Product,
    
    @Column(nullable = false)
    val quantity: Int,
    
    @Column(nullable = false, precision = 10, scale = 2)
    val unitPrice: BigDecimal,
    
    @Column(nullable = false, precision = 12, scale = 2)
    val subtotal: BigDecimal,
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id", nullable = false)
    val vendor: User
)
```

**Campos:**
- `id` - UUID único
- `order` - Referência ao `Order`
- `product` - Produto no pedido
- `quantity` - Quantidade
- `unitPrice` - Preço unitário no momento da compra
- `subtotal` - Subtotal (quantidade x preço unitário)
- `vendor` - Vendedor do produto

---

### 7. **Payment (Pagamento)**

```kotlin
@Entity
@Table(name = "payments")
class Payment(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    val order: Order,
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val method: PaymentMethod,
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: PaymentStatus = PaymentStatus.PENDING,
    
    @Column(nullable = false, precision = 12, scale = 2)
    val amount: BigDecimal,
    
    @Column(name = "paid_at")
    var paidAt: LocalDateTime? = null,
    
    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: LocalDateTime = LocalDateTime.now()
)

enum class PaymentMethod {
    PIX,
    TICKET,
    CREDIT_CARD,
    MONEY
}

enum class PaymentStatus {
    PENDING,  // Aguardando pagamento
    FAILED,   // Falhou
    PAID      // Pago
}
```

**Campos:**
- `id` - UUID único
- `order` - Referência única ao `Order` (um pagamento por pedido)
- `method` - Método de pagamento (enum)
- `status` - Status do pagamento (enum)
- `amount` - Valor do pagamento
- `paidAt` - Data do pagamento
- `createdAt` - Data de criação do registro

---

## 📤 DTOs (Data Transfer Objects)

### Request DTOs (Entrada)

#### **LoginRequest**
```kotlin
data class LoginRequest(
    @Email
    val email: String,
    
    @NotBlank(message = "A senha não pode ser nula")
    val password: String
)
```

#### **RegisterRequest**
```kotlin
data class RegisterRequest(
    @Email
    val email: String,
    
    @NotBlank(message = "A senha não pode ser nula")
    val password: String,
    
    @NotBlank(message = "Nome não pode ser nulo")
    val name: String,
    
    @NotNull(message = "O cargo não pode ser nulo")
    val role: Role  // ADMIN ou VENDOR
)
```

#### **UserRequest**
```kotlin
data class UserRequest(
    @NotBlank(message = "O nome do usuário não pode ser nulo")
    val name: String,
    
    @NotBlank(message = "O email não pode ser nulo")
    val email: String,
    
    @NotBlank(message = "A senha não pode ser nula")
    val password: String,
    
    @NotNull(message = "A role do usuário não pode ser nula")
    val role: Role
)
```

#### **OrderRequest**
```kotlin
data class OrderRequest(
    @NotNull(message = "client_id não pode ser nulo")
    val clientId: UUID,
    
    @NotNull(message = "vendor_id não pode ser nulo")
    val vendorId: UUID
)
```

#### **OrderItemRequest**
```kotlin
data class OrderItemRequest(
    @NotNull(message = "productId não pode ser nulo")
    val productId: UUID,
    
    @Min(value = 1, message = "quantity deve ser maior que 0")
    val quantity: Int
)
```

#### **ConfirmOrderRequest**
```kotlin
data class ConfirmOrderRequest(
    val orderId: UUID,
    
    @NotNull(message = "O método de pagamento não pode ser nulo")
    val paymentMethod: PaymentMethod  // PIX, TICKET, CREDIT_CARD, MONEY
)
```

---

### Response DTOs (Saída)

#### **AuthResponse**
```kotlin
data class AuthResponse(
    val token: String,           // Token JWT
    val email: String,
    val userId: UUID,
    val expiresIn: Long          // Tempo de expiração em ms
)
```

#### **UserResponse**
```kotlin
data class UserResponse(
    val id: UUID,
    val name: String,
    val email: String,
    val role: Role,
    val createdAt: LocalDateTime
)
```

#### **OrderResponse**
```kotlin
data class OrderResponse(
    val id: UUID,
    val clientId: UUID,
    val vendorId: UUID,
    val status: OrderStatus,
    val totalAmount: BigDecimal,
    val items: List<OrderItemResponse>,
    val createdAt: LocalDateTime,
    val confirmedAt: LocalDateTime?
)
```

#### **OrderItemResponse**
```kotlin
data class OrderItemResponse(
    val id: UUID,
    val productId: UUID,
    val quantity: Int,
    val unitPrice: BigDecimal,
    val subtotal: BigDecimal
)
```

#### **PaymentResponse**
```kotlin
data class PaymentResponse(
    val id: UUID,
    val orderId: UUID,
    val method: PaymentMethod,
    val status: PaymentStatus,
    val amount: BigDecimal,
    val paidAt: LocalDateTime?,
    val createdAt: LocalDateTime
)
```

---

## 🔌 Endpoints da API

### **Base URL:** `http://localhost:8080/api/v1`

---

### **🔐 Authentication Endpoints** (`/auth`)

#### 1. **Login**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
    "email": "usuario@example.com",
    "password": "senha123"
}
```

**Response (200 OK):**
```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "email": "usuario@example.com",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "expiresIn": 86400000
}
```

**Errors:**
- `401 Unauthorized` - Credenciais inválidas
- `400 Bad Request` - Email ou senha em branco

---

#### 2. **Register**
```http
POST /api/v1/auth/register
Content-Type: application/json

{
    "name": "João Silva",
    "email": "joao@example.com",
    "password": "senha123",
    "role": "VENDOR"
}
```

**Response (201 Created):**
```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "email": "joao@example.com",
    "userId": "550e8400-e29b-41d4-a716-446655440001",
    "expiresIn": 86400000
}
```

**Errors:**
- `409 Conflict` - Email já cadastrado
- `400 Bad Request` - Dados inválidos

---

### **👥 User Endpoints** (`/users`)

#### 1. **Create User** (Público)
```http
POST /api/v1/users
Content-Type: application/json

{
    "name": "Maria Santos",
    "email": "maria@example.com",
    "password": "senha456",
    "role": "VENDOR"
}
```

**Response (200 OK):**
```json
{
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Maria Santos",
    "email": "maria@example.com",
    "role": "VENDOR",
    "createdAt": "2026-04-17T10:30:00"
}
```

---

#### 2. **Get All Users** (Requer Autenticação)
```http
GET /api/v1/users
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
[
    {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "João Silva",
        "email": "joao@example.com",
        "role": "VENDOR",
        "createdAt": "2026-04-17T09:00:00"
    },
    {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "Maria Santos",
        "email": "maria@example.com",
        "role": "VENDOR",
        "createdAt": "2026-04-17T10:30:00"
    }
]
```

---

#### 3. **Get User by ID** (Requer Autenticação)
```http
GET /api/v1/users/{userId}
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "João Silva",
    "email": "joao@example.com",
    "role": "VENDOR",
    "createdAt": "2026-04-17T09:00:00"
}
```

**Errors:**
- `404 Not Found` - Usuário não encontrado

---

#### 4. **Update User** (Requer Autenticação)
```http
PUT /api/v1/users/{userId}
Content-Type: application/json
Authorization: Bearer {token}

{
    "name": "João Silva Updated",
    "email": "joao.updated@example.com",
    "password": "novaSenha123",
    "role": "ADMIN"
}
```

**Response (200 OK):**
```json
{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "João Silva Updated",
    "email": "joao.updated@example.com",
    "role": "ADMIN",
    "createdAt": "2026-04-17T09:00:00"
}
```

---

#### 5. **Delete User** (Requer Autenticação)
```http
DELETE /api/v1/users/{userId}
Authorization: Bearer {token}
```

**Response (204 No Content)**

---

### **📦 Order Endpoints** (`/orders`)

#### 1. **Create Empty Order** (Requer Autenticação)
```http
POST /api/v1/orders
Content-Type: application/json
Authorization: Bearer {token}

{
    "clientId": "550e8400-e29b-41d4-a716-446655440100",
    "vendorId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (201 Created):**
```json
{
    "id": "550e8400-e29b-41d4-a716-446655440200",
    "clientId": "550e8400-e29b-41d4-a716-446655440100",
    "vendorId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "PENDING",
    "totalAmount": 0.00,
    "items": [],
    "createdAt": "2026-04-17T11:00:00",
    "confirmedAt": null
}
```

---

#### 2. **Add Item to Order** (Requer Autenticação)
```http
POST /api/v1/orders/{orderId}/items
Content-Type: application/json
Authorization: Bearer {token}

{
    "productId": "550e8400-e29b-41d4-a716-446655440300",
    "quantity": 5
}
```

**Response (200 OK):**
```json
{
    "id": "550e8400-e29b-41d4-a716-446655440200",
    "clientId": "550e8400-e29b-41d4-a716-446655440100",
    "vendorId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "PENDING",
    "totalAmount": 500.00,
    "items": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440400",
            "productId": "550e8400-e29b-41d4-a716-446655440300",
            "quantity": 5,
            "unitPrice": 100.00,
            "subtotal": 500.00
        }
    ],
    "createdAt": "2026-04-17T11:00:00",
    "confirmedAt": null
}
```

**Errors:**
- `404 Not Found` - Pedido ou produto não encontrado
- `400 Bad Request` - Sem estoque disponível

---

#### 3. **Confirm Order** (Requer Autenticação)
```http
POST /api/v1/orders/{orderId}/confirm
Content-Type: application/json
Authorization: Bearer {token}

{
    "orderId": "550e8400-e29b-41d4-a716-446655440200",
    "paymentMethod": "PIX"
}
```

**Response (200 OK):**
```json
{
    "id": "550e8400-e29b-41d4-a716-446655440200",
    "clientId": "550e8400-e29b-41d4-a716-446655440100",
    "vendorId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "CONFIRMED",
    "totalAmount": 500.00,
    "items": [...],
    "createdAt": "2026-04-17T11:00:00",
    "confirmedAt": "2026-04-17T11:05:00"
}
```

**O que acontece:**
1. Status muda para `CONFIRMED`
2. Payment é criado com status `PENDING`
3. `confirmedAt` é preenchido

---

#### 4. **Get All Orders** (Requer Autenticação)
```http
GET /api/v1/orders
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
[
    {
        "id": "550e8400-e29b-41d4-a716-446655440200",
        "clientId": "550e8400-e29b-41d4-a716-446655440100",
        "vendorId": "550e8400-e29b-41d4-a716-446655440000",
        "status": "CONFIRMED",
        "totalAmount": 500.00,
        "items": [...],
        "createdAt": "2026-04-17T11:00:00",
        "confirmedAt": "2026-04-17T11:05:00"
    }
]
```

---

#### 5. **Get Order by ID** (Requer Autenticação)
```http
GET /api/v1/orders/{orderId}
Authorization: Bearer {token}
```

**Response (200 OK):** Mesmo formato acima
**Errors:** `404 Not Found` - Pedido não encontrado

---

### **💳 Payment Endpoints** (`/payments` e `/orders/{orderId}/payments`)

#### 1. **Get Payment by ID** (Requer Autenticação)
```http
GET /api/v1/payments/{paymentId}
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
    "id": "550e8400-e29b-41d4-a716-446655440500",
    "orderId": "550e8400-e29b-41d4-a716-446655440200",
    "method": "PIX",
    "status": "PENDING",
    "amount": 500.00,
    "paidAt": null,
    "createdAt": "2026-04-17T11:05:00"
}
```

---

#### 2. **Get Payments by Order ID** (Requer Autenticação)
```http
GET /api/v1/orders/{orderId}/payments
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
[
    {
        "id": "550e8400-e29b-41d4-a716-446655440500",
        "orderId": "550e8400-e29b-41d4-a716-446655440200",
        "method": "PIX",
        "status": "PENDING",
        "amount": 500.00,
        "paidAt": null,
        "createdAt": "2026-04-17T11:05:00"
    }
]
```

---

#### 3. **Confirm Payment** (Requer Autenticação)
```http
POST /api/v1/orders/{orderId}/payments/{paymentId}/confirm
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
    "id": "550e8400-e29b-41d4-a716-446655440200",
    "clientId": "550e8400-e29b-41d4-a716-446655440100",
    "vendorId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "COMPLETED",
    "totalAmount": 500.00,
    "items": [...],
    "createdAt": "2026-04-17T11:00:00",
    "confirmedAt": "2026-04-17T11:05:00"
}
```

**O que acontece:**
1. Status da `Payment` muda para `PAID`
2. `paidAt` é preenchido com a data atual
3. Status do `Order` muda para `COMPLETED`
4. Estoque é reduzido (atualiza `Product.totalQuantity`)
5. Reserva é removida (atualiza `Product.reservedQuantity`)

**Errors:**
- `404 Not Found` - Pedido ou pagamento não encontrado
- `400 Bad Request` - Estados inválidos

---

## ⚙️ Configuração e Setup

### **Banco de Dados**

Configuração no `application.properties`:

```properties
# PostgreSQL Configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/mcprata_test
spring.datasource.username=zambrin
spring.datasource.password=zambrin
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA/Hibernate Configuration
spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.show-sql=true

# Application Name
spring.application.name=mcpratapp
```

### **Requisitos**
- PostgreSQL 12+
- Java 21
- Maven 3.8+

### **Instalação e Execução**

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/mcpratapp.git
cd mcpratapp

# 2. Crie o banco de dados PostgreSQL
createdb mcprata_test

# 3. Instale as dependências e compile
mvn clean install

# 4. Execute a aplicação
mvn spring-boot:run
```

---

## 🔐 Autenticação e Segurança

### **JWT (JSON Web Token)**

A aplicação usa **JWT** para autenticação stateless.

#### **JwtProvider** - Geração e Validação

```kotlin
@Component
class JwtProvider(
    @Value("\${app.jwt.secret:...}")
    private val secret: String,
    
    @Value("\${app.jwt.expiration:86400000}")  // 24 horas em ms
    private val expiration: Long
)
```

**Métodos:**
- `generateToken(email: String, userId: String): String` - Gera novo token
- `getEmailFromToken(token: String): String?` - Extrai email do token
- `getUserIdFromToken(token: String): String?` - Extrai userId do token
- `isTokenValid(token: String): Boolean` - Valida o token

#### **JwtFilter** - Interceptor de Requisições

Estende `OncePerRequestFilter` e intercepta todas as requisições HTTP.

**Lógica:**
1. Extrai o token do header `Authorization: Bearer {token}`
2. Valida o token
3. Se válido, configura a autenticação no `SecurityContextHolder`
4. Continua o fluxo da requisição

### **Endpoints Públicos** (sem autenticação)

- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/register` - Registro
- `POST /api/v1/users` - Criar usuário

### **Endpoints Protegidos** (requer JWT)

Todos os outros endpoints requerem:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Configuração de Segurança** (SecurityConfig.kt)

```kotlin
@Configuration
@EnableWebSecurity
class SecurityConfig(private val jwtFilter: JwtFilter) {
    
    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() }  // CSRF desabilitado (stateless)
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { authorize ->
                authorize
                    .requestMatchers("/api/v1/auth/**").permitAll()
                    .requestMatchers("/api/v1/users").permitAll()
                    .anyRequest().authenticated()
            }
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter::class.java)
            .httpBasic { it.disable() }
        
        return http.build()
    }
    
    @Bean
    fun passwordEncoder(): PasswordEncoder {
        return BCryptPasswordEncoder()  // Criptografia de senhas
    }
}
```

---

## 🔄 Fluxos de Negócio

### **Fluxo 1: Criar um Pedido (Order)**

```
1. POST /api/v1/orders
   ├── Validar Vendor (User)
   ├── Validar Client
   └── Criar Order com status PENDING
   
2. POST /api/v1/orders/{orderId}/items (múltiplas vezes)
   ├── Validar Product existe
   ├── Validar ProductVendor (vendor vende este produto)
   ├── Validar disponibilidade em estoque
   ├── Criar OrderItem
   ├── Reservar quantidade: Product.reservedQuantity += quantidade
   └── Atualizar totalAmount do Order
   
3. POST /api/v1/orders/{orderId}/confirm
   ├── Mudar status para CONFIRMED
   ├── Criar Payment com status PENDING
   └── Preencher confirmedAt
```

### **Fluxo 2: Confirmar Pagamento**

```
1. POST /api/v1/orders/{orderId}/payments/{paymentId}/confirm
   ├── Validar Order está CONFIRMED
   ├── Validar Payment está PENDING
   ├── Para cada OrderItem no Order:
   │   ├── Reduzir Product.totalQuantity
   │   └── Reduzir Product.reservedQuantity
   ├── Mudar Payment.status para PAID
   ├── Preencher Payment.paidAt
   ├── Mudar Order.status para COMPLETED
   └── Salvar alterações
```

### **Fluxo 3: Autenticação**

```
1. POST /api/v1/auth/register ou /api/v1/auth/login
   ├── Validar credenciais
   ├── Gerar JWT Token
   └── Retornar token com userId e expiração
   
2. Requisições subsequentes
   ├── Header: Authorization: Bearer {token}
   ├── JwtFilter valida o token
   ├── Extrai email e userId
   ├── Configura autenticação no Spring Security
   └── Continua processamento
```

---

## 🗄️ Banco de Dados

### **Tabelas e Relacionamentos**

```sql
-- Users (USERS)
id (UUID) PK
username (VARCHAR 100) UNIQUE NOT NULL
email (VARCHAR 150) UNIQUE NOT NULL
password (VARCHAR) NOT NULL
role (ENUM: ADMIN, VENDOR) NOT NULL
created_at (TIMESTAMP) NOT NULL
updated_at (TIMESTAMP)

-- Clients (CLIENTS)
id (UUID) PK
name (VARCHAR 150) NOT NULL
whatsapp_number (VARCHAR 13) UNIQUE NOT NULL
email (VARCHAR 150) UNIQUE
address (VARCHAR 300) NOT NULL
company_name (VARCHAR 150)
created_at (TIMESTAMP) NOT NULL
updated_at (TIMESTAMP)

-- Products (PRODUCTS)
id (UUID) PK
sku (VARCHAR 50) UNIQUE NOT NULL (INDEX)
name (VARCHAR 200) NOT NULL
description (VARCHAR 500)
total_quantity (INT) NOT NULL
reserved_quantity (INT) NOT NULL
is_active (BOOLEAN) NOT NULL
created_at (TIMESTAMP) NOT NULL
updated_at (TIMESTAMP)

-- ProductVendors (PRODUCT_VENDORS)
id (UUID) PK
product_id (UUID) FK -> PRODUCTS
vendor_id (UUID) FK -> USERS
price (DECIMAL 10,2) NOT NULL
is_active (BOOLEAN) NOT NULL
created_at (TIMESTAMP) NOT NULL
updated_at (TIMESTAMP)

-- Orders (ORDERS)
id (UUID) PK
client_id (UUID) FK -> CLIENTS NOT NULL
vendor_id (UUID) FK -> USERS NOT NULL
status (ENUM: PENDING, CONFIRMED, SENT, DELIVERED, CANCELED, COMPLETED) NOT NULL
total_amount (DECIMAL 12,2) NOT NULL
created_at (TIMESTAMP) NOT NULL
confirmed_at (TIMESTAMP)
delivered_at (TIMESTAMP)

-- OrderItems (ORDER_ITEMS)
id (UUID) PK
order_id (UUID) FK -> ORDERS NOT NULL
product_id (UUID) FK -> PRODUCTS NOT NULL
quantity (INT) NOT NULL
unit_price (DECIMAL 10,2) NOT NULL
subtotal (DECIMAL 12,2) NOT NULL
vendor_id (UUID) FK -> USERS NOT NULL

-- Payments (PAYMENTS)
id (UUID) PK
order_id (UUID) FK -> ORDERS NOT NULL UNIQUE
method (ENUM: PIX, TICKET, CREDIT_CARD, MONEY) NOT NULL
status (ENUM: PENDING, FAILED, PAID) NOT NULL
amount (DECIMAL 12,2) NOT NULL
paid_at (TIMESTAMP)
created_at (TIMESTAMP) NOT NULL
```

---

## 📋 Enums e Tipos

### **Role**
```kotlin
enum class Role {
    ADMIN,   // Administrador da plataforma
    VENDOR   // Vendedor
}
```

### **OrderStatus**
```kotlin
enum class OrderStatus {
    PENDING,    // Recém criado, aceitando itens
    CONFIRMED,  // Confirmado, aguardando pagamento
    SENT,       // Enviado ao cliente
    DELIVERED,  // Entregue ao cliente
    CANCELED,   // Cancelado
    COMPLETED   // Finalizado com pagamento efetuado
}
```

### **PaymentMethod**
```kotlin
enum class PaymentMethod {
    PIX,          // Transferência PIX
    TICKET,       // Boleto bancário
    CREDIT_CARD,  // Cartão de crédito
    MONEY         // Dinheiro (em espécie)
}
```

### **PaymentStatus**
```kotlin
enum class PaymentStatus {
    PENDING,  // Aguardando pagamento
    FAILED,   // Pagamento falhou
    PAID      // Pagamento realizado
}
```

---

## 📚 Resumo das Tecnologias

| Tecnologia | Versão | Função |
|-----------|--------|--------|
| **Spring Boot** | 4.0.5 | Framework web |
| **Spring Security** | Latest | Segurança e autenticação |
| **Spring Data JPA** | Latest | Acesso a dados |
| **JWT (JJWT)** | 0.12.5 | Tokens de autenticação |
| **PostgreSQL** | Latest | Banco de dados |
| **Kotlin** | 2.2.21 | Linguagem de programação |
| **Java** | 21 | Runtime |
| **Maven** | 3.8+ | Gerenciador de dependências |

---

## 📞 Contato e Suporte

Para dúvidas ou problemas, consulte a documentação acima ou verifique os logs da aplicação em `app.log`.

---

**Última atualização:** 2026-04-17


