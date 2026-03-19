# UI Component Library

Библиотека переиспользуемых UI компонентов для Fatiha.ru.

## Установка

```tsx
import { Button, Card, Modal, Badge, Input, Tabs, Accordion, Tooltip } from "@/components/ui";
```

## Компоненты

### Button

Кнопка с множеством вариантов оформления и состояний.

**Варианты:** `primary`, `secondary`, `ghost`, `danger`, `success`
**Размеры:** `sm`, `md`, `lg`

```tsx
<Button variant="primary" size="md" onClick={handleClick}>
  Сохранить
</Button>

<Button variant="danger" loading={isLoading} icon={<Trash />}>
  Удалить
</Button>
```

### Card

Контейнер с опциональными header и footer секциями.

```tsx
<Card
  header={<h3>Заголовок</h3>}
  footer={<Button>Действие</Button>}
  hoverable
>
  Содержимое карточки
</Card>
```

### Badge

Индикатор статуса с цветовыми вариантами.

**Варианты:** `success`, `warning`, `error`, `info`, `neutral`
**Размеры:** `sm`, `md`, `lg`

```tsx
<Badge variant="success">Активен</Badge>
<Badge variant="error" icon={<AlertCircle />}>Ошибка</Badge>
```

### Modal

Модальное окно с backdrop, анимациями и управлением фокусом.

```tsx
<Modal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Подтверждение"
  subtitle="Дополнительная информация"
  footer={<Button onClick={handleConfirm}>Подтвердить</Button>}
  maxWidth="max-w-2xl"
>
  Содержимое модального окна
</Modal>
```

**Особенности:**
- Закрытие по ESC
- Закрытие по клику на backdrop (опционально)
- Блокировка прокрутки body
- Адаптивный дизайн (полный экран на мобильных)

### Input

Поле ввода с label, ошибками и иконками.

```tsx
<Input
  label="Email"
  type="email"
  placeholder="example@fatiha.ru"
  error={errors.email}
  helperText="Введите ваш email"
  icon={<Mail />}
  fullWidth
/>
```

### Tabs

Вкладки для организации контента.

**Ориентация:** `horizontal`, `vertical`

```tsx
<Tabs
  items={[
    {
      id: "tab1",
      label: "Вкладка 1",
      content: <div>Содержимое 1</div>,
      icon: <Home />
    },
    { id: "tab2", label: "Вкладка 2", content: <div>Содержимое 2</div> }
  ]}
  defaultTab="tab1"
  orientation="horizontal"
  onChange={(tabId) => console.log(tabId)}
/>
```

### Accordion

Раскрывающиеся секции контента.

```tsx
<Accordion
  items={[
    {
      id: "1",
      title: "Раздел 1",
      content: "Содержимое 1",
      icon: <Info />
    },
    { id: "2", title: "Раздел 2", content: "Содержимое 2" }
  ]}
  allowMultiple={false}
  defaultOpen={["1"]}
/>
```

### Tooltip

Всплывающая подсказка при наведении.

**Позиции:** `top`, `bottom`, `left`, `right`

```tsx
<Tooltip content="Это подсказка" position="top">
  <button>Наведите курсор</button>
</Tooltip>
```

## Доступность

Все компоненты включают:
- ARIA атрибуты для скринридеров
- Навигацию с клавиатуры
- Focus management
- Семантическую HTML разметку

## Стилизация

Компоненты используют Tailwind CSS 4 и следуют дизайн-системе проекта:
- Основной цвет: emerald (зеленый)
- Нейтральный: slate (серый)
- Скругления: rounded-xl (12px)
- Тени: shadow-sm, shadow-md, shadow-2xl
