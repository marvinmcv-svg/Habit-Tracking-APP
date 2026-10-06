import type { HabitDraft } from './store';

/** Starter habits for onboarding and the editor's quick-start row. Names are i18n keys. */
export interface HabitTemplate {
  key: string;
  draft: Omit<HabitDraft, 'name'>;
}

export const TEMPLATES: HabitTemplate[] = [
  {
    key: 'water',
    draft: {
      emoji: '💧',
      color: 'teal',
      type: 'count',
      target: 8,
      unit: 'glasses',
      schedule: { kind: 'daily' },
      timeOfDay: 'anytime',
      reminderTime: null,
    },
  },
  {
    key: 'read',
    draft: {
      emoji: '📚',
      color: 'indigo',
      type: 'duration',
      target: 20,
      schedule: { kind: 'daily' },
      timeOfDay: 'evening',
      reminderTime: '21:00',
    },
  },
  {
    key: 'meditate',
    draft: {
      emoji: '🧘',
      color: 'purple',
      type: 'duration',
      target: 10,
      schedule: { kind: 'daily' },
      timeOfDay: 'morning',
      reminderTime: '07:30',
    },
  },
  {
    key: 'exercise',
    draft: {
      emoji: '🏃',
      color: 'orange',
      type: 'boolean',
      target: 1,
      schedule: { kind: 'x_per_week', times: 3 },
      timeOfDay: 'morning',
      reminderTime: null,
    },
  },
  {
    key: 'eatWell',
    draft: {
      emoji: '🥗',
      color: 'green',
      type: 'boolean',
      target: 1,
      schedule: { kind: 'daily' },
      timeOfDay: 'afternoon',
      reminderTime: null,
    },
  },
  {
    key: 'journal',
    draft: {
      emoji: '✍️',
      color: 'yellow',
      type: 'boolean',
      target: 1,
      schedule: { kind: 'daily' },
      timeOfDay: 'evening',
      reminderTime: null,
    },
  },
  {
    key: 'walk',
    draft: {
      emoji: '🚶',
      color: 'mint',
      type: 'count',
      target: 8000,
      unit: 'steps',
      schedule: { kind: 'daily' },
      timeOfDay: 'anytime',
      reminderTime: null,
    },
  },
  {
    key: 'sleep',
    draft: {
      emoji: '😴',
      color: 'blue',
      type: 'boolean',
      target: 1,
      schedule: { kind: 'daily' },
      timeOfDay: 'evening',
      reminderTime: '22:30',
    },
  },
  {
    key: 'noSugar',
    draft: { emoji: '🍭', color: 'pink', type: 'quit', target: 1, schedule: { kind: 'daily' }, timeOfDay: 'anytime', reminderTime: null },
  },
  {
    key: 'stretch',
    draft: {
      emoji: '🤸',
      color: 'red',
      type: 'boolean',
      target: 1,
      schedule: { kind: 'weekdays', days: [1, 2, 3, 4, 5] },
      timeOfDay: 'morning',
      reminderTime: null,
    },
  },
];

export const EMOJIS = [
  '💧',
  '📚',
  '🧘',
  '🏃',
  '🥗',
  '✍️',
  '🚶',
  '😴',
  '🍭',
  '🤸',
  '💪',
  '🚴',
  '🏊',
  '🎸',
  '🎨',
  '🧠',
  '💊',
  '🦷',
  '🌱',
  '☀️',
  '🌙',
  '🍎',
  '☕',
  '🚭',
  '📵',
  '💰',
  '🧹',
  '🙏',
  '❤️',
  '🐶',
  '📝',
  '🎯',
];
