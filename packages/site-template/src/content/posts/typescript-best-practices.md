---
title: 'TypeScript 最佳实践：提升代码质量的 15 个技巧'
description: '掌握 TypeScript 高级用法和最佳实践，包括类型守卫、泛型、工具类型等，让你的代码更健壮、更易维护'
keywords:
  - typescript
  - typescript教程
  - 类型安全
  - 前端开发
  - typescript技巧
date: 2025-01-18
author: 'AI Author'
tags:
  - TypeScript
  - JavaScript
  - Best Practices
seoScore: 92
featured: true
---

# TypeScript 最佳实践：提升代码质量的 15 个技巧

TypeScript 为 JavaScript 带来了静态类型检查，但仅仅使用基础类型是不够的。本文将分享 15 个实用的 TypeScript 技巧。

## 1. 使用字面量类型提高精确度

```typescript
// ❌ 太宽泛
function setAlignment(align: string) {
  // ...
}

// ✅ 精确的选项
function setAlignment(align: 'left' | 'right' | 'center') {
  // ...
}

setAlignment('left');  // OK
setAlignment('top');   // TypeScript 报错
```

## 2. 类型守卫缩小类型范围

```typescript
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function processValue(value: unknown) {
  if (isString(value)) {
    // TypeScript 知道这里 value 是 string
    console.log(value.toUpperCase());
  }
}
```

## 3. 使用泛型提高代码复用性

```typescript
function identity<T>(arg: T): T {
  return arg;
}

// 显式指定类型
const num = identity<number>(42);

// 类型推断
const str = identity('hello');
```

### 泛型约束

```typescript
interface Lengthwise {
  length: number;
}

function logLength<T extends Lengthwise>(arg: T): void {
  console.log(arg.length);
}

logLength('hello');    // OK
logLength([1, 2, 3]);  // OK
logLength(42);         // Error
```

## 4. 使用 Utility Types

### Partial - 可选属性

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

function updateUser(id: number, fields: Partial<User>) {
  // fields 中的所有属性都是可选的
  // ...
}

updateUser(1, { name: 'New Name' });  // OK
```

### Required - 必需属性

```typescript
type RequiredUser = Required<User>;
// 所有属性变成必需的
```

### Pick - 选择属性

```typescript
type UserPreview = Pick<User, 'id' | 'name'>;
// { id: number; name: string; }
```

### Omit - 排除属性

```typescript
type CreateUserInput = Omit<User, 'id'>;
// { name: string; email: string; }
```

## 5. 使用 infer 推断类型

```typescript
type UnboxArray<T> = T extends (infer U)[] ? U : T;

type Numbers = UnboxArray<number[]>;  // number
type Strings = UnboxArray<string[]>;  // string
```

## 6. 条件类型

```typescript
type NonNullable<T> = T extends null | undefined ? never : T;

type Result = NonNullable<string | null>;  // string
```

## 7. 使用 as const 断言

```typescript
const config = {
  mode: 'production',
  debug: false
} as const;

// 类型为：
// {
//   readonly mode: "production";
//   readonly debug: false;
// }
```

## 8. 模板字面量类型

```typescript
type EventName<T extends string> = `on${Capitalize<T>}`;

type ClickEvent = EventName<'click'>;  // "onClick"
type HoverEvent = EventName<'hover'>;  // "onHover"
```

## 9. 使用 keyof 操作符

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: 'Alice', age: 30 };

const name = getProperty(user, 'name');  // string
const age = getProperty(user, 'age');    // number
// const invalid = getProperty(user, 'email');  // Error
```

## 10. 使用 ReturnType 获取函数返回类型

```typescript
function createUser() {
  return {
    id: 1,
    name: 'John'
  };
}

type User = ReturnType<typeof createUser>;
// { id: number; name: string; }
```

## 11. 使用 readonly 保护不可变数据

```typescript
interface ReadonlyConfig {
  readonly apiUrl: string;
  readonly maxRetries: number;
}

const config: ReadonlyConfig = {
  apiUrl: 'https://api.example.com',
  maxRetries: 3
};

// config.apiUrl = 'new-url';  // Error
```

## 12. 使用 enum 或 const enum

```typescript
enum Direction {
  Up = 'UP',
  Down = 'DOWN',
  Left = 'LEFT',
  Right = 'RIGHT'
}

function move(direction: Direction) {
  // ...
}

move(Direction.Up);  // OK
```

## 13. 使用 unknown 而不是 any

```typescript
// ❌ 失去类型安全
function parseJSON(json: any) {
  return JSON.parse(json);
}

// ✅ 保持类型安全
function parseJSON(json: string): unknown {
  return JSON.parse(json);
}

// 使用时需要类型检查
const data = parseJSON('{"name":"John"}');
if (typeof data === 'object' && data !== null && 'name' in data) {
  console.log((data as { name: string }).name);
}
```

## 14. 使用 satisfies 运算符

```typescript
type Colors = 'red' | 'green' | 'blue';

const theme = {
  primary: 'red',
  secondary: 'green'
} satisfies Record<string, Colors>;

// theme.primary 的类型是 'red'，而不是 Colors
// 但仍然会检查值是否有效
```

## 15. 使用 Exclude 和 Extract

```typescript
type T1 = Exclude<string | number, string>;  // number
type T2 = Extract<string | number, string>;  // string

type EventTypes = 'click' | 'hover' | 'focus';
type MouseEvents = Extract<EventTypes, 'click' | 'hover'>;
// 'click' | 'hover'
```

## 总结

掌握这些 TypeScript 技巧将帮助你：

- **提高类型安全**：减少运行时错误
- **改善开发体验**：更好的 IDE 提示
- **增强代码可维护性**：自文档化的类型定义

TypeScript 的类型系统非常强大，合理使用这些特性可以让你的代码更加健壮。
