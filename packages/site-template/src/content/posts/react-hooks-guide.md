---
title: 'React Hooks 完全指南：从零掌握现代 React 开发'
description: '深入解析 React Hooks 原理与实战，包含 useState、useEffect、useContext 等核心 Hooks 的详细用法和最佳实践'
keywords:
  - react hooks
  - react教程
  - useState
  - useEffect
  - react开发
date: 2025-01-18
author: 'AI Author'
tags:
  - React
  - JavaScript
  - Frontend
seoScore: 95
featured: true
---

# React Hooks 完全指南

React Hooks 是 React 16.8 引入的革命性特性，它让你在不编写 class 的情况下使用 state 以及其他的 React 特性。

## 为什么需要 Hooks？

在 Hooks 出现之前，组件间的逻辑复用非常困难。HOC 和 render props 模式虽然能解决问题，但会导致组件层级嵌套过深，形成"wrapper hell"。

```jsx
// 旧方式：组件层级嵌套
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <MyComponent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

## useState：状态管理的基础

`useState` 是最基础的 Hook，用于在函数组件中添加状态。

```jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>当前计数: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        增加
      </button>
    </div>
  );
}
```

### 函数式更新

当新状态依赖于旧状态时，使用函数式更新：

```jsx
const [count, setCount] = useState(0);

// 推荐：函数式更新
setCount(prev => prev + 1);

// 避免：直接计算（可能存在闭包陷阱）
setCount(count + 1);
```

## useEffect：处理副作用

`useEffect` 用于处理副作用操作，如数据获取、订阅、手动修改 DOM 等。

```jsx
import { useState, useEffect } from 'react';

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId)
      .then(data => {
        setUser(data);
        setLoading(false);
      });
  }, [userId]); // 依赖数组

  if (loading) return <div>加载中...</div>;
  return <div>{user.name}</div>;
}
```

### 清理副作用

某些副作用需要清理，如订阅或定时器：

```jsx
useEffect(() => {
  const subscription = props.source.subscribe();
  return () => {
    // 清理函数
    subscription.unsubscribe();
  };
}, [props.source]);
```

## useContext：跨组件共享状态

`useContext` 让你读取 context 的值，而无需使用 Consumer 组件。

```jsx
const ThemeContext = React.createContext('light');

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Toolbar />
    </ThemeContext.Provider>
  );
}

function Toolbar() {
  const theme = useContext(ThemeContext);
  return <div className={theme}>工具栏</div>;
}
```

## 自定义 Hooks

自定义 Hooks 是逻辑复用的强大方式：

```jsx
function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

// 使用
function MyComponent() {
  const { width, height } = useWindowSize();
  return <div>窗口: {width} x {height}</div>;
}
```

## Hooks 使用规则

1. **只在最顶层使用 Hooks**：不要在循环、条件或嵌套函数中调用
2. **只在 React 函数中调用 Hooks**：
   - React 函数组件
   - 自定义 Hooks

```jsx
// ❌ 错误示例
function BadComponent() {
  if (condition) {
    const [state, setState] = useState(); // 违反规则！
  }
}

// ✅ 正确示例
function GoodComponent() {
  const [state, setState] = useState();
  if (condition) {
    // 使用 state
  }
}
```

## 最佳实践

### 1. 合理组织多个 Hooks

```jsx
function ProductList() {
  // 状态管理
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState('');

  // 数据获取
  useEffect(() => {
    fetchProducts(filter).then(setProducts);
  }, [filter]);

  // 事件处理
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  return <JSX />;
}
```

### 2. 使用 useMemo 和 useCallback 优化性能

```jsx
import { useMemo, useCallback } from 'react';

function ExpensiveComponent({ items, onSelect }) {
  // 缓存计算结果
  const sortedItems = useMemo(() => {
    return items.sort((a, b) => a.id - b.id);
  }, [items]);

  // 缓存函数引用
  const handleClick = useCallback((id) => {
    onSelect(id);
  }, [onSelect]);

  return <div>{/* JSX */}</div>;
}
```

## 总结

React Hooks 彻底改变了我们编写 React 组件的方式：

- **更简洁的代码**：无需 class，逻辑更清晰
- **更好的逻辑复用**：通过自定义 Hooks
- **更小的打包体积**：无需使用 class 语法

掌握 Hooks 是现代 React 开发的必备技能。
